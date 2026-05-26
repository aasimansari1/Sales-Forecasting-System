import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional


def compute_dashboard_metrics(df: pd.DataFrame, date_col: str) -> Dict[str, Any]:
    revenue_col = _find_col(df, ["revenue", "sales", "amount", "total"])
    profit_col = _find_col(df, ["profit", "margin", "net"])
    quantity_col = _find_col(df, ["quantity", "qty", "units"])
    product_col = _find_col(df, ["product", "item", "sku", "name"])
    region_col = _find_col(df, ["region", "state", "city", "location"])
    category_col = _find_col(df, ["category", "type", "segment"])
    cost_col = _find_col(df, ["cost", "cogs", "expense"])

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")

    total_revenue = float(df[revenue_col].sum()) if revenue_col else 0.0
    total_profit = float(df[profit_col].sum()) if profit_col else (
        float((df[revenue_col] - df[cost_col]).sum()) if revenue_col and cost_col else total_revenue * 0.2
    )
    total_orders = len(df)
    avg_order = total_revenue / total_orders if total_orders else 0
    profit_margin = (total_profit / total_revenue * 100) if total_revenue else 0

    df["_month"] = df[date_col].dt.to_period("M")
    if revenue_col:
        monthly = df.groupby("_month")[revenue_col].sum().reset_index()
        monthly.columns = ["period", "revenue"]
        if len(monthly) >= 2:
            prev = float(monthly["revenue"].iloc[-2])
            curr = float(monthly["revenue"].iloc[-1])
            revenue_growth = ((curr - prev) / prev * 100) if prev else 0
        else:
            revenue_growth = 0.0
        monthly_trends = [{"month": str(r["period"]), "revenue": float(r["revenue"])} for _, r in monthly.iterrows()]
    else:
        monthly_trends = []
        revenue_growth = 0.0

    df["_year"] = df[date_col].dt.year
    yearly_trends = []
    if revenue_col:
        yearly = df.groupby("_year")[revenue_col].sum().reset_index()
        yearly.columns = ["year", "revenue"]
        yearly_trends = [{"year": int(r["year"]), "revenue": float(r["revenue"])} for _, r in yearly.iterrows()]

    top_products = []
    if product_col and revenue_col:
        tp = df.groupby(product_col)[revenue_col].sum().nlargest(10).reset_index()
        tp.columns = ["product", "revenue"]
        top_products = [{"name": str(r["product"]), "revenue": float(r["revenue"])} for _, r in tp.iterrows()]

    low_performers = []
    if product_col and revenue_col:
        lp = df.groupby(product_col)[revenue_col].sum().nsmallest(5).reset_index()
        lp.columns = ["product", "revenue"]
        low_performers = [{"name": str(r["product"]), "revenue": float(r["revenue"])} for _, r in lp.iterrows()]

    regional = []
    if region_col and revenue_col:
        rg = df.groupby(region_col)[revenue_col].sum().reset_index()
        rg.columns = ["region", "revenue"]
        rg = rg.sort_values("revenue", ascending=False)
        regional = [{"region": str(r["region"]), "revenue": float(r["revenue"])} for _, r in rg.iterrows()]

    category = []
    if category_col and revenue_col:
        cg = df.groupby(category_col)[revenue_col].sum().reset_index()
        cg.columns = ["category", "revenue"]
        category = [{"category": str(r["category"]), "revenue": float(r["revenue"])} for _, r in cg.iterrows()]

    return {
        "total_revenue": round(total_revenue, 2),
        "total_profit": round(total_profit, 2),
        "total_orders": total_orders,
        "average_order_value": round(avg_order, 2),
        "profit_margin": round(profit_margin, 2),
        "revenue_growth": round(revenue_growth, 2),
        "top_products": top_products,
        "low_performers": low_performers,
        "monthly_trends": monthly_trends,
        "yearly_trends": yearly_trends,
        "regional_breakdown": regional,
        "category_breakdown": category,
    }


