"""Feature preprocessing utilities for transaction data."""

from __future__ import annotations

from datetime import datetime
from typing import Optional


def normalize_amount(amount: float) -> float:
	"""Clamp and scale amount to keep models stable on extreme values."""
	if amount < 0:
		raise ValueError("amount must be non-negative")
	return min(amount, 100000.0) / 100000.0


def safe_ratio(numerator: float, denominator: float) -> float:
	"""Return a bounded ratio and avoid division by zero."""
	if denominator <= 0:
		return 0.0
	return max(0.0, min(numerator / denominator, 5.0))


def extract_time_parts(ts: Optional[datetime]) -> tuple[int, int, int]:
	"""Extract day-of-month, hour, and weekend flag for temporal signals."""
	timestamp = ts or datetime.utcnow()
	day_of_month = timestamp.day
	hour = timestamp.hour
	is_weekend = 1 if timestamp.weekday() >= 5 else 0
	return day_of_month, hour, is_weekend
