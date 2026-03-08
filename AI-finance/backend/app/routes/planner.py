"""Budget planning and affordability simulation endpoints."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["Planner"])


class AffordabilityRequest(BaseModel):
    """Inputs for affordability simulation."""

    monthly_income: float = Field(gt=0)
    monthly_expenses: float = Field(ge=0)
    current_savings: float = Field(ge=0)
    future_cost: float = Field(gt=0)
    months_until_purchase: int = Field(gt=0, le=120)


class AffordabilityResponse(BaseModel):
    """Affordability outcome and recommendation details."""

    can_afford: bool
    projected_savings: float
    shortfall: float
    required_monthly_savings: float
    recommendation: str


class PlannerTimelineItem(BaseModel):
    month: int
    savings: float


class PlannerSimulationResponse(BaseModel):
    recommended_monthly_saving: float
    projected_savings: float
    goal_probability: float
    timeline: list[PlannerTimelineItem]


@router.post("/affordability-simulation", response_model=AffordabilityResponse)
def affordability_simulation(payload: AffordabilityRequest) -> AffordabilityResponse:
    """Estimate whether the user can afford a planned future purchase."""
    disposable_income = max(0.0, payload.monthly_income - payload.monthly_expenses)
    projected_savings = payload.current_savings + disposable_income * payload.months_until_purchase
    shortfall = max(0.0, payload.future_cost - projected_savings)
    required_monthly_savings = max(
        0.0,
        (payload.future_cost - payload.current_savings) / payload.months_until_purchase,
    )

    can_afford = projected_savings >= payload.future_cost
    if can_afford:
        recommendation = "Affordable within current cash flow."
    else:
        recommendation = (
            "Not affordable yet. Reduce monthly expenses or extend purchase timeline."
        )

    return AffordabilityResponse(
        can_afford=can_afford,
        projected_savings=round(projected_savings, 2),
        shortfall=round(shortfall, 2),
        required_monthly_savings=round(required_monthly_savings, 2),
        recommendation=recommendation,
    )


@router.post("/planner/simulate", response_model=PlannerSimulationResponse)
def planner_simulate(payload: AffordabilityRequest) -> PlannerSimulationResponse:
    """Simulate planner outputs with simple probability heuristic to avoid blank UI."""

    disposable_income = max(0.0, payload.monthly_income - payload.monthly_expenses)
    recommended_monthly = max(disposable_income * 0.4, payload.future_cost / max(payload.months_until_purchase, 1) * 0.6)
    projected_savings = payload.current_savings + recommended_monthly * payload.months_until_purchase
    goal_probability = min(0.98, projected_savings / max(payload.future_cost, 1))

    timeline = [
        PlannerTimelineItem(month=0, savings=payload.current_savings),
        PlannerTimelineItem(month=1, savings=payload.current_savings + recommended_monthly),
        PlannerTimelineItem(month=payload.months_until_purchase, savings=projected_savings),
    ]

    return PlannerSimulationResponse(
        recommended_monthly_saving=round(recommended_monthly, 2),
        projected_savings=round(projected_savings, 2),
        goal_probability=round(goal_probability, 3),
        timeline=timeline,
    )
