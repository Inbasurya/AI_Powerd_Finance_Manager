"""Financial score payload schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class FinancialScoreRequest(BaseModel):
	"""Input payload for computing a financial health score."""

	income: float = Field(gt=0, description="Monthly or annual income used to normalize ratios")
	spending: float = Field(ge=0, description="Total spending for the same period as income")
	savings: float = Field(ge=0, description="Savings accumulated for the same period")
	investments: float = Field(default=0, ge=0, description="Investments allocated (equities, bonds, funds)")
	anomalies: int = Field(default=0, ge=0, description="Number of detected spending anomalies or fraud flags")
	liquid_assets: float = Field(default=0, ge=0, description="Cash and near-cash for liquidity scoring")


class ShapBreakdown(BaseModel):
	"""SHAP-style contribution summary for transparency."""

	savings: float
	spending: float
	investments: float
	anomalies: float
	liquidity: float


class FinancialScoreResponse(BaseModel):
	"""Financial score output normalized to 0-100."""

	score: float = Field(ge=0, le=100)
	status: Literal["Excellent", "Good", "Moderate", "Risky"]
	shap_explanation: ShapBreakdown
	factors: dict[str, float]


class FinancialScoreHistoryItem(BaseModel):
	"""Historical score time-series item."""

	month: str
	score: float
