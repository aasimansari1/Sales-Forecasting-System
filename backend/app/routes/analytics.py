import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.sales import Dataset
from app.utils.auth import get_current_user
from app.services.analytics_service import (
    compute_dashboard_metrics, compute_inventory_recommendations,
    customer_behavior_analysis, seasonal_analysis,
)
from app.services.ml_service import detect_anomalies
from app.services.data_processor import detect_column_types, clean_and_preprocess

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _load_df(dataset: Dataset) -> pd.DataFrame:
    try:
        if dataset.file_path.endswith((".xlsx", ".xls")):
            return pd.read_excel(dataset.file_path)
        return pd.read_csv(dataset.file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read dataset: {str(e)}")


def _get_date_col(dataset: Dataset) -> str:
    col_info = dataset.columns_info or {}
    col_types = col_info.get("types", {})
    date_col = next((c for c, t in col_types.items() if t == "date"), None)
    if not date_col:
        raise HTTPException(status_code=422, detail="No date column detected in dataset")
    return date_col


@router.get("/dashboard/{dataset_id}")
async def get_dashboard(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = _load_df(dataset)
    date_col = _get_date_col(dataset)
    df, _ = clean_and_preprocess(df)
    metrics = compute_dashboard_metrics(df, date_col)
    return metrics


@router.get("/inventory/{dataset_id}")
async def get_inventory_recommendations(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = _load_df(dataset)
    date_col = _get_date_col(dataset)
    recs = compute_inventory_recommendations(df, date_col)
    return {"recommendations": recs}


@router.get("/customers/{dataset_id}")
async def get_customer_analysis(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = _load_df(dataset)
    date_col = _get_date_col(dataset)
    analysis = customer_behavior_analysis(df, date_col)
    return analysis


@router.get("/seasonal/{dataset_id}")
async def get_seasonal_analysis(
    dataset_id: int,
    target_column: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = _load_df(dataset)
    date_col = _get_date_col(dataset)

    if target_column not in df.columns:
        raise HTTPException(status_code=422, detail=f"Column '{target_column}' not found")

    analysis = seasonal_analysis(df, date_col, target_column)
    return analysis


@router.get("/anomalies/{dataset_id}")
async def get_anomalies(
    dataset_id: int,
    target_column: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = _load_df(dataset)
    date_col = _get_date_col(dataset)

    if target_column not in df.columns:
        raise HTTPException(status_code=422, detail=f"Column '{target_column}' not found")

    anomalies = detect_anomalies(df, date_col, target_column)
    detected = [a for a in anomalies if a["is_anomaly"]]
    return {"total_points": len(anomalies), "anomalies_detected": len(detected), "anomalies": detected}


@router.get("/columns/{dataset_id}")
async def get_columns(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = _load_df(dataset)
    col_types = detect_column_types(df)
    numeric_cols = [c for c, t in col_types.items() if "numeric" in t]
    date_cols = [c for c, t in col_types.items() if t == "date"]
    categorical_cols = [c for c, t in col_types.items() if "categorical" in t]

    return {
        "all_columns": list(df.columns),
        "numeric_columns": numeric_cols,
        "date_columns": date_cols,
        "categorical_columns": categorical_cols,
        "detected_types": col_types,
    }
