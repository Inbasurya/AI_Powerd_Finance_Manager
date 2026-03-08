"""FinMind AI Pro model training pipeline.

This script is designed for final-year AI project workflows. It trains
multiple machine learning models for different finance intelligence tasks,
evaluates them, and saves the trained artifacts for backend inference.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, IsolationForest, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import accuracy_score, mean_squared_error, precision_score, recall_score, mean_absolute_error, r2_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler, label_binarize

RANDOM_STATE = 42


def _round_metric(value: Any) -> float:
    """Round metric values to 4 decimals for storage."""

    try:
        return round(float(value), 4)
    except Exception:
        return 0.0


def _multiclass_roc_auc(y_true: pd.Series, proba: np.ndarray, classes: np.ndarray) -> Optional[float]:
    """Compute weighted multi-class ROC-AUC with graceful fallback."""

    try:
        if len(classes) <= 1:
            return None
        y_bin = label_binarize(y_true, classes=classes)
        return float(roc_auc_score(y_bin, proba, average="weighted", multi_class="ovo"))
    except Exception:
        return None


def _binary_roc_auc(y_true: np.ndarray, scores: np.ndarray) -> Optional[float]:
    """Compute ROC-AUC for binary labels with safe handling for edge cases."""

    try:
        if len(np.unique(y_true)) < 2:
            return None
        return float(roc_auc_score(y_true, scores))
    except Exception:
        return None


def _save_metrics(metrics: Dict[str, Dict[str, float]], metrics_path: Path) -> None:
    """Persist model metrics to JSON for API consumption with demo safety."""

    payload = {
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "models": metrics,
    }
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.write_text(json.dumps(payload, indent=2))


def _get_paths() -> Tuple[Path, Path]:
    """Resolve dataset and model output paths from project structure."""
    project_root = Path(__file__).resolve().parents[3]
    dataset_path = project_root / "dataset" / "transactions.csv"
    models_dir = project_root / "backend" / "models"
    return dataset_path, models_dir


def _load_dataset(dataset_path: Path) -> pd.DataFrame:
    """Load dataset and run baseline schema validation."""
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found at: {dataset_path}")

    df = pd.read_csv(dataset_path)
    if "amount" not in df.columns:
        raise ValueError("Dataset must include an 'amount' column.")

    return df


def _preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Apply preprocessing with missing-value handling and feature preparation."""
    data = df.copy()

    # Ensure date field exists and convert to datetime for temporal features.
    if "date" not in data.columns:
        data["date"] = pd.date_range(start="2025-01-01", periods=len(data), freq="D")
    data["date"] = pd.to_datetime(data["date"], errors="coerce")
    data["date"] = data["date"].fillna(pd.Timestamp("2025-01-01"))

    # Ensure expected categorical fields exist for encoding.
    for col, default_val in {
        "category": "Unknown",
        "merchant": "Unknown",
        "payment_method": "Unknown",
        "location": "Unknown",
        "transaction_type": "debit",
    }.items():
        if col not in data.columns:
            data[col] = default_val
        data[col] = data[col].fillna(default_val).astype(str)

    # Ensure expected numeric fields exist and are numeric.
    numeric_defaults = {
        "income": np.nan,
        "monthly_budget": np.nan,
        "monthly_expense": np.nan,
        "savings": np.nan,
        "investment": np.nan,
        "loan_amount": 0.0,
        "credit_card_usage": 0.2,
        "anomaly_frequency": 0.0,
        "debt_to_income_ratio": np.nan,
        "asset_value": np.nan,
        "family_expense_ratio": np.nan,
        "is_anomaly": 0,
    }
    for col, default_val in numeric_defaults.items():
        if col not in data.columns:
            data[col] = default_val
        data[col] = pd.to_numeric(data[col], errors="coerce")

    data["amount"] = pd.to_numeric(data["amount"], errors="coerce")

    # Derive robust fallback values for core finance columns.
    data["income"] = data["income"].fillna(data["income"].median() if data["income"].notna().any() else 75000)
    data["monthly_budget"] = data["monthly_budget"].fillna(data["income"] * 0.75)
    data["savings"] = data["savings"].fillna(data["income"] * 0.2)
    data["investment"] = data["investment"].fillna(data["income"] * 0.1)
    data["monthly_expense"] = data["monthly_expense"].fillna(data["monthly_budget"])
    data["asset_value"] = data["asset_value"].fillna(data["savings"] + data["investment"] + data["income"] * 0.5)
    data["amount"] = data["amount"].fillna(data["amount"].median() if data["amount"].notna().any() else 1000)

    data["loan_amount"] = data["loan_amount"].fillna(0.0)
    data["credit_card_usage"] = data["credit_card_usage"].fillna(0.2)
    data["anomaly_frequency"] = data["anomaly_frequency"].fillna(0.0)
    data["is_anomaly"] = data["is_anomaly"].fillna(0).astype(int).clip(lower=0, upper=1)

    # Temporal and ratio features used across models.
    data["month"] = data["date"].dt.month.astype(int)
    data["day"] = data["date"].dt.day.astype(int)
    data["is_weekend"] = (data["date"].dt.dayofweek >= 5).astype(int)

    data["spending_ratio"] = np.divide(data["amount"], np.maximum(data["income"], 1.0))
    data["savings_rate"] = np.divide(data["savings"], np.maximum(data["income"], 1.0))
    data["investment_ratio"] = np.divide(data["investment"], np.maximum(data["income"], 1.0))
    data["debt_to_income_ratio"] = data["debt_to_income_ratio"].fillna(np.divide(data["loan_amount"], np.maximum(data["income"], 1.0)))
    data["family_expense_ratio"] = data["family_expense_ratio"].fillna(np.divide(data["monthly_expense"], np.maximum(data["income"], 1.0)))

    # Create financial score target if absent.
    if "financial_score" not in data.columns:
        penalty = np.minimum(55.0, data["spending_ratio"] * 55.0) + np.minimum(20.0, data["is_anomaly"] * 4.0)
        bonus = np.minimum(25.0, data["savings_rate"] * 45.0) + np.minimum(15.0, data["investment_ratio"] * 35.0)
        data["financial_score"] = np.clip(100.0 - penalty + bonus, 0.0, 100.0)
    else:
        data["financial_score"] = pd.to_numeric(data["financial_score"], errors="coerce").fillna(60.0)

    return data


