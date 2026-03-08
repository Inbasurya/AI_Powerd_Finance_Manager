"""Transaction ingestion and classification endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.ml_models import model_registry

router = APIRouter(tags=["Transactions"])


class ClassifyTransactionRequest(BaseModel):
	"""Payload for transaction category classification."""

	amount: float = Field(gt=0, description="Transaction amount")
	account_balance: float = Field(default=1000.0, ge=0)
	merchant_risk: float = Field(default=0.3, ge=0.0, le=1.0)
	timestamp: Optional[datetime] = None


class ClassifyTransactionResponse(BaseModel):
	"""Model output for a categorized transaction."""

	category: str
	confidence: float
	probabilities: dict[str, float]


@router.post("/classify-transaction", response_model=ClassifyTransactionResponse)
def classify_transaction(payload: ClassifyTransactionRequest) -> ClassifyTransactionResponse:
	"""Predict transaction category using a Random Forest model."""
	category, confidence, probabilities = model_registry.classify_transaction(
		amount=payload.amount,
		account_balance=payload.account_balance,
		merchant_risk=payload.merchant_risk,
		timestamp=payload.timestamp,
	)
	return ClassifyTransactionResponse(
		category=category,
		confidence=round(confidence, 4),
		probabilities=probabilities,
	)
