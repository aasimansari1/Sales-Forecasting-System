"""
Generate realistic retail sales sample data for testing the Sales Forecasting System.
Run: python generate_sample_data.py
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

np.random.seed(42)
random.seed(42)

PRODUCTS = [
    ("PROD001", "iPhone 15 Pro", "Electronics", 999, 650),
    ("PROD002", "Samsung Galaxy S24", "Electronics", 799, 520),
    ("PROD003", "MacBook Air M3", "Electronics", 1299, 900),
    ("PROD004", "Sony WH-1000XM5", "Electronics", 349, 180),
    ("PROD005", "Nike Air Max", "Footwear", 129, 55),
    ("PROD006", "Adidas Ultraboost", "Footwear", 189, 80),
    ("PROD007", "Levi's 501 Jeans", "Apparel", 89, 35),
    ("PROD008", "North Face Jacket", "Apparel", 249, 110),
    ("PROD009", "KitchenAid Mixer", "Home & Kitchen", 449, 220),
    ("PROD010", "Instant Pot", "Home & Kitchen", 99, 45),
    ("PROD011", "Harry Potter Box Set", "Books", 89, 28),
    ("PROD012", "Atomic Habits", "Books", 18, 6),
    ("PROD013", "Yoga Mat Premium", "Sports", 79, 25),
    ("PROD014", "Protein Powder 5lb", "Health", 59, 22),
    ("PROD015", "AirPods Pro 2", "Electronics", 249, 140),
]

REGIONS = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"]
STORES = [f"STORE_{i:03d}" for i in range(1, 21)]
CUSTOMERS = [f"CUST_{i:05d}" for i in range(1, 2001)]

def get_seasonal_multiplier(date):
    month = date.month
    day_of_week = date.weekday()
    base = 1.0
    # Holiday season
    if month == 12: base *= 2.5
    elif month == 11: base *= 1.8
    elif month in [6, 7]: base *= 1.3
    elif month in [1, 2]: base *= 0.7
    # Weekend boost
    if day_of_week >= 5: base *= 1.3
    return base

def get_trend_multiplier(date, start_date):
    days = (date - start_date).days
    return 1.0 + 0.001 * days + 0.0001 * np.sin(days / 365 * 2 * np.pi)

start_date = datetime(2021, 1, 1)
end_date = datetime(2024, 6, 30)
num_days = (end_date - start_date).days

records = []
for day_offset in range(num_days):
    date = start_date + timedelta(days=day_offset)
    seasonal = get_seasonal_multiplier(date)
    trend = get_trend_multiplier(date, start_date)

    daily_orders = int(np.random.poisson(80 * seasonal * trend))

    for _ in range(daily_orders):
        product = random.choice(PRODUCTS)
        region = random.choices(REGIONS, weights=[40, 25, 20, 10, 5])[0]
        store = random.choice(STORES)
        customer = random.choice(CUSTOMERS)

        qty = max(1, int(np.random.lognormal(0.5, 0.7)))
        unit_price = product[3] * np.random.uniform(0.85, 1.15)
        unit_cost = product[4] * np.random.uniform(0.95, 1.05)
        revenue = qty * unit_price
        cost = qty * unit_cost
        profit = revenue - cost

        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "product_id": product[0],
            "product_name": product[1],
            "category": product[2],
            "region": region,
            "store_id": store,
            "customer_id": customer,
            "quantity": qty,
            "unit_price": round(unit_price, 2),
            "revenue": round(revenue, 2),
            "cost": round(cost, 2),
            "profit": round(profit, 2),
        })

df = pd.DataFrame(records)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

output_path = "sample_retail_sales.csv"
df.to_csv(output_path, index=False)

print(f"Generated {len(df):,} sales records")
print(f"Date range: {df['date'].min()} to {df['date'].max()}")
print(f"Total revenue: ${df['revenue'].sum():,.0f}")
print(f"Total profit: ${df['profit'].sum():,.0f}")
print(f"Unique products: {df['product_id'].nunique()}")
print(f"Unique customers: {df['customer_id'].nunique()}")
print(f"Saved to: {output_path}")
