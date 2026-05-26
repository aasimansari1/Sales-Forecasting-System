from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime


class ForecastRequest(BaseModel):
    dataset_id: int
    model_type: str  # linear, xgboost, arima, prophet, lstm, ensemble
    target_column: str
    date_column: str
    forecast_horizon: int = 30
    horizon_unit: str = "days"  # days, weeks, months
    config: Optional[Dict[str, Any]] = None


class ForecastJobResponse(BaseModel):
    id: int
    dataset_id: int
    model_type: str
    target_column: str
    date_column: str
    forecast_horizon: int
    horizon_unit: str
    status: str
    metrics: Optional[Dict[str, Any]]
    feature_importance: Optional[Dict[str, Any]]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ForecastPoint(BaseModel):
    date: str
    predicted: float
    lower_bound: Optional[float]
    upper_bound: Optional[float]
    actual: Optional[float]
    is_future: bool


class ForecastResultResponse(BaseModel):
    job: ForecastJobResponse
    predictions: List[ForecastPoint]
    metrics: Optional[Dict[str, Any]]
    feature_importance: Optional[Dict[str, Any]]
    insights: List[str]


class ModelCompareRequest(BaseModel):
    dataset_id: int
    target_column: str
    date_column: str
    models: List[str] = ["linear", "xgboost", "arima", "prophet"]


class ModelCompareResponse(BaseModel):
    results: List[Dict[str, Any]]
    best_model: str
    comparison_chart: Optional[Dict[str, Any]]
