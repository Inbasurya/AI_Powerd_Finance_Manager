"""Isolation Forest anomaly detection service."""

from __future__ import annotations

from datetime import datetime

import numpy as np

from app.services.ml_models import model_registry
from app.utils.feature_engineering import build_classification_vector


def run_anomaly_detection(transactions: list[dict]) -> dict[str, object]:
	"""Detect unusual transactions and return detailed anomaly output."""
	if not transactions:
		return {"anomaly_count": 0, "results": []}

	vectors: list[np.ndarray] = []
	normalized_payload: list[dict[str, object]] = []

	for tx in transactions:
		amount = float(tx.get("amount", 0.0))
		account_balance = float(tx.get("account_balance", max(amount * 5, 1.0)))
		merchant_risk = float(tx.get("merchant_risk", 0.3))
		timestamp_raw = tx.get("timestamp")
		timestamp = (
			datetime.fromisoformat(timestamp_raw)
			if isinstance(timestamp_raw, str)
			else datetime.utcnow()
		)
		vectors.append(
			build_classification_vector(
				amount=amount,
				account_balance=account_balance,
				merchant_risk=merchant_risk,
				timestamp=timestamp,
			)
		)
		normalized_payload.append(tx)

	matrix = np.array(vectors, dtype=float)
	labels, scores = model_registry.detect_anomaly_scores(matrix)

	results: list[dict[str, object]] = []
	anomaly_count = 0
	for tx, label, score in zip(normalized_payload, labels, scores, strict=False):
		is_anomaly = int(label) == -1
		if is_anomaly:
			anomaly_count += 1
		results.append(
			{
				"transaction": tx,
				"is_anomaly": is_anomaly,
				"risk_type": "fraud-like activity" if is_anomaly else "normal",
				"anomaly_score": round(float(score), 6),
			}
		)

	return {"anomaly_count": anomaly_count, "results": results}