def _make_preprocessor(numeric_features: list[str], categorical_features: list[str]) -> ColumnTransformer:
    """Build preprocessing transformer: impute -> encode/scale."""
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, numeric_features),
            ("cat", categorical_pipeline, categorical_features),
        ]
    )


def _train_transaction_classifier(data: pd.DataFrame) -> Tuple[Pipeline, Dict[str, float]]:
    """Train RandomForestClassifier for transaction category classification."""
    features = [
        "amount",
        "income",
        "monthly_budget",
        "savings",
        "investment",
        "spending_ratio",
        "month",
        "day",
        "is_weekend",
        "merchant",
        "payment_method",
        "location",
        "transaction_type",
    ]

    x = data[features]
    y = data["category"].astype(str)

    preprocessor = _make_preprocessor(
        numeric_features=["amount", "income", "monthly_budget", "savings", "investment", "spending_ratio", "month", "day", "is_weekend"],
        categorical_features=["merchant", "payment_method", "location", "transaction_type"],
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", RandomForestClassifier(n_estimators=220, random_state=RANDOM_STATE, class_weight="balanced")),
        ]
    )

    class_counts = y.value_counts()
    stratify_target = y if y.nunique() > 1 and class_counts.min() >= 2 else None

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=stratify_target,
    )

    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    roc_auc = None
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(x_test)
        roc_auc = _multiclass_roc_auc(y_test, proba, model.classes_)

    metrics = {
        "accuracy": _round_metric(accuracy_score(y_test, pred)),
        "precision": _round_metric(precision_score(y_test, pred, average="weighted", zero_division=0)),
        "recall": _round_metric(recall_score(y_test, pred, average="weighted", zero_division=0)),
        "f1_score": _round_metric(f1_score(y_test, pred, average="weighted", zero_division=0)),
        "roc_auc": _round_metric(roc_auc) if roc_auc is not None else 0.0,
    }
    return model, metrics


def _train_anomaly_detector(data: pd.DataFrame) -> Tuple[Pipeline, Dict[str, float]]:
    """Train IsolationForest for anomaly detection and evaluate against labels."""
    features = [
        "amount",
        "income",
        "monthly_budget",
        "spending_ratio",
        "savings_rate",
        "investment_ratio",
        "month",
        "day",
        "is_weekend",
        "payment_method",
        "location",
        "transaction_type",
    ]

    x = data[features]
    y = data["is_anomaly"].astype(int)

    preprocessor = _make_preprocessor(
        numeric_features=["amount", "income", "monthly_budget", "spending_ratio", "savings_rate", "investment_ratio", "month", "day", "is_weekend"],
        categorical_features=["payment_method", "location", "transaction_type"],
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("detector", IsolationForest(contamination=0.08, random_state=RANDOM_STATE)),
        ]
    )

    x_train, x_test, _, y_test = train_test_split(x, y, test_size=0.2, random_state=RANDOM_STATE)

    model.fit(x_train)
    pred_raw = model.predict(x_test)
    pred = np.where(pred_raw == -1, 1, 0)
    scores = -model.decision_function(x_test)

    auc_score = _binary_roc_auc(y_test.to_numpy(), scores)

    metrics = {
        "accuracy": _round_metric(accuracy_score(y_test, pred)),
        "precision": _round_metric(precision_score(y_test, pred, zero_division=0)),
        "recall": _round_metric(recall_score(y_test, pred, zero_division=0)),
        "f1_score": _round_metric(f1_score(y_test, pred, zero_division=0)),
        "roc_auc": _round_metric(auc_score) if auc_score is not None else 0.0,
    }
    return model, metrics


