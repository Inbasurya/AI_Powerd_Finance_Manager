"""Assets portfolio management endpoints."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db, init_db
from app.models.db_models import Asset

router = APIRouter(tags=["Assets"])

# Ensure tables exist on first import.
init_db()

ASSET_CATEGORIES = {
    # Real estate
    "Land",
    "House",
    "House / Real Estate",
    # Precious metals
    "Gold",
    "Silver",
    # Financial assets
    "Stocks",
    "Mutual Funds",
    "Crypto",
    "Bonds",
    # Savings / deposits
    "Bank Balance",
    "Bank Savings",
    "Fixed Deposit",
    # Other assets
    "Vehicle",
    "Vehicles",
    "Insurance",
    "Other",
    "Other Assets",
    "Cash",
}

CANONICAL_TYPES = {
    "House / Real Estate": "House",
    "Bank Savings": "Bank Balance",
    "Vehicles": "Vehicle",
    "Other Assets": "Other",
}

# Annualized appreciation/decline assumptions used for quick projections.
APPRECIATION_RATES = {
    "Land": 0.07,
    "House": 0.05,
    "Gold": 0.06,
    "Silver": 0.045,
    "Stocks": 0.10,
    "Mutual Funds": 0.08,
    "Crypto": 0.12,
    "Bonds": 0.04,
    "Bank Balance": 0.02,
    "Fixed Deposit": 0.05,
    "Vehicle": -0.07,
    "Insurance": 0.02,
    "Other": 0.02,
}


class AssetCreate(BaseModel):
    """Payload for adding a new asset."""

    name: str = Field(min_length=1, max_length=255)
    asset_type: str = Field(pattern=r".+", description="Asset category label")
    purchase_value: float = Field(ge=0, description="Initial purchase amount")
    current_value: float = Field(ge=0, description="Current market value")
    purchase_date: date
    location: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=2000)


class AssetOut(BaseModel):
    """Serialized asset response."""

    id: int
    name: str
    asset_type: str
    purchase_value: float
    current_value: float
    purchase_date: date
    location: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


class DistributionItem(BaseModel):
    """Portfolio allocation breakdown entry."""

    asset_type: str
    value: float
    percentage: float


class PortfolioSummary(BaseModel):
    """Aggregate portfolio statistics."""

    total_assets_value: float
    total_liabilities: float
    net_worth: float
    distribution: list[DistributionItem]
    net_worth_history: list[dict[str, Any]]
    diversification_score: float
    projected_net_worth_next_year: float
    appreciation_projection: list[dict[str, Any]]


class PortfolioResponse(BaseModel):
    """Unified response payload for portfolio endpoints."""

    assets: list[AssetOut]
    summary: PortfolioSummary


def _normalize_asset_type(asset_type: str) -> str:
    """Normalize asset labels to canonical forms while allowing legacy labels."""

    canonical = CANONICAL_TYPES.get(asset_type, asset_type)
    if canonical not in ASSET_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported asset_type '{asset_type}'.",
        )
    return canonical


def _build_distribution(assets: list[Asset]) -> list[DistributionItem]:
    totals: dict[str, float] = defaultdict(float)
    for asset in assets:
        normalized_type = _normalize_asset_type(asset.asset_type)
        totals[normalized_type] += float(asset.current_value or 0)

    portfolio_total = sum(totals.values()) or 1.0  # avoid division by zero
    distribution = [
        DistributionItem(
            asset_type=asset_type,
            value=round(value, 2),
            percentage=round((value / portfolio_total) * 100, 2),
        )
        for asset_type, value in sorted(totals.items(), key=lambda item: item[0])
    ]
    return distribution


def _compute_diversification_score(distribution: list[DistributionItem]) -> float:
    """Score 0-100 based on allocation evenness (entropy-based)."""

    if not distribution:
        return 0.0

    import math

    proportions = [item.percentage / 100 for item in distribution if item.percentage > 0]
    entropy = -sum(p * math.log(p) for p in proportions)
    max_entropy = math.log(len(proportions)) if proportions else 1
    score = (entropy / max_entropy) * 100 if max_entropy > 0 else 0
    return round(score, 2)


def _predict_appreciation(assets: list[Asset]) -> tuple[list[dict[str, Any]], float]:
    """Project next-year values per asset type using heuristic rates."""

    projections: dict[str, float] = defaultdict(float)
    total_current = 0.0
    for asset in assets:
        asset_type = _normalize_asset_type(asset.asset_type)
        current_value = float(asset.current_value or 0)
        total_current += current_value
        growth = APPRECIATION_RATES.get(asset_type, 0.02)
        projections[asset_type] += current_value * (1 + growth)

    projection_list = [
        {
            "asset_type": asset_type,
            "projected_value": round(value, 2),
            "assumed_growth_rate": APPRECIATION_RATES.get(asset_type, 0.02),
        }
        for asset_type, value in sorted(projections.items(), key=lambda item: item[0])
    ]

    projected_total = round(sum(value for value in projections.values()), 2)
    return projection_list, projected_total


def _build_net_worth_history(total_purchase: float, total_current: float) -> list[dict[str, Any]]:
    """Create a simple six-month glide path from purchase to current value."""

    end_value = round(total_current, 2)
    start_value = round(total_purchase if total_purchase > 0 else max(end_value * 0.85, 0), 2)
    points = []
    months_back = 5
    today = date.today()

    for idx in range(months_back, -1, -1):
        month_date = date(today.year, today.month, 1)
        # naive month subtraction
        month_index = month_date.toordinal() - idx * 30
        normalized_date = date.fromordinal(month_index)
        label = normalized_date.strftime("%b %Y")
        value = start_value + ((end_value - start_value) * (months_back - idx) / months_back)
        points.append({"label": label, "net_worth": round(value, 2)})

    return points


def _compose_response(assets: list[Asset]) -> PortfolioResponse:
    total_assets_value = round(sum(float(asset.current_value or 0) for asset in assets), 2)
    total_purchase_value = round(sum(float(asset.purchase_value or 0) for asset in assets), 2)
    total_liabilities = 0.0  # liabilities not tracked yet
    net_worth = round(total_assets_value - total_liabilities, 2)

    distribution = _build_distribution(assets)
    net_worth_history = _build_net_worth_history(total_purchase_value, total_assets_value)
    diversification_score = _compute_diversification_score(distribution)
    appreciation_projection, projected_total = _predict_appreciation(assets)
    projected_net_worth_next_year = round(projected_total - total_liabilities, 2)

    return PortfolioResponse(
        assets=assets,
        summary=PortfolioSummary(
            total_assets_value=total_assets_value,
            total_liabilities=total_liabilities,
            net_worth=net_worth,
            distribution=distribution,
            net_worth_history=net_worth_history,
            diversification_score=diversification_score,
            projected_net_worth_next_year=projected_net_worth_next_year,
            appreciation_projection=appreciation_projection,
        ),
    )


@router.post("/assets/add", response_model=PortfolioResponse, status_code=status.HTTP_201_CREATED)
def add_asset(payload: AssetCreate, db: Session = Depends(get_db)) -> PortfolioResponse:
    """Add a new asset record and return the updated portfolio."""

    normalized_type = _normalize_asset_type(payload.asset_type)
    payload_dict = payload.model_dump()
    payload_dict["asset_type"] = normalized_type

    asset = Asset(**payload_dict)
    db.add(asset)
    db.commit()
    db.refresh(asset)

    assets = db.query(Asset).order_by(Asset.created_at.desc()).all()
    return _compose_response(assets)


@router.get("/assets", response_model=PortfolioResponse)
def list_assets(db: Session = Depends(get_db)) -> PortfolioResponse:
    """Return full asset portfolio with summary stats."""

    assets = db.query(Asset).order_by(Asset.created_at.desc()).all()
    return _compose_response(assets)


@router.delete("/assets/{asset_id}", response_model=PortfolioResponse)
def delete_asset(asset_id: int, db: Session = Depends(get_db)) -> PortfolioResponse:
    """Delete an asset by id and return the updated portfolio."""

    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    db.delete(asset)
    db.commit()

    assets = db.query(Asset).order_by(Asset.created_at.desc()).all()
    return _compose_response(assets)
