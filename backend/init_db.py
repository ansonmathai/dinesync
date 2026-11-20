from app.core.db import engine, Base
from app.models.inventory import MenuItem, Order, OrderItem, OrderReview
import sys

def init_tables():
    print("Connecting to PostgreSQL...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Success! All tables ('menu_items', 'orders', 'order_items', 'order_reviews') created in am_foods_db.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_tables()