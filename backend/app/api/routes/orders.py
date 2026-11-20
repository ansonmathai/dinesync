from datetime import datetime
import secrets
from typing import List, Optional
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session, joinedload
from app.schemas.inventory import MenuItemResponse

from app.core.cache import (
    get_cache,
    invalidate_menu_cache,
    invalidate_order_cache,
    set_cache,
)
from app.core.config import settings
from app.core.db import get_db
from app.core.websocket import manager
from app.models.inventory import MenuItem, Order, OrderItem, OrderReview
from app.schemas.inventory import (
    OrderCreate,
    OrderResponse,
    OrderReviewCreate,
    OrderReviewResponse,
    OrderStatusUpdate,
    ReviewFeedItemResponse,
)

router = APIRouter(prefix="/orders", tags=["Orders & Checkout"])

IST = ZoneInfo("Asia/Kolkata")
ACTIVE_ORDERS_KEY = "orders:active"


def _cache_order_variants(order_obj: Order) -> dict:
    payload = jsonable_encoder(OrderResponse.model_validate(order_obj))
    ttl = settings.ORDER_LOOKUP_CACHE_TTL
    if order_obj.id is not None:
        set_cache(f"order:id:{order_obj.id}", payload, ttl_seconds=ttl)
    if order_obj.tracking_slug:
        set_cache(f"order:slug:{order_obj.tracking_slug}", payload, ttl_seconds=ttl)
    if order_obj.token_number:
        set_cache(f"order:token:{order_obj.token_number}", payload, ttl_seconds=ttl)
    return payload


def generate_token_and_slug(db: Session) -> tuple[str, str, datetime]:
    now_ist = datetime.now(IST)
    date_prefix = now_ist.strftime("AM%d%m")  # e.g., AM1911 for Nov 19

    latest_token = (
        db.query(Order.token_number)
        .filter(Order.token_number.like(f"{date_prefix}%"))
        .order_by(Order.id.desc())
        .with_for_update()
        .first()
    )

    if latest_token and len(latest_token[0]) >= len(date_prefix) + 3:
        last_seq = int(latest_token[0][-3:])
        next_seq = last_seq + 1
    else:
        next_seq = 1

    if next_seq > 999:
        raise HTTPException(status_code=429, detail="Daily token limit (999) reached")

    token_number = f"{date_prefix}{next_seq:03d}"
    tracking_slug = secrets.token_urlsafe(12)
    return token_number, tracking_slug, now_ist


@router.get("/reviews", response_model=List[ReviewFeedItemResponse])
def list_reviews(
    scope: str = Query("today", pattern="^(today|all)$"),
    menu_item_id: Optional[int] = None,
    is_veg: Optional[bool] = None,
    category: Optional[str] = None,
    min_rating: Optional[int] = Query(None, ge=1, le=10),
    has_photo: bool = False,
    sort_by: str = Query("newest", pattern="^(newest|rating_desc|rating_asc|price_asc|price_desc)$"),
    db: Session = Depends(get_db),
):
    """Explore verified dish reviews across Today's Batch or All/Past orders"""
    query = (
        db.query(OrderReview, Order, MenuItem)
        .join(Order, OrderReview.order_id == Order.id)
        .join(MenuItem, OrderReview.menu_item_id == MenuItem.id)
    )

    if scope == "today":
        query = query.filter(
            MenuItem.is_available_today.is_(True),
            OrderReview.batch_snapped_at.isnot(None),
            OrderReview.batch_snapped_at == MenuItem.last_snapped_at,
        )

    if menu_item_id is not None:
        query = query.filter(OrderReview.menu_item_id == menu_item_id)
    if is_veg is not None:
        query = query.filter(MenuItem.is_veg.is_(is_veg))
    if category:
        query = query.filter(MenuItem.category == category)
    if min_rating is not None:
        query = query.filter(OrderReview.rating >= min_rating)
    if has_photo:
        query = query.filter(OrderReview.photo_url.isnot(None), OrderReview.photo_url != "")

    sort_map = {
        "newest": OrderReview.created_at.desc(),
        "rating_desc": OrderReview.rating.desc(),
        "rating_asc": OrderReview.rating.asc(),
        "price_asc": MenuItem.price.asc(),
        "price_desc": MenuItem.price.desc(),
    }
    query = query.order_by(sort_map[sort_by], OrderReview.created_at.desc())

    results: List[ReviewFeedItemResponse] = []
    for rev, order, item in query.limit(100).all():
        is_current = (
            item.is_available_today
            and rev.batch_snapped_at is not None
            and rev.batch_snapped_at == item.last_snapped_at
        )
        results.append(
            ReviewFeedItemResponse(
                id=rev.id,
                order_id=rev.order_id,
                token_number=order.token_number,
                menu_item_id=item.id,
                menu_item_name=item.name,
                menu_item_category=item.category,
                menu_item_price=item.price,
                menu_item_is_veg=item.is_veg,
                menu_item_image_url=item.image_url,
                is_available_today=item.is_available_today,
                stock_count=item.stock_count,
                is_current_batch=bool(is_current),
                batch_snapped_at=rev.batch_snapped_at,
                rating=rev.rating,
                comment=rev.comment,
                photo_url=rev.photo_url,
                created_at=rev.created_at,
            )
        )
    return results


