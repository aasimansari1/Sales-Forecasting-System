from sqlalchemy import Column, Integer, String, Float, DateTime, Date, JSON, ForeignKey, Text
from sqlalchemy.sql import func
from app.database import Base


class ForecastJob(Base):
    __tablename__ = "forecast_jobs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    model_type = Column(String(50), nullable=False)
    target_column = Column(String(100), nullable=False)
    date_column = Column(String(100), nullable=False)
    forecast_horizon = Column(Integer, default=30)
    horizon_unit = Column(String(20), default="days")
    status = Column(String(50), default="pending")
    metrics = Column(JSON, nullable=True)
    feature_importance = Column(JSON, nullable=True)
    config = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ForecastResult(Base):
    __tablename__ = "forecast_results"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("forecast_jobs.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    predicted_value = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=True)
    upper_bound = Column(Float, nullable=True)
    actual_value = Column(Float, nullable=True)
    is_future = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ModelComparison(Base):
    __tablename__ = "model_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    comparison_results = Column(JSON, nullable=False)
    best_model = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
