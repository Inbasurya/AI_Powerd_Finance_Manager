"""Anomaly detection endpoints for unusual transactions."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.anomaly_service import run_anomaly_detection

router = APIRouter(tags=["Anomaly Detection"])


class TransactionInput(BaseModel):
    """Input transaction sample for anomaly analysis."""

    id: Optional[str] = Field(default=None, description="Transaction identifier")
    category: Optional[str] = Field(default=None, description="Category label")
    amount: float = Field(gt=0)
    account_balance: float = Field(default=1000.0, ge=0)
    merchant_risk: float = Field(default=0.3, ge=0, le=1)
    timestamp: Optional[datetime] = None
    description: Optional[str] = None


class AnomalyDetectionRequest(BaseModel):
    """List of transactions to evaluate for anomalies."""

    transactions: list[TransactionInput]


class AnomalyItem(BaseModel):
    """Flattened anomaly item for UI consumption."""

    transaction_id: Optional[str]
    amount: float
    category: Optional[str]
    anomaly_score: float
    is_anomaly: bool
    risk_type: Optional[str] = None
    anomaly_label: Optional[str] = None
    fraud_probability: Optional[float] = None
    explanation_factors: Optional[dict[str, float]] = None


class AnomalyDetectionResponse(BaseModel):
    """Anomaly results including fraud-like flags."""

    anomaly_count: int
    anomalies: list[AnomalyItem]


@router.post("/anomaly-detection", response_model=AnomalyDetectionResponse)
def anomaly_detection(payload: AnomalyDetectionRequest) -> AnomalyDetectionResponse:
    """Detect unusual transactions using Isolation Forest."""
    results = run_anomaly_detection([tx.model_dump() for tx in payload.transactions])

    anomalies: list[AnomalyItem] = []
    for item in results.get("results", []):
        tx: dict[str, Any] = item.get("transaction", {}) if isinstance(item, dict) else {}
        anomalies.append(
            AnomalyItem(
                transaction_id=tx.get("id") or tx.get("transaction_id"),
                amount=float(tx.get("amount", 0.0)),
                category=tx.get("category"),
                anomaly_score=float(item.get("anomaly_score", 0.0)),
                is_anomaly=bool(item.get("is_anomaly", False)),
                risk_type=item.get("risk_type"),
                anomaly_label=item.get("risk_type") or ("fraud" if item.get("is_anomaly") else "normal"),
                fraud_probability=float(item.get("fraud_probability", 0.78 if item.get("is_anomaly") else 0.05)),
                explanation_factors=item.get("explanation")
                or {
                    "amount_spike": round(float(tx.get("amount", 0)) / max(float(tx.get("account_balance", 1)), 1), 3),
                    "merchant_risk": float(tx.get("merchant_risk", 0)),
                },
            )
        )

    return AnomalyDetectionResponse(anomaly_count=results.get("anomaly_count", 0), anomalies=anomalies)


@router.post("/anomaly/detect", response_model=AnomalyDetectionResponse)
def anomaly_detection_alias(payload: AnomalyDetectionRequest) -> AnomalyDetectionResponse:
    """Alias endpoint for anomaly detection with richer fraud fields."""
    return anomaly_detection(payload)
