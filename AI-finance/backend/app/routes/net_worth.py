"""Net worth calculation API."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.net_worth import ASSET_CATEGORIES, LIABILITY_CATEGORIES, calculate_net_worth

router = APIRouter(tags=["Net Worth"])


class NetWorthRequest(BaseModel):
    """Assets and liabilities payload for net worth calculation."""

    land: Optional[float] = Field(default=0, ge=0)
    house: Optional[float] = Field(default=0, ge=0)
    gold: Optional[float] = Field(default=0, ge=0)
    silver: Optional[float] = Field(default=0, ge=0)
    stocks: Optional[float] = Field(default=0, ge=0)
    mutual_funds: Optional[float] = Field(default=0, ge=0)
    crypto: Optional[float] = Field(default=0, ge=0)
    bonds: Optional[float] = Field(default=0, ge=0)
    bank_balance: Optional[float] = Field(default=0, ge=0)
    fixed_deposit: Optional[float] = Field(default=0, ge=0)
    savings: Optional[float] = Field(default=0, ge=0)
    vehicles: Optional[float] = Field(default=0, ge=0)
    insurance: Optional[float] = Field(default=0, ge=0)
    investments: Optional[float] = Field(default=0, ge=0)
    other: Optional[float] = Field(default=0, ge=0)

    loans: Optional[float] = Field(default=0, ge=0)
    credit_card_debt: Optional[float] = Field(default=0, ge=0)
    mortgage: Optional[float] = Field(default=0, ge=0)


class NetWorthResponse(BaseModel):
    """Net worth summary response."""

    total_assets: float
    total_liabilities: float
    net_worth: float


@router.post("/net-worth", response_model=NetWorthResponse)
def net_worth(payload: NetWorthRequest) -> NetWorthResponse:
    """Calculate net worth from provided assets and liabilities."""

    assets = {
        "Land": payload.land,
        "House": payload.house,
        "Gold": payload.gold,
        "Silver": payload.silver,
        "Stocks": payload.stocks,
        "Mutual Funds": payload.mutual_funds,
        "Crypto": payload.crypto,
        "Bonds": payload.bonds,
        "Bank Balance": payload.bank_balance or payload.savings,
        "Fixed Deposit": payload.fixed_deposit,
        "Savings": payload.savings,
        "Vehicles": payload.vehicles,
        "Insurance": payload.insurance,
        "Investments": payload.investments,
        "Other": payload.other,
    }
    liabilities = {
        "Loans": payload.loans,
        "Credit card debt": payload.credit_card_debt,
        "Mortgage": payload.mortgage,
    }

    summary = calculate_net_worth(assets, liabilities)
    return NetWorthResponse(**summary)
