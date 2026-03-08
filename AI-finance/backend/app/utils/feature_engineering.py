"""Feature engineering helpers for ML model training and inference."""

from __future__ import annotations

from datetime import datetime
from typing import Optional, Union

import numpy as np

from app.utils.preprocessing import extract_time_parts, normalize_amount, safe_ratio


CLASSIFICATION_FEATURE_NAMES: list[str] = [
	"amount_norm",
	"day_of_month",
	"hour",
	"is_weekend",
	"balance_ratio",
	"merchant_risk",
]

FORECAST_FEATURE_NAMES: list[str] = ["month_index", "recent_avg", "trend"]

FINANCIAL_ANALYTICS_FEATURE_NAMES: list[str] = [
	"spending_ratio",
	"savings_rate",
	"investment_ratio",
	"debt_to_income",
	"anomaly_rate",
]


def build_classification_vector(
	amount: float,
	account_balance: float,
	merchant_risk: float,
	timestamp: Optional[datetime],
) -> np.ndarray:
	"""Create a feature vector for transaction classification."""
	day_of_month, hour, is_weekend = extract_time_parts(timestamp)
	vector = np.array(
		[
			normalize_amount(amount),
			float(day_of_month),
			float(hour),
			float(is_weekend),
			safe_ratio(amount, max(account_balance, 1.0)),
			max(0.0, min(merchant_risk, 1.0)),
		],
		dtype=float,
	)
	return vector


def build_forecast_vector(monthly_history: list[float]) -> np.ndarray:
	"""Convert historical monthly expenses into regression features."""
	if not monthly_history:
		raise ValueError("monthly_history cannot be empty")

	history = np.array(monthly_history, dtype=float)
	month_index = float(len(history) + 1)
	recent_window = history[-3:] if len(history) >= 3 else history
	recent_avg = float(np.mean(recent_window))
	trend = float(history[-1] - history[0]) / max(len(history) - 1, 1)
	return np.array([month_index, recent_avg, trend], dtype=float)


def compute_spending_ratio(expenses: float, income: float) -> float:
	"""Compute spending burden relative to income."""
	return safe_ratio(max(expenses, 0.0), max(income, 1.0))


def compute_savings_rate(savings: float, income: float) -> float:
	"""Compute savings ratio relative to income."""
	return safe_ratio(max(savings, 0.0), max(income, 1.0))


def compute_investment_ratio(investment: float, income: float) -> float:
	"""Compute investment allocation ratio relative to income."""
	return safe_ratio(max(investment, 0.0), max(income, 1.0))


def compute_debt_to_income(loan: float, income: float) -> float:
	"""Compute debt-to-income ratio used for financial risk modelling."""
	return safe_ratio(max(loan, 0.0), max(income, 1.0))


def compute_anomaly_rate(anomalies: Union[int, float], transactions: Union[int, float]) -> float:
	"""Compute anomaly density over total observed transactions."""
	return safe_ratio(max(float(anomalies), 0.0), max(float(transactions), 1.0))


def build_financial_analytics_features(
	*,
	income: float,
	expenses: float,
	savings: float,
	investment: float,
	loan: float,
	anomalies: Union[int, float],
	transactions: Union[int, float],
) -> dict[str, float]:
	"""Create advanced ratio features for score, risk, and forecast models."""
	return {
		"spending_ratio": compute_spending_ratio(expenses=expenses, income=income),
		"savings_rate": compute_savings_rate(savings=savings, income=income),
		"investment_ratio": compute_investment_ratio(investment=investment, income=income),
		"debt_to_income": compute_debt_to_income(loan=loan, income=income),
		"anomaly_rate": compute_anomaly_rate(anomalies=anomalies, transactions=transactions),
	}


def build_financial_analytics_vector(
	*,
	income: float,
	expenses: float,
	savings: float,
	investment: float,
	loan: float,
	anomalies: Union[int, float],
	transactions: Union[int, float],
) -> np.ndarray:
	"""Return ordered numeric feature vector for downstream ML pipelines."""
	features = build_financial_analytics_features(
		income=income,
		expenses=expenses,
		savings=savings,
		investment=investment,
		loan=loan,
		anomalies=anomalies,
		transactions=transactions,
	)
	return np.array(
		[features[name] for name in FINANCIAL_ANALYTICS_FEATURE_NAMES],
		dtype=float,
	)