def _train_financial_score_model(data: pd.DataFrame) -> Tuple[Pipeline, Dict[str, float]]:
    """Train GradientBoostingRegressor to predict financial score."""
    features = [
        "income",
        "monthly_budget",
        "amount",
        "savings",
        "investment",
        "spending_ratio",
        "savings_rate",
        "investment_ratio",
        "is_anomaly",
        "month",
        "transaction_type",
        "category",
    ]

    x = data[features]
    y = data["financial_score"].astype(float)

    preprocessor = _make_preprocessor(
        numeric_features=["income", "monthly_budget", "amount", "savings", "investment", "spending_ratio", "savings_rate", "investment_ratio", "is_anomaly", "month"],
        categorical_features=["transaction_type", "category"],
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", GradientBoostingRegressor(random_state=RANDOM_STATE)),
        ]
    )

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=RANDOM_STATE)

    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    rmse = float(np.sqrt(mean_squared_error(y_test, pred)))

    # Classification-style metrics based on directionality vs. mean trend for demo-friendly reporting.
    threshold = float(y.mean())
    y_true_class = (y_test > threshold).astype(int)
    y_pred_class = (pred > threshold).astype(int)

    auc_score = _binary_roc_auc(y_true_class.to_numpy(), pred)

    metrics = {
        "rmse": _round_metric(rmse),
        "accuracy": _round_metric(accuracy_score(y_true_class, y_pred_class)),
        "precision": _round_metric(precision_score(y_true_class, y_pred_class, zero_division=0)),
        "recall": _round_metric(recall_score(y_true_class, y_pred_class, zero_division=0)),
        "f1_score": _round_metric(f1_score(y_true_class, y_pred_class, zero_division=0)),
        "roc_auc": _round_metric(auc_score) if auc_score is not None else 0.0,
    }
    return model, metrics


def _prepare_expense_forecasting_table(data: pd.DataFrame) -> pd.DataFrame:
    """Build monthly supervised dataset for expense forecasting."""
    monthly = (
        data.assign(
            expense=np.where(data["transaction_type"].str.lower() == "debit", data["amount"], 0.0)
        )
        .set_index("date")
        .resample("ME")["expense"]
        .sum()
        .astype(float)
        .reset_index(drop=True)
    )

    # Ensure enough monthly points for lag-based forecasting.
    if len(monthly) < 10:
        seed = float(monthly.iloc[-1]) if len(monthly) > 0 else 6000.0
        extra = [seed * (1 + 0.02 * i) for i in range(1, 11 - len(monthly))]
        monthly = pd.concat([monthly, pd.Series(extra)], ignore_index=True)

    table = pd.DataFrame({"expense": monthly})
    table["month_index"] = np.arange(1, len(table) + 1)
    table["lag_1"] = table["expense"].shift(1)
    table["lag_2"] = table["expense"].shift(2)
    table["lag_3"] = table["expense"].shift(3)
    table = table.dropna().reset_index(drop=True)
    return table


def _train_expense_predictor(data: pd.DataFrame) -> Tuple[Pipeline, Dict[str, float]]:
    """Train LinearRegression model for expense forecasting."""
    table = _prepare_expense_forecasting_table(data)

    x = table[["month_index", "lag_1", "lag_2", "lag_3"]]
    y = table["expense"]

    preprocessor = _make_preprocessor(
        numeric_features=["month_index", "lag_1", "lag_2", "lag_3"],
        categorical_features=[],
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", LinearRegression()),
        ]
    )

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=RANDOM_STATE)

    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    rmse = float(np.sqrt(mean_squared_error(y_test, pred)))

    metrics = {"rmse": rmse}
    return model, metrics


def _train_financial_health_model(data: pd.DataFrame) -> Tuple[Pipeline, Dict[str, float]]:
    """Train GradientBoostingRegressor for financial health score evolution."""

    features = [
        "income",
        "monthly_expense",
        "savings",
        "investment",
        "spending_ratio",
        "anomaly_frequency",
        "debt_to_income_ratio",
        "asset_value",
        "family_expense_ratio",
    ]

    # Create target; if missing, reuse financial_score as proxy.
    target = "financial_health_score"
    if target not in data.columns:
        data[target] = data.get("financial_score", pd.Series([60.0] * len(data))).astype(float)
    y = data[target].astype(float)
    x = data[features]

    preprocessor = _make_preprocessor(numeric_features=features, categorical_features=[])

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", GradientBoostingRegressor(random_state=RANDOM_STATE)),
        ]
    )

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=RANDOM_STATE)

    model.fit(x_train, y_train)
    pred = model.predict(x_test)

    metrics = {
        "r2": float(r2_score(y_test, pred)),
        "mae": float(mean_absolute_error(y_test, pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_test, pred))),
    }
    return model, metrics


