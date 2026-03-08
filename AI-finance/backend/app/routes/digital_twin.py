"""AI Financial Digital Twin endpoint."""

from __future__ import annotations

import random
from datetime import datetime
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["AI Digital Twin"])


class BehaviorInsight(BaseModel):
    behavior_profile: str
    savings_discipline: str
    debt_risk_level: str
    investment_diversification_score: float
    financial_health_score: float
    predicted_net_worth_12_months: float
    predicted_expense_next_month: float
    predicted_risk_trend: str
    financial_behavior_score: float
    spending_volatility: float
    savings_ratio: float
    debt_to_income_ratio: float
    anomaly_frequency: float
    recommended_actions: List[str]
    shap_explanations: List[dict]

    class Config:
        json_schema_extra = {
            "example": {
                "behavior_profile": "Moderate Spender",
                "savings_discipline": "Good",
                "debt_risk_level": "Medium",
                "investment_diversification_score": 0.62,
                "financial_health_score": 74,
                "predicted_net_worth_12_months": 820000,
                "predicted_expense_next_month": 36500,
                "predicted_risk_trend": "slightly_increasing",
                "financial_behavior_score": 76.4,
                "spending_volatility": 0.18,
                "savings_ratio": 0.24,
                "debt_to_income_ratio": 0.32,
                "anomaly_frequency": 0.04,
                "recommended_actions": [
                    "Reduce discretionary spending by 10%",
                    "Increase monthly investment by ₹5,000",
                    "Build emergency fund to 6 months of expenses",
                ],
                "shap_explanations": [
                    {"factor": "spending_ratio", "impact": -0.23},
                    {"factor": "savings_rate", "impact": 0.31},
                    {"factor": "loan_amount", "impact": -0.18},
                ],
            }
        }


def _demo_metrics() -> BehaviorInsight:
    # Seed randomness per day for stable demo output
    seed_value = int(datetime.utcnow().strftime("%Y%m%d"))
    rnd = random.Random(seed_value)

    spending_volatility = round(rnd.uniform(0.12, 0.28), 3)
    savings_ratio = round(rnd.uniform(0.18, 0.32), 3)
    debt_to_income_ratio = round(rnd.uniform(0.25, 0.42), 3)
    diversification_score = round(rnd.uniform(0.55, 0.75), 3)
    anomaly_frequency = round(rnd.uniform(0.02, 0.08), 3)

    # Simple scoring heuristic
    behavior_score = (
        (1 - spending_volatility) * 25
        + savings_ratio * 120
        + (1 - debt_to_income_ratio) * 25
        + diversification_score * 20
        + (1 - anomaly_frequency) * 10
    )
    behavior_score = round(max(0, min(100, behavior_score)), 2)

    financial_health_score = round(70 + (behavior_score - 70) * 0.35, 2)
    predicted_net_worth_12_months = round(rnd.uniform(720000, 920000), 2)
    predicted_expense_next_month = round(rnd.uniform(34000, 38000), 2)
    risk_trend = rnd.choice(["stable", "slightly_increasing", "slightly_decreasing"])

    behavior_profile = rnd.choice(["Moderate Spender", "Disciplined Saver", "Balanced Optimizer"])
    savings_discipline = "Good" if savings_ratio >= 0.22 else "Needs Improvement"
    debt_risk_level = "Medium" if debt_to_income_ratio >= 0.32 else "Low"

    shap_explanations = [
        {"factor": "spending_ratio", "impact": round(-spending_volatility, 3)},
        {"factor": "savings_rate", "impact": round(savings_ratio * 0.9, 3)},
        {"factor": "debt_to_income", "impact": round(-debt_to_income_ratio * 0.6, 3)},
        {"factor": "diversification", "impact": round(diversification_score * 0.5, 3)},
        {"factor": "anomaly_frequency", "impact": round(-anomaly_frequency * 0.4, 3)},
    ]

    return BehaviorInsight(
        behavior_profile=behavior_profile,
        savings_discipline=savings_discipline,
        debt_risk_level=debt_risk_level,
        investment_diversification_score=diversification_score,
        financial_health_score=financial_health_score,
        predicted_net_worth_12_months=predicted_net_worth_12_months,
        predicted_expense_next_month=predicted_expense_next_month,
        predicted_risk_trend=risk_trend,
        financial_behavior_score=behavior_score,
        spending_volatility=spending_volatility,
        savings_ratio=savings_ratio,
        debt_to_income_ratio=debt_to_income_ratio,
        anomaly_frequency=anomaly_frequency,
        recommended_actions=[
            "Reduce discretionary spending by 10%",
            "Increase monthly investment by ₹5,000",
            "Build emergency fund to 6 months of expenses",
        ],
        shap_explanations=shap_explanations,
    )


@router.get("/ai/digital-twin", response_model=BehaviorInsight)
def get_digital_twin() -> BehaviorInsight:
    """Return AI Financial Digital Twin insights.

    This demo implementation uses heuristic calculations seeded per day. When real models/data are available,
    plug them in here to replace the heuristics.
    """

    return _demo_metrics()
