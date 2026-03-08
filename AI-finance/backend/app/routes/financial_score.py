"""Financial health scoring endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.score_schema import FinancialScoreRequest, FinancialScoreResponse, FinancialScoreHistoryItem
from app.services.financial_score_service import compute_financial_score, merge_history

router = APIRouter(tags=["Financial Score"])


@router.post("/financial/score", response_model=FinancialScoreResponse)
def financial_score(payload: FinancialScoreRequest) -> FinancialScoreResponse:
	"""Compute financial health using weighted fintech model with SHAP-style transparency."""
	return compute_financial_score(payload)


@router.get("/financial/score/history", response_model=list[FinancialScoreHistoryItem])
def financial_score_history() -> list[FinancialScoreHistoryItem]:
	"""Return historical financial score series with demo-safe defaults."""
	return merge_history()
