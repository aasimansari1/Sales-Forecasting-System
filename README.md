<div align="center">
  <img src="docs/screenshots/login.png" alt="SalesCast AI" width="480" />

  <h1>SalesCast AI — Sales Forecasting System</h1>

  <p>
    An AI-powered, full-stack sales forecasting platform with five ML models,<br/>
    interactive analytics, anomaly detection, inventory management, and RFM customer segmentation.
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square" />
    <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white&style=flat-square" />
    <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white&style=flat-square" />
    <img src="https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white&style=flat-square" />
    <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white&style=flat-square" />
    <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square" />
  </p>

  <p>
    <a href="https://dose-linda-earliest-leon.trycloudflare.com" target="_blank">
      <img src="https://img.shields.io/badge/Live%20Demo-Visit%20App-4F46E5?style=for-the-badge&logo=googlechrome&logoColor=white" />
    </a>
  </p>

  <p><strong>Demo credentials:</strong> <code>admin@salesforecast.ai</code> / <code>admin123</code></p>
</div>

---

## Screenshots

### Dashboard
> Real-time KPIs, monthly revenue trends, category breakdown, and regional sales.

![Dashboard](docs/screenshots/dashboard.png)

---

### Sales Forecasting
> Choose from 5 ML models, configure horizon & target column, and run background training jobs.

![Forecast](docs/screenshots/forecast.png)

---

### Advanced Analytics
> Monthly seasonality bars, day-of-week radar, Isolation Forest anomaly detection table.

![Analytics](docs/screenshots/analytics.png)

---

### Inventory Management
> Demand-based reorder alerts with safety stock, reorder points, and recommended order quantities.

![Inventory](docs/screenshots/inventory.png)

---

### Customer Analytics (RFM)
> RFM segmentation — Champions, Loyal, At Risk, and Churned — with lifetime value stats.

![Customers](docs/screenshots/customers.png)

---

### Reports & Exports
> Executive summary, model performance comparison table, and one-click CSV export.

![Reports](docs/screenshots/reports.png)

---

### Data Upload
> Drag-and-drop CSV/XLSX upload with auto column detection and dataset management.

![Upload](docs/screenshots/upload.png)

---

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Revenue, profit, orders, AOV, monthly trend chart, category donut, regional bar |
| **Forecasting** | Train Linear Regression, XGBoost, ARIMA, Prophet, or LSTM; poll job status; view predictions |
| **Analytics** | Seasonality patterns, anomaly detection (Isolation Forest), day-of-week radar |
| **Inventory** | Safety stock & reorder point calculation, demand-based order recommendations |
| **Customers** | RFM scoring with quartile binning; segment pie + detail cards |
| **Reports** | Executive summary, model metrics table (RMSE, MAE, R², MAPE), CSV export |
| **Data Upload** | Async file upload, column detection, multi-dataset support |

---

## ML Models

| Model | Best for | Notes |
|---|---|---|
| **Linear Regression** | Fast baseline | Ridge regularisation, cyclical + lag features |
| **XGBoost** | Tabular accuracy | Feature importance, handles non-linearity well |
| **ARIMA** | Stationary series | Auto ARIMA(2,1,2), classical time-series |
| **Prophet** | Trend + seasonality | Meta's Prophet, handles holidays & changepoints |
| **LSTM** | Complex patterns | TensorFlow/Keras, 30-day lookback window, CPU |

---

## Tech Stack

```
Frontend   React 18 · Vite 5 · Tailwind CSS 3 · Recharts · React Query · react-hot-toast
Backend    FastAPI · SQLAlchemy (async) · asyncpg · Pydantic v2 · python-jose (JWT)
ML         Pandas · Scikit-learn · XGBoost · Prophet · TensorFlow-CPU · Statsmodels
Database   PostgreSQL 15 (asyncpg driver)
Infra      Docker · docker-compose · Nginx (reverse proxy)
```

---

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/aasimansari1/Sales-Forecasting-System.git
cd Sales-Forecasting-System
cp backend/.env.example backend/.env   # edit DATABASE_URL if needed
docker-compose up --build
```

Open **http://localhost** — API docs at **http://localhost/docs**

### Local Dev

**Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                   # edit DATABASE_URL
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                            # http://localhost:5173
```

**Sample data**
```bash
cd data
python3 generate_sample_data.py        # generates 211k-row sample_retail_sales.csv
```
Upload the CSV via the **Data Upload** page to start forecasting.

---

## Default Credentials

| Field | Value |
|---|---|
| Email | `admin@salesforecast.ai` |
| Password | `admin123` |

---

## Expected CSV Format

| Column | Description |
|---|---|
| `date` | Transaction date (YYYY-MM-DD) |
| `revenue` / `sales` | Revenue amount |
| `product_name` / `product_id` | Product identifier |
| `category` | Product category |
| `region` | Geographic region |
| `store_id` | Store identifier |
| `customer_id` | Customer ID (used for RFM) |
| `quantity` | Units sold |
| `profit` / `cost` | Optional |

---

## Project Structure

```
sales-forecasting/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── routes/              # auth, upload, forecast, analytics
│   │   ├── services/            # ml_service, analytics_service, data_processor
│   │   ├── models/              # SQLAlchemy ORM models
│   │   └── utils/               # JWT auth helpers
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/               # Dashboard, Forecast, Analytics, Inventory, Customers, Reports
│   │   ├── components/          # Sidebar, Charts, MetricCard, FileUpload
│   │   ├── context/             # AuthContext (JWT + user state)
│   │   └── services/            # Axios API client
│   ├── vite.config.js
│   └── Dockerfile
├── data/
│   └── generate_sample_data.py  # Generates 211k retail sales records (2021–2024)
├── nginx/
│   └── nginx.conf               # Reverse proxy: /api → backend, /* → frontend
├── docs/screenshots/            # App screenshots
└── docker-compose.yml
```

---

## License

MIT
