from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_content = Column(Text, nullable=True)
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    date_range_start = Column(Date, nullable=True)
    date_range_end = Column(Date, nullable=True)
    columns_info = Column(JSON, nullable=True)
    status = Column(String(50), default="uploaded")
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SalesRecord(Base):
    __tablename__ = "sales_records"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    product_id = Column(String(100), nullable=True)
    product_name = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    store_id = Column(String(100), nullable=True)
    quantity = Column(Float, default=0)
    unit_price = Column(Float, default=0)
    revenue = Column(Float, default=0)
    cost = Column(Float, default=0)
    profit = Column(Float, default=0)
    customer_id = Column(String(100), nullable=True)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
