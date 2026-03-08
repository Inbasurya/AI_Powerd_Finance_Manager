"""Financial simulation engine endpoints."""

from __future__ import annotations

from typing import Dict, List

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.financial_simulation import simulate_financial_future

router = APIRouter(tags=["Financial Simulation"])


class SimulationPayload(BaseModel):
    current_income: float = Field(default=90000, ge=0)
    monthly_expense: float = Field(default=60000, ge=0)
    current_savings: float = Field(default=350000, ge=0)
    investment: float = Field(default=200000, ge=0)
    assets: float = Field(default=500000, ge=0)
    liabilities: float = Field(default=150000, ge=0)
    inflation_rate: float = Field(default=0.04)
    salary_growth_rate: float = Field(default=0.05)
    simulation_years: int = Field(default=20, ge=1)


class ScenarioResult(BaseModel):
    scenario: str
    net_worth: float


class SimulationResponse(BaseModel):
    projected_net_worth: float
    retirement_success_probability: float
    years_to_financial_independence: int
    wealth_trajectory: List[float]
    scenario_results: List[ScenarioResult]


@router.post("/simulation/run", response_model=SimulationResponse)
def run_simulation(payload: SimulationPayload) -> SimulationResponse:
    result = simulate_financial_future(payload.model_dump())
    return SimulationResponse(**result)


@router.post("/simulation/compare", response_model=List[ScenarioResult])
def compare_simulation(payload: SimulationPayload) -> List[ScenarioResult]:
    result = simulate_financial_future(payload.model_dump())
    return [ScenarioResult(**item) for item in result.get("scenario_results", [])]
