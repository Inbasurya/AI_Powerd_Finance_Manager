"""Explainable AI module using SHAP for FinMind AI Pro.

Supports explanations for:
1) financial score model,
2) risk prediction model,
3) expense forecasting model.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import numpy as np
import pandas as pd
import shap

from app.services.risk_engine import RiskInput, get_risk_engine


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _resolve_model_path(filename: str) -> Path:
    """Resolve model path across supported artifact locations."""
    root = _project_root()
    candidates = [
        root / "backend" / "models" / filename,
        root / "models" / filename,
    ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError(f"Model artifact not found for: {filename}")


def _round_dict(values: Dict[str, float], digits: int = 6) -> Dict[str, float]:
    return {k: round(float(v), digits) for k, v in values.items()}


def _split_impacts(contributions: Dict[str, float]) -> Dict[str, Dict[str, float]]:
    positive = {k: round(v, 6) for k, v in contributions.items() if v > 0}
    negative = {k: round(v, 6) for k, v in contributions.items() if v < 0}
    return {"positive": positive, "negative": negative}


@lru_cache(maxsize=1)
def _load_financial_score_model() -> Any:
    return joblib.load(_resolve_model_path("financial_score_model.pkl"))


@lru_cache(maxsize=1)
def _load_expense_predictor_model() -> Any:
    return joblib.load(_resolve_model_path("expense_predictor.pkl"))


def explain_financial_score(
    *,
    income: float,
    spending: float,
    savings_rate: float,
    anomalies: int,
    investment_ratio: float,
    month: int = 6,
) -> Dict[str, Any]:
    """Explain financial score prediction with SHAP values.

    Returns JSON-style signed contributions, e.g.:
    {
      "income": +12,
      "spending_ratio": -8,
      "savings_rate": +6
    }
    """
    model = _load_financial_score_model()
    preprocessor = model.named_steps["preprocessor"]
    regressor = model.named_steps["regressor"]

    # Map semantic API inputs to expected model feature schema.
    savings = max(0.0, income * savings_rate)
    investment = max(0.0, income * investment_ratio)
    spending_ratio = spending / max(income, 1.0)

    payload = pd.DataFrame(
        [
            {
                "income": float(income),
                "monthly_budget": float(income * 0.75),
                "amount": float(spending),
                "savings": float(savings),
                "investment": float(investment),
                "spending_ratio": float(spending_ratio),
                "savings_rate": float(savings_rate),
                "investment_ratio": float(investment_ratio),
                "is_anomaly": int(max(0, anomalies)),
                "month": int(month),
                "transaction_type": "expense",
                "category": "Bills",
            }
        ]
    )

    transformed = preprocessor.transform(payload)
    prediction = float(model.predict(payload)[0])

    explainer = shap.TreeExplainer(regressor)
    shap_values = np.array(explainer.shap_values(transformed)[0], dtype=float)
    transformed_names = preprocessor.get_feature_names_out()

    raw_contrib = {
        str(name): float(value)
        for name, value in zip(transformed_names, shap_values)
    }

    # Aggregate encoded feature impacts into compact semantic feature groups.
    semantic: Dict[str, float] = {
        "income": 0.0,
        "spending_ratio": 0.0,
        "savings_rate": 0.0,
        "investment_ratio": 0.0,
        "anomalies": 0.0,
    }
    for name, value in raw_contrib.items():
        if "income" in name:
            semantic["income"] += value
        elif "spending_ratio" in name or "amount" in name:
            semantic["spending_ratio"] += value
        elif "savings_rate" in name or "savings" in name:
            semantic["savings_rate"] += value
        elif "investment_ratio" in name or "investment" in name:
            semantic["investment_ratio"] += value
        elif "is_anomaly" in name:
            semantic["anomalies"] += value

    impacts = _split_impacts(semantic)
    feature_importance = {k: abs(v) for k, v in semantic.items()}

    base_value = explainer.expected_value
    if isinstance(base_value, (list, np.ndarray)):
        base_value = float(np.array(base_value).ravel()[0])

    return {
        "model_type": "financial_score",
        "prediction": round(prediction, 4),
        "feature_importance": _round_dict(feature_importance),
        "contribution_values": _round_dict(semantic),
        "positive_impact_features": impacts["positive"],
        "negative_impact_features": impacts["negative"],
        "base_value": round(float(base_value), 6),
    }


def explain_risk_prediction(
    *,
    income: float,
    monthly_expense: float,
    savings: float,
    investment: float,
    loan_amount: float,
    credit_card_usage: float,
    spending_ratio: float,
    anomaly_frequency: float,
) -> Dict[str, Any]:
    """Explain 3-month debt risk prediction using SHAP for Gradient Boosting model."""
    engine = get_risk_engine()

    payload = RiskInput(
        income=float(income),
        monthly_expense=float(monthly_expense),
        savings=float(savings),
        loan_amount=float(loan_amount),
        credit_card_usage=float(credit_card_usage),
        investment=float(investment),
        spending_ratio=float(spending_ratio),
        anomaly_frequency=float(anomaly_frequency),
    )

    vector = np.array(
        [[
            payload.income,
            payload.monthly_expense,
            payload.savings,
            payload.loan_amount,
            payload.credit_card_usage,
            payload.investment,
            payload.spending_ratio,
            payload.anomaly_frequency,
        ]],
        dtype=float,
    )

    probability = float(engine.model.predict_proba(vector)[0][1])
    risk_level = engine._risk_level(probability)

    shap_values = engine.explainer.shap_values(vector)
    if isinstance(shap_values, list):
        class_one_values = np.array(shap_values[1][0], dtype=float)
    else:
        class_one_values = np.array(shap_values[0], dtype=float)

    feature_names = [
        "income",
        "monthly_expense",
        "savings",
        "loan_amount",
        "credit_card_usage",
        "investment",
        "spending_ratio",
        "anomaly_frequency",
    ]
    contributions = {
        name: float(value)
        for name, value in zip(feature_names, class_one_values)
    }

    semantic = {
        "high_spending": max(0.0, contributions["spending_ratio"]),
        "low_savings": max(0.0, -contributions["savings"]),
        "loan_dependency": max(0.0, contributions["loan_amount"]),
        "credit_utilization": max(0.0, contributions["credit_card_usage"]),
        "anomaly_pattern": max(0.0, contributions["anomaly_frequency"]),
    }
    top_factors = dict(sorted(semantic.items(), key=lambda item: item[1], reverse=True)[:3])
    impacts = _split_impacts(contributions)

    base_value = engine.explainer.expected_value
    if isinstance(base_value, (list, np.ndarray)):
        base_value = float(np.array(base_value).ravel()[0])

    return {
        "model_type": "risk_prediction",
        "prediction": round(probability, 4),
        "risk_level": risk_level,
        "feature_importance": _round_dict({k: abs(v) for k, v in contributions.items()}),
        "contribution_values": _round_dict(contributions),
        "positive_impact_features": impacts["positive"],
        "negative_impact_features": impacts["negative"],
        "top_contributing_factors": _round_dict(top_factors),
        "base_value": round(float(base_value), 6),
    }


def explain_expense_forecast(monthly_history: list[float]) -> Dict[str, Any]:
    """Explain expense forecast prediction with SHAP for LinearRegression model."""
    if len(monthly_history) < 4:
        raise ValueError("monthly_history must contain at least 4 values")

    model = _load_expense_predictor_model()
    preprocessor = model.named_steps["preprocessor"]
    regressor = model.named_steps["regressor"]

    payload = pd.DataFrame(
        [
            {
                "month_index": float(len(monthly_history) + 1),
                "lag_1": float(monthly_history[-1]),
                "lag_2": float(monthly_history[-2]),
                "lag_3": float(monthly_history[-3]),
            }
        ]
    )

    transformed = preprocessor.transform(payload)
    prediction = float(model.predict(payload)[0])

    # LinearExplainer works well for linear models on transformed numeric inputs.
    explainer = shap.LinearExplainer(regressor, transformed)
    shap_values = np.array(explainer.shap_values(transformed)[0], dtype=float)
    feature_names = ["month_index", "lag_1", "lag_2", "lag_3"]
    contributions = {name: float(value) for name, value in zip(feature_names, shap_values)}

    impacts = _split_impacts(contributions)
    base_value = explainer.expected_value
    if isinstance(base_value, (list, np.ndarray)):
        base_value = float(np.array(base_value).ravel()[0])

    return {
        "model_type": "expense_forecast",
        "prediction": round(prediction, 4),
        "feature_importance": _round_dict({k: abs(v) for k, v in contributions.items()}),
        "contribution_values": _round_dict(contributions),
        "positive_impact_features": impacts["positive"],
        "negative_impact_features": impacts["negative"],
        "base_value": round(float(base_value), 6),
    }
