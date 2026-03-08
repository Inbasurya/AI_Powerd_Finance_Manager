"""Financial timeline and goal forecasting endpoints."""

from __future__ import annotations

from typing import Dict

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.financial_forecasting import (
    forecast_child_education,
    forecast_goal_completion,
    forecast_house_purchase,
    forecast_emergency_fund,
    forecast_vehicle_purchase,
    forecast_retirement,
)

router = APIRouter(tags=["Financial Timeline"])


class ForecastPayload(BaseModel):
    current_age: int = Field(default=30, ge=0)
    retirement_age: int = Field(default=60, ge=0)
    monthly_income: float = Field(default=0, ge=0)
    monthly_expense: float = Field(default=0, ge=0)
    current_savings: float = Field(default=0, ge=0)
    investment_return_rate: float = Field(default=0.07)
    inflation_rate: float = Field(default=0.04)
    goal_amount: float = Field(default=0, ge=0)
    goal_target_year: int = Field(default=10, ge=0, description="Years until goal target")


class ForecastResponse(BaseModel):
    projected_wealth: float
    monthly_investment_required: float
    goal_probability: float
    financial_gap: float
    shap_contributions: Dict[str, float]


@router.post("/forecast/retirement", response_model=ForecastResponse)
def forecast_retirement_goal(payload: ForecastPayload) -> ForecastResponse:
    result = forecast_retirement(payload.model_dump())
    return ForecastResponse(**result)


@router.post("/forecast/house", response_model=ForecastResponse)
def forecast_house_goal(payload: ForecastPayload) -> ForecastResponse:
    result = forecast_house_purchase(payload.model_dump())
    return ForecastResponse(**result)


@router.post("/forecast/education", response_model=ForecastResponse)
def forecast_child_education_goal(payload: ForecastPayload) -> ForecastResponse:
    result = forecast_child_education(payload.model_dump())
    return ForecastResponse(**result)


@router.post("/forecast/emergency", response_model=ForecastResponse)
def forecast_emergency_fund_goal(payload: ForecastPayload) -> ForecastResponse:
    result = forecast_emergency_fund(payload.model_dump())
    return ForecastResponse(**result)


@router.post("/forecast/vehicle", response_model=ForecastResponse)
def forecast_vehicle_goal(payload: ForecastPayload) -> ForecastResponse:
    result = forecast_vehicle_purchase(payload.model_dump())
    return ForecastResponse(**result)


@router.post("/forecast/goal", response_model=ForecastResponse)
def forecast_goal(payload: ForecastPayload) -> ForecastResponse:
    result = forecast_goal_completion(payload.model_dump())
    return ForecastResponse(**result)