def compute_inventory_recommendations(df: pd.DataFrame, date_col: str) -> List[Dict[str, Any]]:
    product_col = _find_col(df, ["product", "item", "sku", "name"])
    quantity_col = _find_col(df, ["quantity", "qty", "units"])
    if not product_col or not quantity_col:
        return []

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    recent = df[df[date_col] >= df[date_col].max() - pd.Timedelta(days=90)]

    recs = []
    for product, group in recent.groupby(product_col):
        daily_avg = float(group[quantity_col].sum()) / 90
        std = float(group[quantity_col].std()) if len(group) > 1 else daily_avg * 0.2
        safety_stock = daily_avg * 7 + 1.65 * std * np.sqrt(7)
        reorder_point = daily_avg * 14 + safety_stock
        recommended_order = daily_avg * 30

        recs.append({
            "product": str(product),
            "daily_avg_demand": round(daily_avg, 2),
            "safety_stock": round(safety_stock, 0),
            "reorder_point": round(reorder_point, 0),
            "recommended_order_qty": round(recommended_order, 0),
            "alert": "REORDER NOW" if daily_avg > 0 and recommended_order > 0 else "LOW DEMAND",
        })

    recs.sort(key=lambda x: x["daily_avg_demand"], reverse=True)
    return recs[:20]


def customer_behavior_analysis(df: pd.DataFrame, date_col: str) -> Dict[str, Any]:
    customer_col = _find_col(df, ["customer", "client", "buyer", "user"])
    revenue_col = _find_col(df, ["revenue", "sales", "amount", "total"])
    if not customer_col or not revenue_col:
        return {"available": False}

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    snapshot_date = df[date_col].max()

    rfm = df.groupby(customer_col).agg(
        recency=(date_col, lambda x: (snapshot_date - x.max()).days),
        frequency=(date_col, "count"),
        monetary=(revenue_col, "sum"),
    ).reset_index()

    rfm["r_score"] = pd.qcut(rfm["recency"], 4, labels=[4, 3, 2, 1], duplicates="drop")
    rfm["f_score"] = pd.qcut(rfm["frequency"].rank(method="first"), 4, labels=[1, 2, 3, 4], duplicates="drop")
    rfm["m_score"] = pd.qcut(rfm["monetary"], 4, labels=[1, 2, 3, 4], duplicates="drop")
    rfm["rfm_score"] = rfm[["r_score", "f_score", "m_score"]].astype(float).sum(axis=1)

    total = len(rfm)
    champions = int((rfm["rfm_score"] >= 10).sum())
    loyal = int(((rfm["rfm_score"] >= 7) & (rfm["rfm_score"] < 10)).sum())
    at_risk = int(((rfm["rfm_score"] >= 4) & (rfm["rfm_score"] < 7)).sum())
    churned = int((rfm["rfm_score"] < 4).sum())

    return {
        "available": True,
        "total_customers": total,
        "champions": champions,
        "loyal_customers": loyal,
        "at_risk": at_risk,
        "churned": churned,
        "avg_clv": round(float(rfm["monetary"].mean()), 2),
        "avg_purchase_frequency": round(float(rfm["frequency"].mean()), 2),
        "avg_recency_days": round(float(rfm["recency"].mean()), 1),
    }


def seasonal_analysis(df: pd.DataFrame, date_col: str, target_col: str) -> Dict[str, Any]:
    from app.services.data_processor import aggregate_time_series
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")

    monthly = aggregate_time_series(df.copy(), date_col, target_col, freq="M")
    monthly = monthly.rename(columns={"ds": date_col, "y": target_col})
    monthly["month"] = pd.to_datetime(monthly[date_col]).dt.month
    monthly_avg = monthly.groupby("month")[target_col].mean().to_dict()

    weekly = aggregate_time_series(df.copy(), date_col, target_col, freq="W")
    weekly = weekly.rename(columns={"ds": date_col, "y": target_col})
    weekly["dow"] = pd.to_datetime(weekly[date_col]).dt.dayofweek
    daily_avg = weekly.groupby("dow")[target_col].mean().to_dict()
    day_names = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
    daily_avg_named = {day_names.get(k, k): v for k, v in daily_avg.items()}

    return {
        "monthly_seasonality": {str(k): round(float(v), 2) for k, v in monthly_avg.items()},
        "day_of_week_pattern": {k: round(float(v), 2) for k, v in daily_avg_named.items()},
        "peak_month": max(monthly_avg, key=monthly_avg.get) if monthly_avg else None,
        "peak_day": max(daily_avg_named, key=daily_avg_named.get) if daily_avg_named else None,
    }


def _find_col(df: pd.DataFrame, keywords: List[str]) -> Optional[str]:
    for kw in keywords:
        for col in df.columns:
            if kw.lower() in col.lower():
                return col
    return None
