from datetime import date, datetime
import os
import shutil
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session

from app.core.cache import get_cache, invalidate_menu_cache, set_cache
from app.core.config import settings
from app.core.db import get_db
from app.core.websocket import manager
from app.models.inventory import MenuItem, OrderItem, OrderReview
from app.schemas.inventory import MenuItemResponse

router = APIRouter(prefix="/menu", tags=["Menu & Daily Batch"])

UPLOAD_DIR = "static/uploads"
REVIEWS_UPLOAD_DIR = os.path.join(UPLOAD_DIR, "reviews")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(REVIEWS_UPLOAD_DIR, exist_ok=True)

ALLOWED_REVIEW_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_REVIEW_PHOTO_BYTES = 2 * 1024 * 1024  # 2 MB

MENU_TODAY_KEY = "menu:today"
MENU_ALL_KEY = "menu:all"


def save_uploaded_image(file: UploadFile) -> str:
    """Saves uploaded image locally (swap for Cloudinary/S3 SDK in production)"""
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return f"/static/uploads/{filename}"


def _serialize_menu_items(db: Session, items: List[MenuItem]) -> List[dict]:
    """Attaches current-batch rating and review count alongside overall ratings"""
    if not items:
        return []

    item_ids = [item.id for item in items]
    rows = (
        db.query(
            OrderReview.menu_item_id,
            OrderReview.batch_snapped_at,
            func.avg(OrderReview.rating).label("avg_rating"),
            func.count(OrderReview.id).label("cnt"),
        )
        .filter(OrderReview.menu_item_id.in_(item_ids))
        .group_by(OrderReview.menu_item_id, OrderReview.batch_snapped_at)
        .all()
    )

    batch_stats: dict[tuple[int, Optional[datetime]], tuple[float, int]] = {
        (row.menu_item_id, row.batch_snapped_at): (
            round(float(row.avg_rating), 1),
            int(row.cnt),
        )
        for row in rows
    }

    serialized: List[dict] = []
    for item in items:
        batch_rating, batch_rating_count = batch_stats.get(
            (item.id, item.last_snapped_at), (0.0, 0)
        )
        data = MenuItemResponse.model_validate(item).model_dump()
        data["batch_rating"] = batch_rating
        data["batch_rating_count"] = batch_rating_count
        serialized.append(data)

    return jsonable_encoder(serialized)


@router.get("/today", response_model=List[MenuItemResponse])
def get_todays_live_menu(db: Session = Depends(get_db)):
    """
    Customer Takeaway Feed:
    Returns only items snapped today with available stock, sorted newest batch first.
    """
    cached = get_cache(MENU_TODAY_KEY)
    if cached is not None:
        return cached

    today = date.today()
    items = (
        db.query(MenuItem)
        .filter(
            MenuItem.is_available_today == True,
            MenuItem.stock_count > 0,
            cast(MenuItem.last_snapped_at, Date) == today,
        )
        .order_by(MenuItem.last_snapped_at.desc())
        .all()
    )
    payload = _serialize_menu_items(db, items)
    set_cache(MENU_TODAY_KEY, payload, ttl_seconds=settings.MENU_CACHE_TTL)
    return payload


@router.get("/all", response_model=List[MenuItemResponse])
def get_all_menu_items(db: Session = Depends(get_db)):
    """Admin Catalog: Returns all items (active + inactive) for 1-tap daily restocking"""
    cached = get_cache(MENU_ALL_KEY)
    if cached is not None:
        return cached

    today = date.today()
    items = db.query(MenuItem).order_by(MenuItem.name).all()

    # Dynamically reflect midnight reset in response without needing a cron job
    for item in items:
        if not item.last_snapped_at or item.last_snapped_at.date() != today:
            item.is_available_today = False
            item.stock_count = 0

    payload = _serialize_menu_items(db, items)
    set_cache(MENU_ALL_KEY, payload, ttl_seconds=settings.MENU_CACHE_TTL)
    return payload


@router.post("/create-with-photo", response_model=MenuItemResponse)
async def create_menu_item_with_photo(
    name: str = Form(...),
    category: str = Form("Meals"),
    price: int = Form(...),
    unit_type: str = Form("piece"),
    is_veg: bool = Form(False),
    stock_count: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Admin New Dish Flow: Creates item and activates it immediately with a live camera snap"""
    name_clean = name.strip()
    existing = db.query(MenuItem).filter(func.lower(MenuItem.name) == func.lower(name_clean)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Dish already exists. Use daily-batch update instead.")

    image_url = save_uploaded_image(file)
    now = datetime.now()

    new_item = MenuItem(
        name=name_clean,
        category=category,
        price=price,
        unit_type=unit_type,
        is_veg=is_veg,
        stock_count=stock_count,
        is_available_today=stock_count > 0,
        image_url=image_url,
        last_snapped_at=now,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    invalidate_menu_cache()

    await manager.broadcast({
        "event": "MENU_UPDATED",
        "action": "CREATED",
        "item": MenuItemResponse.model_validate(new_item).model_dump(mode="json"),
    })
    return new_item


@router.post("/{item_id}/daily-batch", response_model=MenuItemResponse)
async def camera_commit_daily_batch(
    item_id: int,
    stock_count: int = Form(...),
    price: Optional[int] = Form(None),  # Optional daily price override (e.g., fish market rate)
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Camera-Commit Re-Stock Flow:
    1-tap photo snap updates today's fresh image, sets stock, updates price if needed, and goes live.
    """
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    image_url = save_uploaded_image(file)

    item.image_url = image_url
    item.stock_count = max(0, stock_count)
    item.is_available_today = item.stock_count > 0
    item.last_snapped_at = datetime.now()

    if price is not None and price > 0:
        item.price = price

    db.commit()
    db.refresh(item)

    invalidate_menu_cache()

    await manager.broadcast({
        "event": "MENU_UPDATED",
        "action": "BATCH_UPDATED",
        "item": MenuItemResponse.model_validate(item).model_dump(mode="json"),
    })
    return item


@router.patch("/{item_id}/adjust-stock", response_model=MenuItemResponse)
async def quick_adjust_stock(
    item_id: int,
    change: int = Query(...),
    db: Session = Depends(get_db),
):
    """Quick +/- 1 offline sale or mark sold out without taking a new photo"""
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    item.stock_count = max(0, item.stock_count + change)
    item.is_available_today = item.stock_count > 0

    db.commit()
    db.refresh(item)

    invalidate_menu_cache()

    await manager.broadcast({
        "event": "MENU_UPDATED",
        "action": "STOCK_ADJUSTED",
        "item": MenuItemResponse.model_validate(item).model_dump(mode="json"),
    })
    return item


@router.post("/reviews/upload-photo")
async def upload_review_photo(file: UploadFile = File(...)):
    """Saves a compressed customer review photo and returns a short static path"""
    ext = ALLOWED_REVIEW_TYPES.get((file.content_type or "").lower())
    if not ext:
        raise HTTPException(status_code=400, detail="Unsupported image format.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > MAX_REVIEW_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 2 MB limit.")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(REVIEWS_UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        buffer.write(data)

    return {"photo_url": f"/static/uploads/reviews/{filename}"}


@router.delete("/{item_id}")
async def delete_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Force delete dependent order items directly without session attribute nullification
    db.query(OrderItem).filter(OrderItem.menu_item_id == item_id).delete(synchronize_session=False)

    db.delete(item)
    db.commit()

    invalidate_menu_cache()

    await manager.broadcast({"event": "MENU_UPDATED", "action": "DELETED", "item_id": item_id})
    return {"status": "success", "message": "Item deleted"}