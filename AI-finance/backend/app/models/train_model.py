"""Reproducible machine learning training pipeline for FinMind AI Pro."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    IsolationForest,
    RandomForestClassifier,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import accuracy_score, mean_squared_error, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _prepare_base_dataframe(dataset_path: Path) -> pd.DataFrame:
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    df = pd.read_csv(dataset_path)
    if "amount" not in df.columns:
        raise ValueError("Dataset must include an 'amount' column")

    # Handle missing values and normalize data types.
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
    else:
        df["date"] = pd.date_range(start="2025-01-01", periods=len(df), freq="D")

    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    if "account_balance" in df.columns:
        df["account_balance"] = pd.to_numeric(df["account_balance"], errors="coerce")
    else:
        df["account_balance"] = np.nan

    if "category" not in df.columns:
        df["category"] = "Unknown"
    if "transaction_type" not in df.columns:
        df["transaction_type"] = "debit"
    if "description" not in df.columns:
        df["description"] = "unknown"
    if "monthly_budget" not in df.columns:
        df["monthly_budget"] = np.nan
    if "income" not in df.columns:
        df["income"] = np.nan
    if "savings" not in df.columns:
        df["savings"] = np.nan
    if "investment" not in df.columns:
        df["investment"] = np.nan
    if "is_anomaly" not in df.columns:
        df["is_anomaly"] = 0
    if "location" not in df.columns:
        df["location"] = "Unknown"

    df["category"] = df["category"].fillna("Unknown").astype(str)
    df["transaction_type"] = df["transaction_type"].fillna("debit").astype(str)
    df["description"] = df["description"].fillna("unknown").astype(str)
    df["location"] = df["location"].fillna("Unknown").astype(str)

    # Rich temporal signals for all tasks.
    df["month"] = df["date"].dt.month.fillna(1).astype(int)
    df["day"] = df["date"].dt.day.fillna(1).astype(int)
    df["is_weekend"] = (df["date"].dt.weekday.fillna(0).astype(int) >= 5).astype(int)

    # Fill remaining numeric missing values with robust medians.
    df["amount"] = df["amount"].fillna(df["amount"].median())
    if df["account_balance"].isna().all():
        df["account_balance"] = (df["amount"] * 5.0).clip(lower=100.0)
    else:
        df["account_balance"] = df["account_balance"].fillna(df["account_balance"].median())

    for col in ["monthly_budget", "income", "savings", "investment", "is_anomaly"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    if df["income"].isna().all():
        df["income"] = np.maximum(df["account_balance"] * 0.25, 1000.0)
    else:
        df["income"] = df["income"].fillna(df["income"].median())

    if df["monthly_budget"].isna().all():
        df["monthly_budget"] = np.maximum(df["income"] * 0.75, 500.0)
    else:
        df["monthly_budget"] = df["monthly_budget"].fillna(df["monthly_budget"].median())

    if df["savings"].isna().all():
        df["savings"] = np.maximum(df["income"] * 0.18, 0.0)
    else:
        df["savings"] = df["savings"].fillna(df["savings"].median())

    if df["investment"].isna().all():
        df["investment"] = np.maximum(df["income"] * 0.10, 0.0)
    else:
        df["investment"] = df["investment"].fillna(df["investment"].median())

    df["is_anomaly"] = df["is_anomaly"].fillna(0).astype(int).clip(lower=0, upper=1)

    return df


def _build_preprocessor(
    numeric_features: list[str],
    categorical_features: list[str],
) -> ColumnTransformer:
    numeric_pipeline = Pipeline(
        steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    transformers: list[tuple[str, Pipeline, list[str]]] = []
    if numeric_features:
        transformers.append(("num", numeric_pipeline, numeric_features))
    if categorical_features:
        transformers.append(("cat", categorical_pipeline, categorical_features))
    return ColumnTransformer(transformers=transformers)


def _ensure_min_rows(df: pd.DataFrame, min_rows: int = 60) -> pd.DataFrame:
    """Augment tiny datasets with low-noise synthetic samples for stable splits."""
    if len(df) >= min_rows:
        return df.copy()

    rng = np.random.default_rng(RANDOM_STATE)
    repeats = int(np.ceil(min_rows / max(len(df), 1)))
    expanded = pd.concat([df] * repeats, ignore_index=True)
    expanded = expanded.iloc[:min_rows].copy()

    noise = rng.normal(loc=0.0, scale=0.04, size=len(expanded))
    expanded["amount"] = (expanded["amount"] * (1.0 + noise)).clip(lower=0.5)
    expanded["account_balance"] = (
        expanded["account_balance"] * (1.0 + rng.normal(0.0, 0.03, size=len(expanded)))
    ).clip(lower=20.0)

    start_date = expanded["date"].min()
    expanded["date"] = pd.date_range(start=start_date, periods=len(expanded), freq="D")
    expanded["month"] = expanded["date"].dt.month.astype(int)
    expanded["day"] = expanded["date"].dt.day.astype(int)
    expanded["is_weekend"] = (expanded["date"].dt.weekday.astype(int) >= 5).astype(int)
    return expanded


def _train_transaction_classifier(df: pd.DataFrame) -> tuple[Pipeline, dict[str, float]]:
    data = _ensure_min_rows(df)
    x = data[["amount", "account_balance", "month", "day", "is_weekend", "transaction_type", "description"]]
    y = data["category"].astype(str)

    num_features = ["amount", "account_balance", "month", "day", "is_weekend"]
    cat_features = ["transaction_type", "description"]

    preprocessor = _build_preprocessor(num_features, cat_features)
    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                RandomForestClassifier(n_estimators=250, random_state=RANDOM_STATE, class_weight="balanced"),
            ),
        ]
    )

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y if y.nunique() > 1 else None,
    )

    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    metrics = {
        "accuracy": float(accuracy_score(y_test, pred)),
        "precision": float(precision_score(y_test, pred, average="weighted", zero_division=0)),
        "recall": float(recall_score(y_test, pred, average="weighted", zero_division=0)),
    }
    return model, metrics


def _build_proxy_anomaly_labels(df: pd.DataFrame) -> np.ndarray:
    q1 = df["amount"].quantile(0.25)
    q3 = df["amount"].quantile(0.75)
    iqr = q3 - q1
    upper_bound = q3 + 1.5 * iqr

    low_balance = df["account_balance"] < df["amount"]
    amount_outlier = df["amount"] > upper_bound
    labels = (low_balance | amount_outlier).astype(int)
    return labels.to_numpy()


def _train_anomaly_detector(df: pd.DataFrame) -> tuple[Pipeline, dict[str, float]]:
    data = _ensure_min_rows(df)
    x = data[["amount", "account_balance", "month", "day", "is_weekend", "transaction_type", "category"]]
    y_proxy = _build_proxy_anomaly_labels(data)

    num_features = ["amount", "account_balance", "month", "day", "is_weekend"]
    cat_features = ["transaction_type", "category"]
    preprocessor = _build_preprocessor(num_features, cat_features)

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("detector", IsolationForest(contamination=0.1, random_state=RANDOM_STATE)),
        ]
    )

    x_train, x_test, _, y_test = train_test_split(
        x, y_proxy, test_size=0.2, random_state=RANDOM_STATE
    )
    model.fit(x_train)

    raw_pred = model.predict(x_test)
    pred = np.where(raw_pred == -1, 1, 0)
    metrics = {
        "precision": float(precision_score(y_test, pred, zero_division=0)),
        "recall": float(recall_score(y_test, pred, zero_division=0)),
    }
    return model, metrics


def _compute_financial_score_targets(df: pd.DataFrame) -> np.ndarray:
    income = np.where(df["transaction_type"].str.lower() == "credit", df["amount"], df["account_balance"] * 0.08)
    spending = np.where(df["transaction_type"].str.lower() == "debit", df["amount"], df["amount"] * 0.25)
    savings = np.clip(income - spending, 0.0, None)
    investment_ratio = np.where(df["category"].str.lower() == "investment", 0.35, 0.08)
    anomalies = _build_proxy_anomaly_labels(df)

    spending_ratio = np.divide(spending, np.maximum(income, 1.0))
    savings_rate = np.divide(savings, np.maximum(income, 1.0))

    score = (
        100.0
        - np.minimum(55.0, spending_ratio * 55.0)
        - np.minimum(20.0, anomalies * 5.0)
        + np.minimum(25.0, savings_rate * 40.0)
        + np.minimum(15.0, investment_ratio * 35.0)
    )
    return np.clip(score, 0.0, 100.0)


def _train_financial_score_model(df: pd.DataFrame) -> tuple[Pipeline, dict[str, float]]:
    data = _ensure_min_rows(df)
    target = _compute_financial_score_targets(data)

    x = data[["amount", "account_balance", "month", "day", "is_weekend", "transaction_type", "category"]]

    num_features = ["amount", "account_balance", "month", "day", "is_weekend"]
    cat_features = ["transaction_type", "category"]
    preprocessor = _build_preprocessor(num_features, cat_features)

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", GradientBoostingRegressor(random_state=RANDOM_STATE)),
        ]
    )

    x_train, x_test, y_train, y_test = train_test_split(
        x, target, test_size=0.2, random_state=RANDOM_STATE
    )
    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
    return model, {"rmse": rmse}


def _build_expense_supervised_table(df: pd.DataFrame) -> pd.DataFrame:
    monthly_expense = (
        df.assign(
            expense_amount=np.where(
                df["transaction_type"].str.lower() == "debit", df["amount"], 0.0
            )
        )
        .set_index("date")
        .resample("ME")["expense_amount"]
        .sum()
        .astype(float)
    )

    if len(monthly_expense) < 8:
        last_value = float(monthly_expense.iloc[-1]) if len(monthly_expense) else 500.0
        missing = 8 - len(monthly_expense)
        synthetic_index = pd.date_range(
            start=(monthly_expense.index.max() + pd.offsets.MonthEnd(1))
            if len(monthly_expense)
            else pd.Timestamp("2025-01-31"),
            periods=missing,
            freq="ME",
        )
        synthetic_values = [last_value * (1 + 0.02 * i) for i in range(1, missing + 1)]
        monthly_expense = pd.concat(
            [monthly_expense, pd.Series(synthetic_values, index=synthetic_index)],
            axis=0,
        )

    table = pd.DataFrame({"expense": monthly_expense.values})
    table["month_index"] = np.arange(1, len(table) + 1)
    table["lag_1"] = table["expense"].shift(1)
    table["lag_2"] = table["expense"].shift(2)
    table["lag_3"] = table["expense"].shift(3)
    table = table.dropna().reset_index(drop=True)
    return table


def _train_expense_predictor(df: pd.DataFrame) -> tuple[Pipeline, dict[str, float]]:
    table = _build_expense_supervised_table(df)
    x = table[["month_index", "lag_1", "lag_2", "lag_3"]]
    y = table["expense"]

    preprocessor = _build_preprocessor(
        numeric_features=["month_index", "lag_1", "lag_2", "lag_3"],
        categorical_features=[],
    )
    model = Pipeline(
        steps=[("preprocessor", preprocessor), ("regressor", LinearRegression())]
    )

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=RANDOM_STATE
    )
    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
    return model, {"rmse": rmse}


def _train_debt_risk_classifier(df: pd.DataFrame) -> tuple[Pipeline, dict[str, float]]:
    """Predict probability that user enters debt within 3 months."""
    data = _ensure_min_rows(df)
    debit_flag = (data["transaction_type"].str.lower() == "debit").astype(int)
    spending_amount = data["amount"] * debit_flag

    spending_to_income = np.divide(spending_amount, np.maximum(data["income"], 1.0))
    budget_pressure = np.divide(spending_amount, np.maximum(data["monthly_budget"], 1.0))
    safety_buffer = np.divide(
        data["savings"] + data["investment"],
        np.maximum(data["income"], 1.0),
    )

    proxy_score = (
        1.45 * budget_pressure
        + 0.95 * spending_to_income
        + 0.75 * np.maximum(0.0, 1.0 - safety_buffer)
        + 0.8 * data["is_anomaly"].astype(float)
    )
    risk_threshold = float(np.quantile(proxy_score, 0.62))
    y = (proxy_score > risk_threshold).astype(int)

    x = pd.DataFrame(
        {
            "amount": data["amount"],
            "income": data["income"],
            "monthly_budget": data["monthly_budget"],
            "savings": data["savings"],
            "investment": data["investment"],
            "spending_to_income": spending_to_income,
            "budget_pressure": budget_pressure,
            "is_anomaly": data["is_anomaly"],
            "transaction_type": data["transaction_type"],
            "category": data["category"],
            "location": data["location"],
        }
    )

    num_features = [
        "amount",
        "income",
        "monthly_budget",
        "savings",
        "investment",
        "spending_to_income",
        "budget_pressure",
        "is_anomaly",
    ]
    cat_features = ["transaction_type", "category", "location"]

    preprocessor = _build_preprocessor(num_features, cat_features)
    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", GradientBoostingClassifier(random_state=RANDOM_STATE)),
        ]
    )

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y if y.nunique() > 1 else None,
    )

    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    metrics = {
        "accuracy": float(accuracy_score(y_test, pred)),
        "precision": float(precision_score(y_test, pred, zero_division=0)),
        "recall": float(recall_score(y_test, pred, zero_division=0)),
    }
    return model, metrics


def train_all_models(
    dataset_path: Optional[str] = None,
    output_dir: Optional[str] = None,
) -> dict[str, Any]:
    """Train, evaluate, and save all FinMind AI Pro machine learning models."""
    root = _project_root()
    data_path = Path(dataset_path) if dataset_path else root / "dataset" / "transactions.csv"
    model_dir = Path(output_dir) if output_dir else root / "models"
    model_dir.mkdir(parents=True, exist_ok=True)

    df = _prepare_base_dataframe(data_path)

    classifier, cls_metrics = _train_transaction_classifier(df)
    anomaly_detector, anomaly_metrics = _train_anomaly_detector(df)
    financial_score_model, financial_metrics = _train_financial_score_model(df)
    expense_predictor, expense_metrics = _train_expense_predictor(df)
    debt_risk_predictor, debt_risk_metrics = _train_debt_risk_classifier(df)

    classifier_path = model_dir / "transaction_classifier.pkl"
    anomaly_path = model_dir / "anomaly_detector.pkl"
    expense_path = model_dir / "expense_predictor.pkl"
    financial_path = model_dir / "financial_score_model.pkl"
    debt_risk_path = model_dir / "debt_risk_predictor.pkl"

    joblib.dump(classifier, classifier_path)
    joblib.dump(anomaly_detector, anomaly_path)
    joblib.dump(expense_predictor, expense_path)
    joblib.dump(financial_score_model, financial_path)
    joblib.dump(debt_risk_predictor, debt_risk_path)

    return {
        "dataset": str(data_path),
        "models_saved": {
            "transaction_classifier": str(classifier_path),
            "anomaly_detector": str(anomaly_path),
            "expense_predictor": str(expense_path),
            "financial_score_model": str(financial_path),
            "debt_risk_predictor": str(debt_risk_path),
        },
        "metrics": {
            "transaction_classification": cls_metrics,
            "anomaly_detection": anomaly_metrics,
            "expense_forecasting": expense_metrics,
            "financial_score_prediction": financial_metrics,
            "debt_risk_prediction": debt_risk_metrics,
        },
        "reproducibility": {
            "random_state": RANDOM_STATE,
            "numpy_seed": RANDOM_STATE,
        },
    }


if __name__ == "__main__":
    results = train_all_models()
    print("Training completed.")
    print(results)
