from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import asyncio
import os
import random
from datetime import date, timedelta

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend_dist")

from app.config import settings
from app.database import create_tables
from app.routes import auth, upload, forecast, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run DB init synchronously so data is ready before the first request
    try:
        await asyncio.wait_for(create_tables(), timeout=30)
        await asyncio.wait_for(_seed_admin(), timeout=30)
        await asyncio.wait_for(_seed_demo_data(), timeout=60)
        print("[startup] DB init complete")
    except asyncio.TimeoutError:
        print("[startup] DB init timed out — continuing anyway")
    except Exception as e:
        print(f"[startup] DB init warning: {e}")
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


async def _seed_demo_data():
    from app.database import AsyncSessionLocal
    from app.models.sales import Dataset
    from app.services.data_processor import detect_column_types
    from sqlalchemy import select
    import pandas as pd

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Dataset).limit(1))
        if result.scalar_one_or_none():
            return  # already has data

    products = [
        ("Laptop Pro X", "Electronics"), ("Wireless Headphones", "Electronics"),
        ("Smart Watch", "Electronics"), ("Running Shoes", "Apparel"),
        ("Casual T-Shirt", "Apparel"), ("Winter Jacket", "Apparel"),
        ("Coffee Maker", "Home & Kitchen"), ("Air Purifier", "Home & Kitchen"),
        ("Yoga Mat", "Sports"), ("Protein Powder", "Health"),
        ("Sunglasses", "Accessories"), ("Backpack", "Accessories"),
    ]
    regions = ["North", "South", "East", "West", "Central"]
    customers = [f"CUST{i:04d}" for i in range(1, 201)]

    rng = random.Random(42)
    rows = []
    start = date(2023, 1, 1)
    for i in range(1200):
        d = start + timedelta(days=rng.randint(0, 729))
        product, category = rng.choice(products)
        qty = rng.randint(1, 20)
        price = round(rng.uniform(15, 1200), 2)
        cost = round(price * rng.uniform(0.45, 0.70), 2)
        revenue = round(qty * price, 2)
        profit = round(qty * (price - cost), 2)
        rows.append({
            "date": d.strftime("%Y-%m-%d"),
            "product": product,
            "category": category,
            "region": rng.choice(regions),
            "customer_id": rng.choice(customers),
            "quantity": qty,
            "unit_price": price,
            "cost": cost,
            "revenue": revenue,
            "profit": profit,
        })

    df = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
    csv_content = df.to_csv(index=False)

    col_types = detect_column_types(df)
    dataset = Dataset(
        name="Demo Sales Data (2023–2024)",
        filename="demo_sales.csv",
        file_path="__demo__",
        file_content=csv_content,
        row_count=len(df),
        column_count=len(df.columns),
        date_range_start=date(2023, 1, 1),
        date_range_end=date(2024, 12, 31),
        columns_info={"types": col_types},
        status="ready",
    )
    async with AsyncSessionLocal() as db:
        db.add(dataset)
        await db.commit()
    print("[startup] Demo dataset seeded")


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
