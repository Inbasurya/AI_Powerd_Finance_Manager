"""Financial health evolution routes with ML-backed predictions."""

from __future__ import annotations

from typing import Dict, List

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.financial_health_model import predict_financial_health, simulate_health_history

router = APIRouter(tags=["Financial Health"])


class FinancialHealthPayload(BaseModel):
    income: float = Field(default=90000, ge=0)
    monthly_expense: float = Field(default=60000, ge=0)
    savings: float = Field(default=300000, ge=0)
    investment: float = Field(default=150000, ge=0)
    spending_ratio: float = Field(default=0.65, ge=0)
    anomaly_frequency: float = Field(default=0.05, ge=0)
    debt_to_income_ratio: float = Field(default=0.2, ge=0)
    asset_value: float = Field(default=900000, ge=0)
    family_expense_ratio: float = Field(default=0.55, ge=0)


class FinancialHealthResponse(BaseModel):
    financial_score: float
    status: str
    improvement_suggestion: str
    shap_contributions: Dict[str, float]


class HealthHistoryItem(BaseModel):
    year: int
    score: float


@router.post("/financial-health/predict", response_model=FinancialHealthResponse)
def predict_financial_health_endpoint(payload: FinancialHealthPayload) -> FinancialHealthResponse:
    result = predict_financial_health(payload.model_dump())
    return FinancialHealthResponse(**result)


@router.get("/financial-health/history", response_model=List[HealthHistoryItem])
def get_financial_health_history() -> List[HealthHistoryItem]:
    seed_payload = FinancialHealthPayload().model_dump()
    history = simulate_health_history(seed_payload)
    return [HealthHistoryItem(**item) for item in history]
