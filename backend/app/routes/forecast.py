import asyncio
import pandas as pd
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.sales import Dataset
from app.models.forecast import ForecastJob, ForecastResult, ModelComparison
from app.schemas.forecast import (
    ForecastRequest, ForecastJobResponse, ForecastResultResponse,
    ModelCompareRequest, ModelCompareResponse, ForecastPoint,
)
from app.utils.auth import get_current_user
from app.utils.dataset import load_dataset_df
from app.services.ml_service import train_model, compare_models, generate_ai_insights

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


async def _run_forecast(job_id: int, dataset_id: int, request: ForecastRequest):
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ForecastJob).where(ForecastJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            return

        job.status = "running"
        job.started_at = datetime.utcnow()
        await db.commit()

        try:
            ds_result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
            dataset = ds_result.scalar_one_or_none()
            if not dataset:
                raise ValueError("Dataset not found")
            df = load_dataset_df(dataset)
            result_data = await asyncio.get_event_loop().run_in_executor(
                None, train_model, df, request.model_type, request.date_column,
                request.target_column, request.forecast_horizon, request.config
            )

            job.status = "completed"
            job.completed_at = datetime.utcnow()
            job.metrics = result_data["metrics"]
            job.feature_importance = result_data.get("feature_importance", {})
            await db.commit()

            all_preds = result_data["historical_predictions"] + result_data["future_predictions"]
            for pt in all_preds:
                fr = ForecastResult(
                    job_id=job_id,
                    date=datetime.strptime(pt["date"], "%Y-%m-%d").date(),
                    predicted_value=pt["predicted"],
                    lower_bound=pt.get("lower_bound"),
                    upper_bound=pt.get("upper_bound"),
                    actual_value=pt.get("actual"),
                    is_future=1 if pt.get("is_future") else 0,
                )
                db.add(fr)
            await db.commit()

        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
            await db.commit()


@router.post("/train", response_model=ForecastJobResponse)
async def create_forecast(
    request: ForecastRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ds_result = await db.execute(select(Dataset).where(Dataset.id == request.dataset_id))
    dataset = ds_result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    valid_models = ["linear", "xgboost", "arima", "prophet", "lstm", "ensemble"]
    if request.model_type not in valid_models:
        raise HTTPException(status_code=400, detail=f"Invalid model. Choose from: {valid_models}")

    job = ForecastJob(
        dataset_id=request.dataset_id,
        model_type=request.model_type,
        target_column=request.target_column,
        date_column=request.date_column,
        forecast_horizon=request.forecast_horizon,
        horizon_unit=request.horizon_unit,
        status="pending",
        config=request.config,
        created_by=current_user.id,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(_run_forecast, job.id, dataset.id, request)

    return ForecastJobResponse.model_validate(job)


@router.get("/jobs", response_model=list[ForecastJobResponse])
async def list_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ForecastJob).order_by(ForecastJob.created_at.desc()).limit(50))
    return [ForecastJobResponse.model_validate(j) for j in result.scalars().all()]


@router.get("/jobs/{job_id}", response_model=ForecastResultResponse)
async def get_forecast_result(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_result = await db.execute(select(ForecastJob).where(ForecastJob.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Forecast job not found")

    preds_result = await db.execute(
        select(ForecastResult).where(ForecastResult.job_id == job_id).order_by(ForecastResult.date)
    )
    preds = preds_result.scalars().all()

    points = [
        ForecastPoint(
            date=str(p.date),
            predicted=p.predicted_value,
            lower_bound=p.lower_bound,
            upper_bound=p.upper_bound,
            actual=p.actual_value,
            is_future=bool(p.is_future),
        )
        for p in preds
    ]

    insights = []
    if job.status == "completed" and job.metrics:
        try:
            ds_result = await db.execute(select(Dataset).where(Dataset.id == job.dataset_id))
            dataset = ds_result.scalar_one_or_none()
            if dataset:
                df = load_dataset_df(dataset)
                insights = generate_ai_insights(job.metrics, df, job.date_column, job.target_column)
        except Exception:
            insights = ["Forecast completed successfully."]

    return ForecastResultResponse(
        job=ForecastJobResponse.model_validate(job),
        predictions=points,
        metrics=job.metrics,
        feature_importance=job.feature_importance,
        insights=insights,
    )


@router.post("/compare", response_model=ModelCompareResponse)
async def compare_forecast_models(
    request: ModelCompareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ds_result = await db.execute(select(Dataset).where(Dataset.id == request.dataset_id))
    dataset = ds_result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        df = load_dataset_df(dataset)
        result = await asyncio.get_event_loop().run_in_executor(
            None, compare_models, df, request.date_column, request.target_column, request.models, 30
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    comp = ModelComparison(
        dataset_id=request.dataset_id,
        comparison_results=result["results"],
        best_model=result["best_model"],
    )
    db.add(comp)
    await db.commit()

    return ModelCompareResponse(results=result["results"], best_model=result["best_model"])
