import json
from typing import Any, Optional
import redis

from app.core.config import settings

_redis_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _redis_client


def get_cache(key: str) -> Optional[Any]:
    try:
        raw = get_redis().get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        return None


def set_cache(key: str, value: Any, ttl_seconds: int = 60) -> None:
    try:
        payload = json.dumps(value, default=str)
        get_redis().setex(key, ttl_seconds, payload)
    except Exception:
        pass


def delete_cache(*keys: str) -> None:
    valid_keys = [k for k in keys if k]
    if not valid_keys:
        return
    try:
        get_redis().delete(*valid_keys)
    except Exception:
        pass


def invalidate_menu_cache() -> None:
    delete_cache("menu:today", "menu:all")


def invalidate_order_cache(
    order_id: Optional[int] = None,
    tracking_slug: Optional[str] = None,
    token_number: Optional[str] = None,
) -> None:
    keys = ["orders:active"]
    if order_id is not None:
        keys.append(f"order:id:{order_id}")
    if tracking_slug:
        keys.append(f"order:slug:{tracking_slug}")
    if token_number:
        keys.append(f"order:token:{token_number}")
    delete_cache(*keys)