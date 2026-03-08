"""Financial health score model loading, prediction, and SHAP-style insights."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np

MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "financial_health_model.pkl"
FEATURE_ORDER: List[str] = [
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

_cached_model = None


def _load_model():
    global _cached_model
    if _cached_model is None and MODEL_PATH.exists():
        _cached_model = joblib.load(MODEL_PATH)
    return _cached_model


def _status_from_score(score: float) -> str:
    if score >= 80:
        return "Excellent"
    if score >= 65:
        return "Good"
    if score >= 50:
        return "Average"
    return "Poor"


def _build_features(payload: Dict[str, float]) -> np.ndarray:
    enriched = payload.copy()
    income = float(enriched.get("income", 0) or 0)
    monthly_expense = float(enriched.get("monthly_expense", enriched.get("monthly_budget", 0)) or 0)
    savings = float(enriched.get("savings", 0) or 0)
    investment = float(enriched.get("investment", 0) or 0)

    spending_ratio = float(enriched.get("spending_ratio", 0) or 0)
    if spending_ratio == 0 and income:
        spending_ratio = monthly_expense / max(income, 1.0)

    debt_to_income_ratio = float(enriched.get("debt_to_income_ratio", 0) or 0)
    if debt_to_income_ratio == 0 and income:
        debt_to_income_ratio = float(enriched.get("loan_amount", 0) or 0) / max(income, 1.0)

    asset_value = float(enriched.get("asset_value", 0) or 0)
    if asset_value == 0:
        asset_value = savings + investment + income * 0.4

    family_expense_ratio = float(enriched.get("family_expense_ratio", 0) or 0)
    if family_expense_ratio == 0 and income:
        family_expense_ratio = monthly_expense / max(income, 1.0)

    anomaly_frequency = float(enriched.get("anomaly_frequency", 0) or 0)

    assembled = {
        "income": income,
        "monthly_expense": monthly_expense,
        "savings": savings,
        "investment": investment,
        "spending_ratio": spending_ratio,
        "anomaly_frequency": anomaly_frequency,
        "debt_to_income_ratio": debt_to_income_ratio,
        "asset_value": asset_value,
        "family_expense_ratio": family_expense_ratio,
    }

    return np.array([[assembled.get(f, 0.0) for f in FEATURE_ORDER]], dtype=float)


def _shap_like(model, features: np.ndarray) -> Dict[str, float]:
    if hasattr(model, "feature_importances_"):
        importances = getattr(model, "feature_importances_")
        scaled = importances * features.flatten()
        total = float(np.sum(np.abs(scaled))) or 1.0
        normalized = {name: float(round(val / total * 100, 2)) for name, val in zip(FEATURE_ORDER, scaled)}
        return normalized
    return {name: 0.0 for name in FEATURE_ORDER}


def predict_financial_health(payload: Dict[str, float]) -> Dict[str, object]:
    features = _build_features(payload)
    model = _load_model()

    if model is not None:
        score = float(model.predict(features)[0])
        shap_contrib = _shap_like(model, features)
    else:
        # Fallback heuristic if model isn't trained yet.
        base = 55.0
        boost = min(features[0, 2] / max(features[0, 0], 1.0) * 40, 25)  # savings vs income
        invest_boost = min(features[0, 3] / max(features[0, 0], 1.0) * 35, 15)
        penalty = min(features[0, 1] / max(features[0, 0], 1.0) * 45, 25) + min(features[0, 5] * 20, 15)
        score = base + boost + invest_boost - penalty
        shap_contrib = {
            "savings": round(boost, 2),
            "investment": round(invest_boost, 2),
            "monthly_expense": round(-penalty, 2),
            "anomaly_frequency": round(-features[0, 5] * 10, 2),
        }

    score = max(0.0, min(100.0, score))
    status = _status_from_score(score)

    target = 80.0 if score < 80 else 90.0
    delta_needed = max(target - score, 0)
    suggestion = "Increase monthly savings by ₹5000 to improve financial health by 8 points." if delta_needed > 0 else "Maintain current strategy to sustain your score."
    if score < 60:
        suggestion = "Reduce discretionary spending to improve long-term wealth."  # align with requirement

    return {
        "financial_score": round(score, 2),
        "status": status,
        "improvement_suggestion": suggestion,
        "shap_contributions": shap_contrib,
    }


def simulate_health_history(payload: Dict[str, float]) -> List[Dict[str, float]]:
    """Simulate score evolution over time using trend from prediction."""

    base_pred = predict_financial_health(payload)
    base_score = float(base_pred["financial_score"])
    savings_growth = payload.get("savings_growth", 0.08)

    current_year = payload.get("current_year", 2026)
    horizon = int(payload.get("horizon", 4))

    history = []
    for i in range(horizon):
        year = int(current_year - (horizon - 1 - i))
        increment = (savings_growth * 100) * (i / max(horizon - 1, 1))
        projected = max(0.0, min(100.0, base_score - 6 + increment + np.random.normal(2, 1)))
        history.append({"year": year, "score": round(projected, 2)})

    return history
