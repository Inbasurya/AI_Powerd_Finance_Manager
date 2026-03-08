"""Financial health scoring service."""

from __future__ import annotations

from datetime import datetime
from typing import Iterable

from app.schemas.score_schema import FinancialScoreRequest, FinancialScoreResponse, FinancialScoreHistoryItem, ShapBreakdown


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
	return max(low, min(high, value))


def _status_for_score(score: float) -> str:
	if score >= 85:
		return "Excellent"
	if score >= 70:
		return "Good"
	if score >= 55:
		return "Moderate"
	return "Risky"


def _liquidity_score(savings: float, investments: float, spending: float) -> float:
	"""Estimate liquidity using quick ratio style (cash + 40% investments vs spending)."""
	if spending <= 0:
		return 1.0
	liquid_capacity = savings + investments * 0.4
	return _clamp(liquid_capacity / max(spending, 1.0), 0.0, 1.5)


def _anomaly_penalty(anomalies: int) -> float:
	"""Penalize frequent anomalies with a smooth decay."""
	return _clamp(1.0 - min(anomalies, 10) * 0.08, 0.1, 1.0)


def compute_financial_score(payload: FinancialScoreRequest) -> FinancialScoreResponse:
	"""Compute weighted financial score and SHAP-style contributions."""

	income = payload.income
	spending = payload.spending
	savings = payload.savings
	investments = payload.investments
	anomalies = payload.anomalies
	liquid_assets = payload.liquid_assets

	savings_ratio = _clamp((savings + liquid_assets * 0.5) / income, 0.0, 1.5)
	investment_ratio = _clamp(investments / income, 0.0, 1.5)
	spending_inverse = _clamp(1.0 - (spending / income), -0.4, 1.2)
	anomaly_component = _anomaly_penalty(anomalies)
	liquidity_component = _liquidity_score(savings + liquid_assets, investments, spending)

	weighted = (
		0.30 * savings_ratio +
		0.25 * investment_ratio +
		0.20 * spending_inverse +
		0.15 * anomaly_component +
		0.10 * liquidity_component
	)
	score = _clamp(weighted, 0.0, 1.5) * 100
	status = _status_for_score(score)

	# SHAP-style contribution map (positive lifts, negative drags)
	savings_contrib = round((savings_ratio - 0.3) * 35, 2)
	spending_contrib = round((spending_inverse - 0.2) * 30, 2)
	investment_contrib = round((investment_ratio - 0.15) * 32, 2)
	anomaly_contrib = round((anomaly_component - 0.85) * 40, 2)
	liquidity_contrib = round((liquidity_component - 0.25) * 25, 2)

	shap = ShapBreakdown(
		savings=savings_contrib,
		spending=spending_contrib,
		investments=investment_contrib,
		anomalies=anomaly_contrib,
		liquidity=liquidity_contrib,
	)

	factors = {
		"savings_ratio": round(savings_ratio, 4),
		"investment_ratio": round(investment_ratio, 4),
		"spending_ratio_inverse": round(spending_inverse, 4),
		"anomaly_penalty": round(anomaly_component, 4),
		"liquidity_score": round(liquidity_component, 4),
	}

	return FinancialScoreResponse(score=round(score, 2), status=status, shap_explanation=shap, factors=factors)


def _default_history() -> list[FinancialScoreHistoryItem]:
	months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	seed = [68, 71, 75, 78, 77, 80, 82, 85, 86, 88, 87, 89]
	current_month = datetime.utcnow().month
	return [FinancialScoreHistoryItem(month=months[idx], score=float(seed[idx])) for idx in range(current_month)]


def merge_history(existing: Iterable[FinancialScoreHistoryItem] | None = None) -> list[FinancialScoreHistoryItem]:
	"""Return merged history with demo defaults when not available."""
	items = list(existing or [])
	return items or _default_history()