@router.post("/", response_model=OrderResponse)
async def create_takeaway_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    """
    Atomic Cart Checkout:
    Validates live stock, decrements quantities, locks in prices, generates AMDDMMXXX + slug, and broadcasts.
    """
    if not order_data.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total_amount = 0
    order_items_to_create = []

    # 1. Validate stock and calculate total
    for cart_item in order_data.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == cart_item.menu_item_id).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item ID {cart_item.menu_item_id} not found")

        if not menu_item.is_available_today or menu_item.stock_count < cart_item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {menu_item.name}. Only {menu_item.stock_count} left.",
            )

        # Deduct stock atomically
        menu_item.stock_count -= cart_item.quantity
        if menu_item.stock_count == 0:
            menu_item.is_available_today = False

        item_total = menu_item.price * cart_item.quantity
        total_amount += item_total

        order_items_to_create.append(
            OrderItem(
                menu_item_id=menu_item.id,
                quantity=cart_item.quantity,
                unit_price=menu_item.price,
            )
        )

    # 2. Generate AMDDMMXXX token & obfuscated tracking_slug in IST
    token_number, tracking_slug, now_ist = generate_token_and_slug(db)

    # 3. Create Order record
    new_order = Order(
        token_number=token_number,
        tracking_slug=tracking_slug,
        customer_identifier=order_data.customer_identifier.strip(),
        status="PENDING",
        total_amount=total_amount,
        created_at=now_ist.replace(tzinfo=None),
        items=order_items_to_create,
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # 4. Invalidate stale menu/active-orders cache and warm order lookup cache
    invalidate_menu_cache()
    invalidate_order_cache(
        order_id=new_order.id,
        tracking_slug=new_order.tracking_slug,
        token_number=new_order.token_number,
    )
    payload = _cache_order_variants(new_order)

    # 5. Broadcast live event to kitchen Kanban
    await manager.broadcast({"event": "NEW_ORDER", "order": payload})

    return new_order


@router.get("/active", response_model=List[OrderResponse])
def get_active_orders(db: Session = Depends(get_db)):
    """Admin Kitchen Kanban: Returns all active orders that aren't completed or cancelled"""
    cached = get_cache(ACTIVE_ORDERS_KEY)
    if cached is not None:
        return cached

    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.status.in_(["PENDING", "PREPARING", "READY"]))
        .order_by(Order.created_at.asc())
        .all()
    )
    payload = jsonable_encoder([OrderResponse.model_validate(o) for o in orders])
    set_cache(ACTIVE_ORDERS_KEY, payload, ttl_seconds=settings.ACTIVE_ORDERS_CACHE_TTL)
    return payload


