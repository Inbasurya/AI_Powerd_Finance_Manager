"""Portfolio optimization endpoints."""

from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.portfolio_optimizer import optimize_portfolio

router = APIRouter(tags=["Portfolio Optimizer"])


class ExistingAsset(BaseModel):
    asset: str
    amount: float


class PortfolioPayload(BaseModel):
    monthly_income: float = Field(default=90000, ge=0)
    monthly_expense: float = Field(default=60000, ge=0)
    current_savings: float = Field(default=350000, ge=0)
    risk_tolerance: str = Field(default="medium")
    investment_horizon: float = Field(default=7.0, ge=1)
    existing_assets: Optional[Dict[str, float]] = None
    investment_amount: Optional[float] = Field(default=None, ge=0)
    asset_classes: Optional[List[str]] = None


class AllocationResponse(BaseModel):
    recommended_allocation: Dict[str, float]
    expected_return: float
    portfolio_risk: float
    sharpe_ratio: float
    explanation: List[str]
    growth_forecast: List[Dict[str, float]]
    risk_return_points: List[Dict[str, float]]


@router.post("/portfolio/optimize", response_model=AllocationResponse)
def optimize_portfolio_endpoint(payload: PortfolioPayload) -> AllocationResponse:
    result = optimize_portfolio(payload.model_dump())
    return AllocationResponse(**result)
