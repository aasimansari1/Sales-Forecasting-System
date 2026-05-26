import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, List, Optional
import re
from datetime import datetime


def detect_column_types(df: pd.DataFrame) -> Dict[str, str]:
    types = {}
    date_keywords = ["date", "time", "day", "month", "year", "period", "week"]
    revenue_keywords = ["revenue", "sales", "amount", "price", "total", "income", "value", "cost", "profit"]
    product_keywords = ["product", "item", "sku", "name", "description"]
    region_keywords = ["region", "state", "city", "country", "location", "store", "area"]
    quantity_keywords = ["quantity", "qty", "units", "count", "volume"]

    for col in df.columns:
        col_lower = col.lower()
        if any(k in col_lower for k in date_keywords) or pd.api.types.is_datetime64_any_dtype(df[col]):
            types[col] = "date"
        elif any(k in col_lower for k in revenue_keywords) and pd.api.types.is_numeric_dtype(df[col]):
            types[col] = "numeric_revenue"
        elif any(k in col_lower for k in quantity_keywords) and pd.api.types.is_numeric_dtype(df[col]):
            types[col] = "numeric_quantity"
        elif any(k in col_lower for k in product_keywords):
            types[col] = "categorical_product"
        elif any(k in col_lower for k in region_keywords):
            types[col] = "categorical_region"
        elif pd.api.types.is_numeric_dtype(df[col]):
            types[col] = "numeric"
        else:
            types[col] = "categorical"
    return types


def clean_and_preprocess(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    report = {"original_rows": len(df), "issues_fixed": []}

    df = df.drop_duplicates()
    dupes_removed = report["original_rows"] - len(df)
    if dupes_removed:
        report["issues_fixed"].append(f"Removed {dupes_removed} duplicate rows")

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in numeric_cols:
        missing = df[col].isna().sum()
        if missing > 0:
            df[col] = df[col].fillna(df[col].median())
            report["issues_fixed"].append(f"Filled {missing} missing values in '{col}' with median")

    cat_cols = df.select_dtypes(include=["object"]).columns.tolist()
    for col in cat_cols:
        missing = df[col].isna().sum()
        if missing > 0:
            df[col] = df[col].fillna("Unknown")
            report["issues_fixed"].append(f"Filled {missing} missing values in '{col}' with 'Unknown'")

    for col in numeric_cols:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower, upper = Q1 - 3 * IQR, Q3 + 3 * IQR
        outliers = ((df[col] < lower) | (df[col] > upper)).sum()
        if outliers > 0:
            df[col] = df[col].clip(lower=lower, upper=upper)
            report["issues_fixed"].append(f"Capped {outliers} outliers in '{col}'")

    report["final_rows"] = len(df)
    return df, report


def parse_date_column(df: pd.DataFrame, date_col: str) -> pd.DataFrame:
    if df[date_col].dtype == "object":
        formats = ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d-%m-%Y", "%B %d, %Y", "%b %d, %Y"]
        for fmt in formats:
            try:
                df[date_col] = pd.to_datetime(df[date_col], format=fmt)
                break
            except (ValueError, TypeError):
                continue
        else:
            df[date_col] = pd.to_datetime(df[date_col], infer_datetime_format=True, errors="coerce")
    else:
        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")

    df = df.dropna(subset=[date_col])
    df = df.sort_values(date_col)
    return df


def engineer_features(df: pd.DataFrame, date_col: str) -> pd.DataFrame:
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    df["day_of_week"] = df[date_col].dt.dayofweek
    df["day_of_month"] = df[date_col].dt.day
    df["week_of_year"] = df[date_col].dt.isocalendar().week.astype(int)
    df["month"] = df[date_col].dt.month
    df["quarter"] = df[date_col].dt.quarter
    df["year"] = df[date_col].dt.year
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_month_start"] = df[date_col].dt.is_month_start.astype(int)
    df["is_month_end"] = df[date_col].dt.is_month_end.astype(int)
    df["is_quarter_start"] = df[date_col].dt.is_quarter_start.astype(int)
    df["day_of_year"] = df[date_col].dt.dayofyear
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    df["dow_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)
    return df


def aggregate_time_series(df: pd.DataFrame, date_col: str, target_col: str, freq: str = "D") -> pd.DataFrame:
    df[date_col] = pd.to_datetime(df[date_col])
    ts = df.groupby(pd.Grouper(key=date_col, freq=freq))[target_col].sum().reset_index()
    ts = ts.rename(columns={date_col: "ds", target_col: "y"})
    ts = ts.dropna()
    return ts


def create_lag_features(df: pd.DataFrame, target_col: str, lags: List[int] = [1, 7, 14, 30]) -> pd.DataFrame:
    for lag in lags:
        df[f"lag_{lag}"] = df[target_col].shift(lag)
    for window in [7, 14, 30]:
        df[f"rolling_mean_{window}"] = df[target_col].shift(1).rolling(window=window).mean()
        df[f"rolling_std_{window}"] = df[target_col].shift(1).rolling(window=window).std()
    df = df.dropna()
    return df


def get_dataset_summary(df: pd.DataFrame, date_col: Optional[str], target_col: Optional[str]) -> Dict[str, Any]:
    summary: Dict[str, Any] = {
        "shape": {"rows": len(df), "columns": len(df.columns)},
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_values": df.isna().sum().to_dict(),
        "numeric_stats": {},
        "categorical_stats": {},
    }

    for col in df.select_dtypes(include=[np.number]).columns:
        summary["numeric_stats"][col] = {
            "mean": float(df[col].mean()),
            "median": float(df[col].median()),
            "std": float(df[col].std()),
            "min": float(df[col].min()),
            "max": float(df[col].max()),
        }

    for col in df.select_dtypes(include=["object"]).columns:
        summary["categorical_stats"][col] = {
            "unique_count": int(df[col].nunique()),
            "top_values": df[col].value_counts().head(5).to_dict(),
        }

    if date_col and date_col in df.columns:
        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
        summary["date_range"] = {
            "start": str(df[date_col].min().date()) if not pd.isna(df[date_col].min()) else None,
            "end": str(df[date_col].max().date()) if not pd.isna(df[date_col].max()) else None,
        }

    if target_col and target_col in df.columns:
        summary["target_stats"] = {
            "total": float(df[target_col].sum()),
            "mean": float(df[target_col].mean()),
            "max": float(df[target_col].max()),
            "min": float(df[target_col].min()),
        }

    return summary
