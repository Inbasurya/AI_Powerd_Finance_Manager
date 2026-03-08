"""AI wealth assistant endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.assistant_service import AssistantContext, generate_ai_assistant_response

router = APIRouter(tags=["AI Wealth Assistant"])


class AIAssistantRequest(BaseModel):
	"""Request payload for AI Wealth Assistant."""

	question: str = Field(min_length=3, description="User question for financial guidance")
	income: float = Field(gt=0)
	expenses: float = Field(ge=0)
	savings: float = Field(ge=0)
	investment: float = Field(default=0, ge=0)
	loan: float = Field(default=0, ge=0)
	anomalies: int = Field(default=0, ge=0)
	transactions: int = Field(default=1, ge=1)
	financial_score: float = Field(default=50, ge=0, le=100)
	risk_probability: float = Field(default=0.5, ge=0, le=1)
	risk_level: str = Field(default="MEDIUM")


class AIAssistantResponse(BaseModel):
	"""Structured AI Wealth Assistant response."""

	headline: str
	question: str
	intent: str
	insights: list[str]
	recommendations: list[str]
	analytics_snapshot: dict[str, Any]


@router.post("/ai-assistant", response_model=AIAssistantResponse)
def ai_assistant(payload: AIAssistantRequest) -> AIAssistantResponse:
	"""Generate AI-based insight response from user financial analytics."""
	result = generate_ai_assistant_response(
		AssistantContext(
			question=payload.question,
			income=payload.income,
			expenses=payload.expenses,
			savings=payload.savings,
			investment=payload.investment,
			loan=payload.loan,
			anomalies=payload.anomalies,
			transactions=payload.transactions,
			financial_score=payload.financial_score,
			risk_probability=payload.risk_probability,
			risk_level=payload.risk_level.upper(),
		)
	)
	return AIAssistantResponse(**result)
