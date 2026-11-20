from contextlib import asynccontextmanager
import os
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from mangum import Mangum
from sqlalchemy import text

from app.api.routes import inventory, orders
from app.core.cache import get_redis
from app.core.config import settings
from app.core.db import engine
from app.core.websocket import manager
from app.models.inventory import Base

# Ensure static upload directory exists locally or on container startup
os.makedirs("static/uploads", exist_ok=True)

# Automatically create database tables if they do not exist
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await manager.start_listener()
    try:
        yield
    finally:
        await manager.stop_listener()


app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files so Next.js can instantly render camera-commit dish photos
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include feature routers
app.include_router(inventory.router)
app.include_router(orders.router)


@app.get("/")
def home():
    return {"message": f"Welcome to {settings.PROJECT_NAME} Engine API!"}


@app.get("/health")
def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        get_redis().ping()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {exc}")

    return {"status": "ok"}


@app.websocket("/ws/orders")
async def websocket_endpoint(websocket: WebSocket):
    """Central WebSocket pipeline for live menu updates and kitchen order feeds"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for client heartbeats/pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# AWS Lambda / Serverless handler adapter
handler = Mangum(app)