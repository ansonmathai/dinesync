import asyncio
import json
from typing import Any, Dict, List
from fastapi import WebSocket
import redis.asyncio as aioredis

from app.core.config import settings

ORDERS_CHANNEL = "amfoods:events"


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []
        self._pubsub_task: asyncio.Task | None = None
        self._redis: aioredis.Redis | None = None

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def _send_local(self, message: Dict[str, Any]) -> None:
        payload = json.dumps(message, default=str)
        stale: List[WebSocket] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                stale.append(connection)
        for conn in stale:
            self.disconnect(conn)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        payload = json.dumps(message, default=str)
        try:
            if self._redis is None:
                self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await self._redis.publish(ORDERS_CHANNEL, payload)
        except Exception:
            # Fail-open to local fan-out if Redis Pub/Sub is unavailable
            await self._send_local(message)

    async def _listener_loop(self) -> None:
        while True:
            pubsub = None
            try:
                client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
                pubsub = client.pubsub()
                await pubsub.subscribe(ORDERS_CHANNEL)

                async for msg in pubsub.listen():
                    if msg.get("type") == "message":
                        data = json.loads(msg["data"])
                        await self._send_local(data)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(2)
            finally:
                if pubsub is not None:
                    try:
                        await pubsub.unsubscribe(ORDERS_CHANNEL)
                        await pubsub.aclose()
                    except Exception:
                        pass

    async def start_listener(self) -> None:
        if self._pubsub_task is None or self._pubsub_task.done():
            self._pubsub_task = asyncio.create_task(self._listener_loop())

    async def stop_listener(self) -> None:
        if self._pubsub_task and not self._pubsub_task.done():
            self._pubsub_task.cancel()
            try:
                await self._pubsub_task
            except asyncio.CancelledError:
                pass
        if self._redis is not None:
            try:
                await self._redis.aclose()
            except Exception:
                pass
            self._redis = None


manager = ConnectionManager()