from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.database import create_tables
from app.routes import auth, upload, forecast, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    await _seed_admin()
    yield


async def _seed_admin():
    from app.database import AsyncSessionLocal
    from app.models.user import User, UserRole
    from app.utils.auth import hash_password
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@salesforecast.ai"))
        if not result.scalar_one_or_none():
            admin = User(
                name="Admin",
                email="admin@salesforecast.ai",
                hashed_password=hash_password("admin123"),
                role=UserRole.admin,
            )
            db.add(admin)
            await db.commit()


app = FastAPI(
    title="Sales Forecasting API",
    description="AI-powered Sales Forecasting and Analytics Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(forecast.router)
app.include_router(analytics.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Sales Forecasting API"}


@app.get("/")
async def root():
    return {
        "message": "Sales Forecasting API",
        "docs": "/docs",
        "health": "/health",
    }
