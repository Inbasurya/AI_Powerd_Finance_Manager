"""Debt risk prediction service for 3-month debt probability."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


@lru_cache(maxsize=1)
def _load_model():
    model_path = _project_root() / "models" / "debt_risk_predictor.pkl"
    if not model_path.exists():
        return None
    return joblib.load(model_path)


def predict_debt_risk(
    *,
    income: float,
    monthly_budget: float,
    current_savings: float,
    current_investment: float,
    monthly_expense_history: list[float],
    anomalies_recent: int,
    foreign_transactions: int,
    late_night_transactions: int,
) -> dict[str, object]:
    """Predict risk of debt in next 3 months using model or deterministic fallback."""
    avg_spend = float(np.mean(monthly_expense_history)) if monthly_expense_history else 0.0
    recent_spend = float(monthly_expense_history[-1]) if monthly_expense_history else 0.0
    spend_trend = float(recent_spend - monthly_expense_history[0]) if len(monthly_expense_history) > 1 else 0.0

    spending_to_income = avg_spend / max(income, 1.0)
    budget_pressure = recent_spend / max(monthly_budget, 1.0)

    features = pd.DataFrame(
        [
            {
                "amount": recent_spend,
                "income": income,
                "monthly_budget": monthly_budget,
                "savings": current_savings,
                "investment": current_investment,
                "spending_to_income": spending_to_income,
                "budget_pressure": budget_pressure,
                "is_anomaly": 1 if anomalies_recent > 0 else 0,
                "transaction_type": "debit",
                "category": "Bills" if budget_pressure > 1 else "Food",
                "location": "Foreign" if foreign_transactions > 0 else "Domestic",
            }
        ]
    )

    model = _load_model()
    if model is not None:
        proba = float(model.predict_proba(features)[0][1])
    else:
        # Deterministic fallback while model artifact is unavailable.
        normalized = (
            0.42 * min(2.0, spending_to_income)
            + 0.33 * min(2.0, budget_pressure)
            + 0.14 * min(1.0, anomalies_recent / 5.0)
            + 0.07 * min(1.0, foreign_transactions / 4.0)
            + 0.04 * min(1.0, late_night_transactions / 8.0)
        )
        proba = max(0.0, min(1.0, normalized / 2.0))

    if proba >= 0.7:
        level = "High"
    elif proba >= 0.4:
        level = "Medium"
    else:
        level = "Low"

    will_go_into_debt = proba >= 0.5
    return {
        "will_go_into_debt": will_go_into_debt,
        "debt_risk_probability": round(proba, 4),
        "risk_level": level,
        "forecast_horizon_months": 3,
        "risk_factors": {
            "spending_to_income": round(spending_to_income, 4),
            "budget_pressure": round(budget_pressure, 4),
            "savings_buffer": round((current_savings + current_investment) / max(income, 1.0), 4),
            "spending_trend": round(spend_trend, 2),
            "anomalies_recent": anomalies_recent,
            "foreign_transactions": foreign_transactions,
            "late_night_transactions": late_night_transactions,
        },
    }
