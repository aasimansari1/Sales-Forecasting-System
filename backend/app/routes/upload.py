import io
import os
import uuid
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import aiofiles

from app.database import get_db
from app.models.user import User
from app.models.sales import Dataset
from app.schemas.sales import DatasetResponse
from app.utils.auth import get_current_user
from app.utils.dataset import load_dataset_df
from app.config import settings
from app.services.data_processor import detect_column_types, clean_and_preprocess, get_dataset_summary

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/csv", response_model=DatasetResponse)
async def upload_csv(
    file: UploadFile = File(...),
    name: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    if file.size and file.size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    ext = file.filename.rsplit(".", 1)[-1]
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    content = await file.read()

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(content), encoding="utf-8", on_bad_lines="skip")
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=422, detail=f"Could not parse file: {str(e)}")

    col_types = detect_column_types(df)
    date_col = next((c for c, t in col_types.items() if t == "date"), None)

    date_start = None
    date_end = None
    if date_col:
        try:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
            date_start = df[date_col].min().date() if not df[date_col].isna().all() else None
            date_end = df[date_col].max().date() if not df[date_col].isna().all() else None
        except Exception:
            pass

    # Store CSV content in DB for persistence across redeploys
    stored_content = None
    if ext == "csv":
        try:
            stored_content = content.decode("utf-8", errors="replace")
        except Exception:
            pass

    dataset = Dataset(
        name=name,
        filename=file.filename,
        file_path=file_path,
        file_content=stored_content,
        row_count=len(df),
        column_count=len(df.columns),
        date_range_start=date_start,
        date_range_end=date_end,
        columns_info={"columns": list(df.columns), "types": col_types},
        status="ready",
        uploaded_by=current_user.id,
    )
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)

    return DatasetResponse.model_validate(dataset)


@router.get("/datasets", response_model=list[DatasetResponse])
async def list_datasets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Dataset).order_by(Dataset.created_at.desc()))
    return [DatasetResponse.model_validate(d) for d in result.scalars().all()]


@router.get("/datasets/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return DatasetResponse.model_validate(dataset)


@router.get("/datasets/{dataset_id}/summary")
async def get_dataset_summary_route(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        df = load_dataset_df(dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    col_info = dataset.columns_info or {}
    col_types = col_info.get("types", {})
    date_col = next((c for c, t in col_types.items() if t == "date"), None)
    target_col = next((c for c, t in col_types.items() if "numeric_revenue" in t), None)

    summary = get_dataset_summary(df, date_col, target_col)
    return summary


@router.delete("/datasets/{dataset_id}")
async def delete_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)

    await db.delete(dataset)
    await db.commit()
    return {"message": "Dataset deleted"}