def _train_risk_model(data: pd.DataFrame) -> Tuple[Pipeline, Dict[str, float]]:
    """Train a lightweight risk classifier leveraging debt ratios and spending signals."""

    engineered = data.copy()
    engineered["risk_flag"] = (
        (engineered.get("debt_to_income_ratio", 0) > 0.35)
        | (engineered.get("credit_card_usage", 0) > 0.45)
        | (engineered.get("anomaly_frequency", 0) > 0.12)
    ).astype(int)

    features = [
        "income",
        "monthly_expense",
        "savings",
        "investment",
        "debt_to_income_ratio",
        "credit_card_usage",
        "anomaly_frequency",
        "loan_amount",
        "spending_ratio",
        "family_expense_ratio",
    ]

    x = engineered[features]
    y = engineered["risk_flag"].astype(int)

    preprocessor = _make_preprocessor(numeric_features=features, categorical_features=[])

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", RandomForestClassifier(n_estimators=160, random_state=RANDOM_STATE, class_weight="balanced")),
        ]
    )

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y if y.nunique() > 1 else None)

    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    proba = model.predict_proba(x_test)[:, 1] if hasattr(model, "predict_proba") else pred

    auc_score = _binary_roc_auc(y_test.to_numpy(), proba)

    metrics = {
        "accuracy": _round_metric(accuracy_score(y_test, pred)),
        "precision": _round_metric(precision_score(y_test, pred, zero_division=0)),
        "recall": _round_metric(recall_score(y_test, pred, zero_division=0)),
        "f1_score": _round_metric(f1_score(y_test, pred, zero_division=0)),
        "roc_auc": _round_metric(auc_score) if auc_score is not None else 0.0,
    }

    return model, metrics


def train_all_models() -> Dict[str, Any]:
    """Main training entrypoint for all FinMind AI Pro models."""
    dataset_path, models_dir = _get_paths()
    models_dir.mkdir(parents=True, exist_ok=True)

    raw_df = _load_dataset(dataset_path)
    data = _preprocess_dataframe(raw_df)

    transaction_classifier, cls_metrics = _train_transaction_classifier(data)
    anomaly_detector, anomaly_metrics = _train_anomaly_detector(data)
    financial_score_model, financial_metrics = _train_financial_score_model(data)
    expense_predictor, expense_metrics = _train_expense_predictor(data)
    financial_health_model, health_metrics = _train_financial_health_model(data)
    risk_model, risk_metrics = _train_risk_model(data)

    classifier_path = models_dir / "transaction_classifier.pkl"
    anomaly_path = models_dir / "anomaly_detector.pkl"
    expense_path = models_dir / "expense_predictor.pkl"
    score_path = models_dir / "financial_score_model.pkl"
    health_path = models_dir / "financial_health_model.pkl"

    joblib.dump(transaction_classifier, classifier_path)
    joblib.dump(anomaly_detector, anomaly_path)
    joblib.dump(expense_predictor, expense_path)
    joblib.dump(financial_score_model, score_path)
    joblib.dump(financial_health_model, health_path)
    risk_model_path = models_dir / "risk_model.pkl"
    joblib.dump(risk_model, risk_model_path)

    metrics_payload = {
        "transaction_classifier": cls_metrics,
        "anomaly_detector": anomaly_metrics,
        "expense_predictor": expense_metrics,
        "risk_model": risk_metrics,
    }

    metrics_path = Path(__file__).resolve().parents[2] / "model_metrics.json"
    _save_metrics(metrics_payload, metrics_path)

    return {
        "dataset": str(dataset_path),
        "models_saved": {
            "transaction_classifier": str(classifier_path),
            "anomaly_detector": str(anomaly_path),
            "expense_predictor": str(expense_path),
            "financial_score_model": str(score_path),
            "financial_health_model": str(health_path),
            "risk_model": str(risk_model_path),
        },
        "metrics": {
            "transaction_classification": cls_metrics,
            "anomaly_detection": anomaly_metrics,
            "financial_score_prediction": financial_metrics,
            "expense_forecasting": expense_metrics,
            "financial_health_score": health_metrics,
            "risk_model": risk_metrics,
        },
        "model_metrics_path": str(metrics_path),
        "rows_used": int(len(data)),
    }


if __name__ == "__main__":
    summary = train_all_models()
    print("Training completed successfully.")
    print(summary)
