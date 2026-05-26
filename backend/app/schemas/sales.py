from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime


class DatasetResponse(BaseModel):
    id: int
    name: str
    filename: str
    row_count: int
    column_count: int
    date_range_start: Optional[date]
    date_range_end: Optional[date]
    columns_info: Optional[Dict[str, Any]]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SalesFilter(BaseModel):
    dataset_id: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category: Optional[str] = None
    region: Optional[str] = None
    store_id: Optional[str] = None
    product_id: Optional[str] = None


class DashboardMetrics(BaseModel):
    total_revenue: float
    total_profit: float
    total_orders: int
    average_order_value: float
    profit_margin: float
    revenue_growth: float
    top_products: List[Dict[str, Any]]
    low_performers: List[Dict[str, Any]]
    monthly_trends: List[Dict[str, Any]]
    yearly_trends: List[Dict[str, Any]]
    regional_breakdown: List[Dict[str, Any]]
    category_breakdown: List[Dict[str, Any]]


class AnomalyResult(BaseModel):
    date: str
    value: float
    is_anomaly: bool
    anomaly_score: float
    description: Optional[str] = None
