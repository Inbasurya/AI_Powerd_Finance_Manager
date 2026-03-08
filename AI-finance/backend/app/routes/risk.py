"""Risk prediction endpoints."""

from __future__ import annotations

from typing import Dict

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["Risk"])


class RiskPayload(BaseModel):
    income: float = Field(default=90000, ge=0)
    monthly_expense: float = Field(default=65000, ge=0)
    savings: float = Field(default=40000, ge=0)
    loan_amount: float = Field(default=200000, ge=0)
    credit_card_usage: float = Field(default=0.4, ge=0)
    investment: float = Field(default=30000, ge=0)
    spending_ratio: float = Field(default=0.7, ge=0)
    anomaly_frequency: float = Field(default=0.12, ge=0)


class RiskResponse(BaseModel):
    risk_score: float
    debt_probability: float
    risk_level: str
    shap_explanation: Dict[str, float]


@router.post("/risk/predict", response_model=RiskResponse)
def predict_risk(payload: RiskPayload) -> RiskResponse:
    # Simple heuristic risk simulation to keep UI stable.
    debt_ratio = payload.loan_amount / max(payload.income, 1)
    spend_pressure = payload.monthly_expense / max(payload.income, 1)
    anomaly_factor = payload.anomaly_frequency * 0.6
    usage_factor = payload.credit_card_usage * 0.4

    raw_risk = debt_ratio * 0.45 + spend_pressure * 0.35 + anomaly_factor + usage_factor
    debt_probability = min(0.99, max(0.01, raw_risk))
    risk_score = max(0.0, min(100.0, (1 - debt_probability) * 100))

    if debt_probability > 0.6:
        level = "HIGH"
    elif debt_probability > 0.35:
        level = "MEDIUM"
    else:
        level = "LOW"

    shap_explanation = {
        "debt_ratio": round(debt_ratio, 4),
        "spending_pressure": round(spend_pressure, 4),
        "anomaly_frequency": round(payload.anomaly_frequency, 4),
        "credit_usage": round(payload.credit_card_usage, 4),
    }

    return RiskResponse(
        risk_score=round(risk_score, 2),
        debt_probability=round(debt_probability, 3),
        risk_level=level,
        shap_explanation=shap_explanation,
    )
