from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional, List, Any
from datetime import datetime


# --- Menu Item Schemas ---

class MenuItemCreate(BaseModel):
    name: str = Field(..., max_length=100)
    category: str = Field(default="Meals", max_length=50)
    price: int = Field(..., gt=0)
    unit_type: str = Field(default="piece", max_length=20)
    is_veg: bool = False
    stock_count: int = Field(default=0, ge=0)


class DailyBatchUpdate(BaseModel):
    stock_count: int = Field(..., ge=0)


class MenuItemResponse(BaseModel):
    id: int
    name: str
    category: str
    price: int
    unit_type: str
    is_veg: bool
    is_available_today: bool
    stock_count: int
    image_url: Optional[str] = None
    last_snapped_at: Optional[datetime] = None
    cumulative_rating: float = 0.0
    rating_count: int = 0
    batch_rating: float = 0.0
    batch_rating_count: int = 0
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Order & Cart Schemas ---

class CartItem(BaseModel):
    menu_item_id: int
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    customer_identifier: str = Field(..., min_length=2, max_length=100)
    items: List[CartItem]


class OrderItemResponse(BaseModel):
    id: int
    menu_item_id: int
    quantity: int
    unit_price: int
    name: Optional[str] = None
    menu_item: Optional[MenuItemResponse] = None

    @model_validator(mode="before")
    @classmethod
    def extract_item_name(cls, data: Any) -> Any:
        if hasattr(data, "menu_item") and data.menu_item and hasattr(data.menu_item, "name"):
            if isinstance(data, dict):
                data["name"] = data.menu_item.name
            else:
                setattr(data, "name", data.menu_item.name)
        return data

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    token_number: str
    tracking_slug: str
    customer_identifier: str
    status: str
    total_amount: int
    created_at: datetime
    items: List[OrderItemResponse]
    reviewed_item_ids: List[int] = []

    @model_validator(mode="before")
    @classmethod
    def extract_reviewed_item_ids(cls, data: Any) -> Any:
        if hasattr(data, "reviews") and data.reviews is not None:
            ids = [rev.menu_item_id for rev in data.reviews if getattr(rev, "menu_item_id", None) is not None]
            if isinstance(data, dict):
                data.setdefault("reviewed_item_ids", ids)
            else:
                setattr(data, "reviewed_item_ids", ids)
        return data

    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(PENDING|PREPARING|READY|COMPLETED|CANCELLED)$")


# --- Review & Rating Schemas ---

class OrderReviewCreate(BaseModel):
    menu_item_id: int
    rating: int = Field(..., ge=1, le=10)
    comment: Optional[str] = Field(default=None, max_length=240)
    photo_url: Optional[str] = None


class OrderReviewResponse(BaseModel):
    id: int
    order_id: int
    menu_item_id: int
    rating: int
    comment: Optional[str] = None
    photo_url: Optional[str] = None
    batch_snapped_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewFeedItemResponse(BaseModel):
    id: int
    order_id: int
    token_number: str
    menu_item_id: int
    menu_item_name: str
    menu_item_category: str
    menu_item_price: int
    menu_item_is_veg: bool
    menu_item_image_url: Optional[str] = None
    is_available_today: bool
    stock_count: int
    is_current_batch: bool
    batch_snapped_at: Optional[datetime] = None
    rating: int
    comment: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime