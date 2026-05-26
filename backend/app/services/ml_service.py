import warnings
import joblib
import os
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timedelta

warnings.filterwarnings("ignore")

from app.config import settings
from app.services.data_processor import (
    engineer_features, aggregate_time_series, create_lag_features, parse_date_column
)


def evaluate_predictions(y_true, y_pred) -> Dict[str, float]:
    import numpy as np
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))
    mape = float(np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100)
    return {"mae": round(mae, 4), "rmse": round(rmse, 4), "r2": round(r2, 4), "mape": round(mape, 4)}


def prepare_ml_data(df, date_col: str, target_col: str) -> Tuple[Any, List[str]]:
    import pandas as pd
    df = parse_date_column(df.copy(), date_col)
    ts = aggregate_time_series(df, date_col, target_col, freq="D")
    ts = ts.rename(columns={"ds": date_col, "y": target_col})
    ts = engineer_features(ts, date_col)
    ts = create_lag_features(ts, target_col, lags=[1, 7, 14, 30])

    feature_cols = [c for c in ts.columns if c not in [date_col, target_col]]
    return ts, feature_cols


def train_linear_regression(
    df, date_col: str, target_col: str, forecast_horizon: int = 30
) -> Dict[str, Any]:
    import numpy as np
    from sklearn.linear_model import Ridge
    from sklearn.preprocessing import StandardScaler

    ts, feature_cols = prepare_ml_data(df, date_col, target_col)

    X = ts[feature_cols].values
    y = ts[target_col].values

    split = int(len(ts) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    model = Ridge(alpha=1.0)
    model.fit(X_train_s, y_train)
    y_pred = model.predict(X_test_s)

    metrics = evaluate_predictions(y_test, y_pred)

    feature_importance = dict(zip(feature_cols, np.abs(model.coef_).tolist()))
    top_features = dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:10])

    future_preds = _generate_future_linear(model, scaler, ts, date_col, target_col, feature_cols, forecast_horizon)

    test_dates = ts[date_col].iloc[split:].dt.strftime("%Y-%m-%d").tolist()
    historical_preds = [
        {"date": d, "predicted": float(p), "actual": float(a), "is_future": False}
        for d, p, a in zip(test_dates, y_pred.tolist(), y_test.tolist())
    ]

    model_path = os.path.join(settings.MODELS_DIR, f"linear_{datetime.now().strftime('%Y%m%d%H%M%S')}.pkl")
    joblib.dump({"model": model, "scaler": scaler, "features": feature_cols}, model_path)

    return {
        "model_type": "linear",
        "metrics": metrics,
        "feature_importance": top_features,
        "historical_predictions": historical_preds,
        "future_predictions": future_preds,
        "model_path": model_path,
    }


def _generate_future_linear(model, scaler, ts, date_col, target_col, feature_cols, horizon):
    import pandas as pd
    import numpy as np
    last_date = pd.to_datetime(ts[date_col].max())
    future_dates = [last_date + timedelta(days=i + 1) for i in range(horizon)]
    future_df = pd.DataFrame({date_col: future_dates})

    last_values = ts[target_col].tolist()

    predictions = []
    for fd in future_dates:
        row = pd.DataFrame({date_col: [fd]})
        row = engineer_features(row, date_col)
        for lag in [1, 7, 14, 30]:
            idx = -lag
            row[f"lag_{lag}"] = last_values[idx] if abs(idx) <= len(last_values) else np.mean(last_values[-30:])
        for window in [7, 14, 30]:
            row[f"rolling_mean_{window}"] = np.mean(last_values[-window:])
            row[f"rolling_std_{window}"] = np.std(last_values[-window:]) if len(last_values) >= window else 0

        X_row = row[feature_cols].values if all(c in row.columns for c in feature_cols) else np.zeros((1, len(feature_cols)))
        missing = [c for c in feature_cols if c not in row.columns]
        if missing:
            for mc in missing:
                row[mc] = 0
            X_row = row[feature_cols].values

        X_scaled = scaler.transform(X_row)
        pred = float(model.predict(X_scaled)[0])
        pred = max(0, pred)
        last_values.append(pred)
        std = float(np.std(last_values[-30:])) if len(last_values) >= 30 else pred * 0.1
        predictions.append({
            "date": fd.strftime("%Y-%m-%d"),
            "predicted": pred,
            "lower_bound": max(0, pred - 1.96 * std),
            "upper_bound": pred + 1.96 * std,
            "is_future": True,
        })

    return predictions


def train_xgboost(
    df, date_col: str, target_col: str, forecast_horizon: int = 30
) -> Dict[str, Any]:
    import numpy as np
    import xgboost as xgb
    ts, feature_cols = prepare_ml_data(df, date_col, target_col)

    X = ts[feature_cols].values
    y = ts[target_col].values

    split = int(len(ts) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = xgb.XGBRegressor(
        n_estimators=300, learning_rate=0.05, max_depth=6,
        subsample=0.8, colsample_bytree=0.8, random_state=42,
        early_stopping_rounds=20, eval_metric="rmse", verbosity=0,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    y_pred = model.predict(X_test)

    metrics = evaluate_predictions(y_test, y_pred)

    importance = model.feature_importances_
    feature_importance = dict(zip(feature_cols, importance.tolist()))
    top_features = dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:10])

    future_preds = _generate_future_xgb(model, ts, date_col, target_col, feature_cols, forecast_horizon)

    test_dates = ts[date_col].iloc[split:].dt.strftime("%Y-%m-%d").tolist()
    historical_preds = [
        {"date": d, "predicted": float(p), "actual": float(a), "is_future": False}
        for d, p, a in zip(test_dates, y_pred.tolist(), y_test.tolist())
    ]

    return {
        "model_type": "xgboost",
        "metrics": metrics,
        "feature_importance": top_features,
        "historical_predictions": historical_preds,
        "future_predictions": future_preds,
    }


def _generate_future_xgb(model, ts, date_col, target_col, feature_cols, horizon):
    import pandas as pd
    import numpy as np
    last_date = pd.to_datetime(ts[date_col].max())
    last_values = ts[target_col].tolist()
    predictions = []

    for i in range(horizon):
        fd = last_date + timedelta(days=i + 1)
        row = pd.DataFrame({date_col: [fd]})
        row = engineer_features(row, date_col)
        for lag in [1, 7, 14, 30]:
            idx = -lag
            row[f"lag_{lag}"] = last_values[idx] if abs(idx) <= len(last_values) else np.mean(last_values[-30:])
        for window in [7, 14, 30]:
            row[f"rolling_mean_{window}"] = np.mean(last_values[-window:])
            row[f"rolling_std_{window}"] = np.std(last_values[-window:]) if len(last_values) >= window else 0
        for c in feature_cols:
            if c not in row.columns:
                row[c] = 0

        X_row = row[feature_cols].values
        pred = float(model.predict(X_row)[0])
        pred = max(0, pred)
        last_values.append(pred)
        std = float(np.std(last_values[-30:])) if len(last_values) >= 30 else pred * 0.1
        predictions.append({
            "date": fd.strftime("%Y-%m-%d"),
            "predicted": pred,
            "lower_bound": max(0, pred - 1.96 * std),
            "upper_bound": pred + 1.96 * std,
            "is_future": True,
        })
    return predictions


def train_arima(
    df, date_col: str, target_col: str, forecast_horizon: int = 30
) -> Dict[str, Any]:
    import pandas as pd
    from statsmodels.tsa.arima.model import ARIMA

    ts = aggregate_time_series(df.copy(), date_col, target_col, freq="D")
    ts = ts.rename(columns={"ds": date_col, "y": target_col})
    ts[date_col] = pd.to_datetime(ts[date_col])
    ts = ts.set_index(date_col)

    series = ts[target_col].dropna()
    split = int(len(series) * 0.8)
    train, test = series.iloc[:split], series.iloc[split:]

    try:
        model = ARIMA(train, order=(2, 1, 2))
        fitted = model.fit()
        y_pred = fitted.forecast(steps=len(test))
    except Exception:
        model = ARIMA(train, order=(1, 1, 1))
        fitted = model.fit()
        y_pred = fitted.forecast(steps=len(test))

    y_test = test.values
    metrics = evaluate_predictions(y_test, y_pred.values)

    forecast_result = fitted.get_forecast(steps=len(test) + forecast_horizon)
    forecast_df = forecast_result.summary_frame(alpha=0.05)
    future_dates = forecast_df.index[-forecast_horizon:]
    future_preds = [
        {
            "date": str(d.date()),
            "predicted": max(0, float(forecast_df.loc[d, "mean"])),
            "lower_bound": max(0, float(forecast_df.loc[d, "mean_ci_lower"])),
            "upper_bound": float(forecast_df.loc[d, "mean_ci_upper"]),
            "is_future": True,
        }
        for d in future_dates
    ]

    test_index = test.index.strftime("%Y-%m-%d").tolist()
    historical_preds = [
        {"date": d, "predicted": max(0, float(p)), "actual": float(a), "is_future": False}
        for d, p, a in zip(test_index, y_pred.values.tolist(), y_test.tolist())
    ]

    return {
        "model_type": "arima",
        "metrics": metrics,
        "feature_importance": {},
        "historical_predictions": historical_preds,
        "future_predictions": future_preds,
    }


def train_prophet(
    df, date_col: str, target_col: str, forecast_horizon: int = 30
) -> Dict[str, Any]:
    try:
        from prophet import Prophet
    except ImportError:
        raise ValueError("Prophet is not installed in this environment. Use Linear Regression, XGBoost, or ARIMA instead.")

    import pandas as pd
    ts = aggregate_time_series(df.copy(), date_col, target_col, freq="D")
    # aggregate_time_series already returns 'ds' and 'y' columns
    ts["ds"] = pd.to_datetime(ts["ds"])

    split = int(len(ts) * 0.8)
    train = ts.iloc[:split]
    test = ts.iloc[split:]

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10.0,
        interval_width=0.95,
    )
    model.fit(train)

    future = model.make_future_dataframe(periods=len(test) + forecast_horizon)
    forecast = model.predict(future)

    test_forecast = forecast.iloc[split : split + len(test)]
    y_pred = test_forecast["yhat"].values
    y_test = test["y"].values
    metrics = evaluate_predictions(y_test, y_pred)

    future_forecast = forecast.iloc[-forecast_horizon:]
    future_preds = [
        {
            "date": str(row["ds"].date()),
            "predicted": max(0, float(row["yhat"])),
            "lower_bound": max(0, float(row["yhat_lower"])),
            "upper_bound": float(row["yhat_upper"]),
            "is_future": True,
        }
        for _, row in future_forecast.iterrows()
    ]

    test_dates = test["ds"].dt.strftime("%Y-%m-%d").tolist()
    historical_preds = [
        {"date": d, "predicted": max(0, float(p)), "actual": float(a), "is_future": False}
        for d, p, a in zip(test_dates, y_pred.tolist(), y_test.tolist())
    ]

    components = {
        "trend": float(forecast["trend"].mean()),
        "yearly": "present" if "yearly" in forecast.columns else "absent",
        "weekly": "present" if "weekly" in forecast.columns else "absent",
    }

    return {
        "model_type": "prophet",
        "metrics": metrics,
        "feature_importance": components,
        "historical_predictions": historical_preds,
        "future_predictions": future_preds,
    }


def train_lstm(
    df, date_col: str, target_col: str, forecast_horizon: int = 30
) -> Dict[str, Any]:
    import numpy as np
    import pandas as pd
    from sklearn.preprocessing import StandardScaler
    try:
        import tensorflow as tf
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense, Dropout
        from tensorflow.keras.callbacks import EarlyStopping
    except ImportError:
        raise ValueError("TensorFlow is not available for LSTM training")

    ts = aggregate_time_series(df.copy(), date_col, target_col, freq="D")
    ts = ts.rename(columns={"ds": date_col, "y": target_col})
    series = ts[target_col].values.reshape(-1, 1)

    scaler = StandardScaler()
    scaled = scaler.fit_transform(series)

    SEQ_LEN = 30
    X_seq, y_seq = [], []
    for i in range(SEQ_LEN, len(scaled)):
        X_seq.append(scaled[i - SEQ_LEN:i, 0])
        y_seq.append(scaled[i, 0])
    X_seq, y_seq = np.array(X_seq), np.array(y_seq)
    X_seq = X_seq.reshape(X_seq.shape[0], X_seq.shape[1], 1)

    split = int(len(X_seq) * 0.8)
    X_train, X_test = X_seq[:split], X_seq[split:]
    y_train, y_test = y_seq[:split], y_seq[split:]

    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(SEQ_LEN, 1)),
        Dropout(0.2),
        LSTM(32, return_sequences=False),
        Dropout(0.2),
        Dense(16, activation="relu"),
        Dense(1),
    ])
    model.compile(optimizer="adam", loss="mse")
    early_stop = EarlyStopping(patience=5, restore_best_weights=True)
    model.fit(X_train, y_train, epochs=50, batch_size=32, validation_split=0.1, callbacks=[early_stop], verbose=0)

    y_pred_scaled = model.predict(X_test, verbose=0).flatten()
    y_pred = scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()
    y_true = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()

    metrics = evaluate_predictions(y_true, y_pred)

    last_seq = scaled[-SEQ_LEN:].reshape(1, SEQ_LEN, 1)
    future_preds = []
    last_date = pd.to_datetime(ts[date_col].max())
    all_preds = list(y_true)

    for i in range(forecast_horizon):
        pred_scaled = model.predict(last_seq, verbose=0)[0, 0]
        pred = float(scaler.inverse_transform([[pred_scaled]])[0, 0])
        pred = max(0, pred)
        all_preds.append(pred)
        std = float(np.std(all_preds[-30:])) if len(all_preds) >= 30 else pred * 0.1
        fd = last_date + timedelta(days=i + 1)
        future_preds.append({
            "date": fd.strftime("%Y-%m-%d"),
            "predicted": pred,
            "lower_bound": max(0, pred - 1.96 * std),
            "upper_bound": pred + 1.96 * std,
            "is_future": True,
        })
        new_val = np.array([[[pred_scaled]]])
        last_seq = np.concatenate([last_seq[:, 1:, :], new_val], axis=1)

    test_start = SEQ_LEN + split
    test_dates = ts[date_col].iloc[test_start:test_start + len(y_pred)].dt.strftime("%Y-%m-%d").tolist()
    historical_preds = [
        {"date": d, "predicted": float(p), "actual": float(a), "is_future": False}
        for d, p, a in zip(test_dates, y_pred.tolist(), y_true.tolist())
    ]

    return {
        "model_type": "lstm",
        "metrics": metrics,
        "feature_importance": {},
        "historical_predictions": historical_preds,
        "future_predictions": future_preds,
    }


def train_model(
    df: pd.DataFrame,
    model_type: str,
    date_col: str,
    target_col: str,
    forecast_horizon: int = 30,
    config: Optional[Dict] = None,
) -> Dict[str, Any]:
    trainers = {
        "linear": train_linear_regression,
        "xgboost": train_xgboost,
        "arima": train_arima,
        "prophet": train_prophet,
        "lstm": train_lstm,
    }
    if model_type not in trainers:
        raise ValueError(f"Unknown model type: {model_type}. Available: {list(trainers.keys())}")

    return trainers[model_type](df, date_col, target_col, forecast_horizon)


def compare_models(
    df: pd.DataFrame, date_col: str, target_col: str, models: List[str], horizon: int = 30
) -> Dict[str, Any]:
    results = []
    best_rmse = float("inf")
    best_model = None

    for m in models:
        try:
            res = train_model(df, m, date_col, target_col, horizon)
            results.append({
                "model": m,
                "metrics": res["metrics"],
                "status": "success",
            })
            if res["metrics"]["rmse"] < best_rmse:
                best_rmse = res["metrics"]["rmse"]
                best_model = m
        except Exception as e:
            results.append({"model": m, "metrics": None, "status": "failed", "error": str(e)})

    return {"results": results, "best_model": best_model or models[0]}


def detect_anomalies(df, date_col: str, target_col: str) -> List[Dict[str, Any]]:
    import numpy as np
    from sklearn.ensemble import IsolationForest
    ts = aggregate_time_series(df.copy(), date_col, target_col, freq="D")
    ts = ts.rename(columns={"ds": date_col, "y": target_col})

    values = ts[target_col].values.reshape(-1, 1)
    iso = IsolationForest(contamination=0.05, random_state=42)
    labels = iso.fit_predict(values)
    scores = iso.decision_function(values)

    mean_val = float(np.mean(values))
    std_val = float(np.std(values))

    anomalies = []
    for i, (_, row) in enumerate(ts.iterrows()):
        is_anomaly = labels[i] == -1
        val = float(row[target_col])
        diff = abs(val - mean_val)
        desc = None
        if is_anomaly:
            if val > mean_val + 2 * std_val:
                desc = f"Unusually high sales: {val:.0f} (avg: {mean_val:.0f})"
            else:
                desc = f"Unusually low sales: {val:.0f} (avg: {mean_val:.0f})"
        anomalies.append({
            "date": str(row[date_col].date()) if hasattr(row[date_col], "date") else str(row[date_col]),
            "value": val,
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": float(abs(scores[i])),
            "description": desc,
        })

    return anomalies


def generate_ai_insights(metrics: Dict[str, Any], df, date_col: str, target_col: str) -> List[str]:
    import pandas as pd
    insights = []

    ts = aggregate_time_series(df.copy(), date_col, target_col, freq="M")
    ts = ts.rename(columns={"ds": date_col, "y": target_col})
    if len(ts) >= 2:
        growth = (ts[target_col].iloc[-1] - ts[target_col].iloc[-2]) / (ts[target_col].iloc[-2] + 1e-8) * 100
        if growth > 10:
            insights.append(f"Strong month-over-month growth of {growth:.1f}% — consider scaling inventory.")
        elif growth < -10:
            insights.append(f"Revenue declined {abs(growth):.1f}% MoM — review pricing and promotions.")

    daily = aggregate_time_series(df.copy(), date_col, target_col, freq="D")
    daily = daily.rename(columns={"ds": date_col, "y": target_col})
    daily["dow"] = pd.to_datetime(daily[date_col]).dt.day_name()
    dow_avg = daily.groupby("dow")[target_col].mean()
    if len(dow_avg):
        best_day = dow_avg.idxmax()
        worst_day = dow_avg.idxmin()
        insights.append(f"{best_day} is your highest-performing day — optimize staffing and stock accordingly.")
        insights.append(f"{worst_day} shows lowest sales — consider targeted promotions on this day.")

    if len(ts) >= 12:
        q_data = ts[target_col].values
        q1, q3, q4 = q_data[0:3].mean(), q_data[6:9].mean() if len(q_data) > 8 else q_data[-1], q_data[-3:].mean()
        if q4 > q3 * 1.1:
            insights.append("Q4 shows strong seasonality — prepare 10-15% extra inventory for year-end.")

    if metrics.get("r2", 0) > 0.85:
        insights.append("High forecast accuracy (R²>{:.2f}) — rely on these predictions for procurement decisions.".format(metrics["r2"]))
    elif metrics.get("r2", 0) < 0.5:
        insights.append("Forecast accuracy is moderate — consider collecting more feature-rich data for improvement.")

    if metrics.get("mape", 100) < 10:
        insights.append("MAPE under 10% indicates excellent forecast reliability for operational planning.")

    return insights
