"""Family budget management endpoints."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db, init_db
from app.models.db_models import FamilyMember

router = APIRouter(tags=["Family Budget"])

# Ensure table exists at import time.
init_db()


class FamilyMemberCreate(BaseModel):
    """Payload for creating a family member."""

    name: str = Field(min_length=1, max_length=255)
    role: str = Field(min_length=1, max_length=120)
    monthly_income: float = Field(default=0, ge=0)
    monthly_expense: float = Field(default=0, ge=0)
    savings: float = Field(default=0, ge=0)
    contribution: float = Field(default=0, ge=0, description="Contribution to household")


class FamilyMemberOut(BaseModel):
    """Serialized family member."""

    id: int
    name: str
    role: str
    monthly_income: float
    monthly_expense: float
    savings: float
    contribution: float

    class Config:
        orm_mode = True


class FamilySummary(BaseModel):
    """Aggregate family finance summary."""

    total_income: float
    total_expense: float
    savings_rate: float
    total_savings: float
    highest_contributor: Optional[Dict[str, Any]]
    member_count: int
    income_breakdown: List[Dict[str, Any]]
    expense_breakdown: List[Dict[str, Any]]


class FamilyResponse(BaseModel):
    """Unified response for family endpoints."""

    members: List[FamilyMemberOut]
    summary: FamilySummary


def _compute_summary(members: list[FamilyMember]) -> FamilySummary:
    total_income = sum(float(m.monthly_income or 0) for m in members)
    total_expense = sum(float(m.monthly_expense or 0) for m in members)
    total_savings = sum(float(m.savings or 0) for m in members)
    savings_rate = 0.0
    if total_income > 0:
        savings_rate = round(((total_income - total_expense) / total_income) * 100, 2)

    highest = None
    if members:
        top_member = max(members, key=lambda m: m.contribution or 0)
        highest = {
            "name": top_member.name,
            "role": top_member.role,
            "contribution": float(top_member.contribution or 0),
        }

    income_breakdown = [
        {"name": m.name, "role": m.role, "income": float(m.monthly_income or 0)}
        for m in members
    ]
    expense_breakdown = [
        {"name": m.name, "role": m.role, "expense": float(m.monthly_expense or 0)}
        for m in members
    ]

    return FamilySummary(
        total_income=round(total_income, 2),
        total_expense=round(total_expense, 2),
        total_savings=round(total_savings, 2),
        savings_rate=savings_rate,
        highest_contributor=highest,
        member_count=len(members),
        income_breakdown=income_breakdown,
        expense_breakdown=expense_breakdown,
    )


def _compose_response(db: Session) -> FamilyResponse:
    members = db.query(FamilyMember).order_by(FamilyMember.created_at.desc()).all()
    summary = _compute_summary(members)
    return FamilyResponse(members=members, summary=summary)


@router.post("/family/add-member", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
def add_member(payload: FamilyMemberCreate, db: Session = Depends(get_db)) -> FamilyResponse:
    """Add a family member and return updated summary."""

    member = FamilyMember(**payload.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return _compose_response(db)


@router.get("/family/members", response_model=FamilyResponse)
def list_members(db: Session = Depends(get_db)) -> FamilyResponse:
    """List family members with summary."""

    return _compose_response(db)


@router.get("/family/summary", response_model=FamilySummary)
def family_summary(db: Session = Depends(get_db)) -> FamilySummary:
    """Return household financial summary only."""

    members = db.query(FamilyMember).all()
    return _compute_summary(members)
