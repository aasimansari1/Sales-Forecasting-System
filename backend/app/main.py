from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend_dist")

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


# Serve built React SPA (production)
if os.path.isdir(FRONTEND_DIR):
    _assets_dir = os.path.join(FRONTEND_DIR, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="static-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        candidate = os.path.join(FRONTEND_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
else:
    @app.get("/")
    async def root():
        return {"message": "Sales Forecasting API", "docs": "/docs", "health": "/health"}