@router.get("/track/{tracking_slug}", response_model=OrderResponse)
def get_order_by_slug(tracking_slug: str, db: Session = Depends(get_db)):
    """Fetch an order by its obfuscated tracking_slug for customer tracking"""
    cache_key = f"order:slug:{tracking_slug}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.tracking_slug == tracking_slug)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return _cache_order_variants(order)


@router.get("/token/{token_number}", response_model=OrderResponse)
def get_order_by_token(token_number: str, db: Session = Depends(get_db)):
    """Fetch the latest order matching an AMDDMMXXX token number"""
    cache_key = f"order:token:{token_number}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.token_number == token_number)
        .order_by(Order.id.desc())
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Token not found")

    return _cache_order_variants(order)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order_by_id(order_id: int, db: Session = Depends(get_db)):
    """Fetch a specific order by ID for the order confirmation page"""
    cache_key = f"order:id:{order_id}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return _cache_order_variants(order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Kitchen Kanban State Machine:
    PENDING -> PREPARING -> READY -> COMPLETED (or CANCELLED)
    """
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    new_status = status_update.status

    # If cancelled, refund stock count back to inventory
    if new_status == "CANCELLED" and old_status == "PENDING":
        for item in order.items:
            menu_item = db.query(MenuItem).filter(MenuItem.id == item.menu_item_id).first()
            if menu_item:
                menu_item.stock_count += item.quantity
                if menu_item.stock_count > 0:
                    menu_item.is_available_today = True

    order.status = new_status
    db.commit()
    db.refresh(order)

    if new_status == "CANCELLED" and old_status == "PENDING":
        invalidate_menu_cache()

    invalidate_order_cache(
        order_id=order.id,
        tracking_slug=order.tracking_slug,
        token_number=order.token_number,
    )
    payload = _cache_order_variants(order)

    await manager.broadcast({"event": "ORDER_UPDATED", "order": payload})

    return order


@router.post("/{order_id}/review", response_model=OrderReviewResponse)
async def submit_order_review(
    order_id: int,
    review_data: OrderReviewCreate,
    db: Session = Depends(get_db),
):
    """Post-pickup customer rating (1-10) and comment updating cumulative and batch scores"""
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.reviews))
        .filter(Order.id == order_id)
        .first()
    )
    if not order or order.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Can only review completed orders")

    ordered_item_ids = {item.menu_item_id for item in order.items}
    if review_data.menu_item_id not in ordered_item_ids:
        raise HTTPException(status_code=400, detail="Item was not part of this order")

    reviewed_item_ids = {rev.menu_item_id for rev in order.reviews}
    if review_data.menu_item_id in reviewed_item_ids:
        raise HTTPException(status_code=409, detail="Item already reviewed for this order")

    menu_item = db.query(MenuItem).filter(MenuItem.id == review_data.menu_item_id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # Update cumulative rating formula: new_avg = ((old_avg * count) + new_val) / (count + 1)
    total_score = (menu_item.cumulative_rating * menu_item.rating_count) + review_data.rating
    menu_item.rating_count += 1
    menu_item.cumulative_rating = round(total_score / menu_item.rating_count, 1)

    cleaned_comment = review_data.comment.strip() if review_data.comment else None

    review = OrderReview(
        order_id=order.id,
        menu_item_id=menu_item.id,
        rating=review_data.rating,
        comment=cleaned_comment or None,
        photo_url=review_data.photo_url,
        batch_snapped_at=menu_item.last_snapped_at,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    invalidate_menu_cache()
    invalidate_order_cache(
        order_id=order.id,
        tracking_slug=order.tracking_slug,
        token_number=order.token_number,
    )

    await manager.broadcast({
        "event": "MENU_UPDATED",
        "action": "REVIEW_ADDED",
        "item": MenuItemResponse.model_validate(menu_item).model_dump(mode="json") if "MenuItemResponse" in globals() else None,
        "menu_item_id": menu_item.id,
    })

    return review