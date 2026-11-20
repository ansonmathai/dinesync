from sqlalchemy import DateTime, String, Integer, Boolean, Float, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.db import Base
from datetime import datetime
from typing import List, Optional


class MenuItem(Base):
    """Master menu item table with daily stock and freshness tracking"""
    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="Meals", index=True)
    price: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit_type: Mapped[str] = mapped_column(String(20), default="piece")
    is_veg: Mapped[bool] = mapped_column(Boolean, default=False)

    is_available_today: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    stock_count: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    last_snapped_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    cumulative_rating: Mapped[float] = mapped_column(Float, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)

    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    order_items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="menu_item")
    reviews: Mapped[List["OrderReview"]] = relationship("OrderReview", back_populates="menu_item")


class Order(Base):
    """Takeaway orders with AMDDMMXXX daily tokens, obfuscated tracking slugs, and state tracking"""
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    token_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    tracking_slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    customer_identifier: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)  # PENDING, PREPARING, READY, COMPLETED, CANCELLED
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    reviews: Mapped[List["OrderReview"]] = relationship("OrderReview", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    """Line items locking in quantity and historical unit price per order"""
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    menu_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("menu_items.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[int] = mapped_column(Integer, nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="items")
    menu_item: Mapped["MenuItem"] = relationship("MenuItem", back_populates="order_items")


class OrderReview(Base):
    """Post-pickup customer ratings and daily expiring photo reviews"""
    __tablename__ = "order_reviews"
    __table_args__ = (
        UniqueConstraint("order_id", "menu_item_id", name="uq_order_reviews_order_item"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    menu_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("menu_items.id"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    batch_snapped_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)

    order: Mapped["Order"] = relationship("Order", back_populates="reviews")
    menu_item: Mapped["MenuItem"] = relationship("MenuItem", back_populates="reviews")