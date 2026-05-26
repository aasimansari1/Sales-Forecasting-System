# SalesCast AI — Sales Forecasting System

AI-powered sales forecasting and analytics platform for retail businesses.

## Features

- **Dashboard**: Revenue, profit, orders, trends, and top/low-performing products
- **Forecasting**: Linear Regression, XGBoost, ARIMA, Prophet, LSTM neural networks
- **Analytics**: Seasonality, anomaly detection, day-of-week patterns
- **Inventory**: Smart reorder alerts with safety stock & demand-based recommendations
- **Customers**: RFM segmentation (Champions, Loyal, At Risk, Churned)
- **Reports**: Executive summary with CSV export

## Quick Start (Docker)

```bash
git clone <repo>
cd sales-forecasting
cp backend/.env.example backend/.env
docker-compose up --build
```

Open http://localhost — login with `admin@salesforecast.ai` / `admin123`

API docs: http://localhost/docs

## Quick Start (Local Dev)

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Edit DATABASE_URL to your local Postgres
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## Sample Data

```bash
cd data
python3 generate_sample_data.py
# Generates sample_retail_sales.csv with 211k records (2021–2024)
```

Upload it via the Data Upload page to test forecasting.

## Expected CSV Format

| Column | Description |
|--------|-------------|
| `date` | Transaction date (YYYY-MM-DD) |
| `revenue` / `sales` | Revenue amount |
| `product_name` | Product name |
| `category` | Product category |
| `region` | Geographic region |
| `store_id` | Store identifier |
| `customer_id` | Customer ID (for RFM) |
| `quantity` | Units sold |
| `profit` / `cost` | Optional profit/cost columns |

## ML Models

| Model | Strengths |
|-------|-----------|
| Linear Regression | Fast, interpretable, good baseline |
| XGBoost | Best for tabular data with feature importance |
| ARIMA | Classical time series, good for stationary data |
| Prophet | Handles seasonality, holidays, trend changes |
| LSTM | Complex temporal patterns, long-term dependencies |

## Architecture

```
nginx (port 80)
  ├── /api/* → FastAPI backend (port 8000)
  └── /* → React frontend (port 3000)

Backend: FastAPI + SQLAlchemy + PostgreSQL
Frontend: React 18 + Vite + Tailwind CSS + Recharts
ML: Pandas, Scikit-learn, XGBoost, Prophet, TensorFlow
```

## Default Credentials

- Email: `admin@salesforecast.ai`
- Password: `admin123`
