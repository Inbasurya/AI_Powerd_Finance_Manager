"""Expense prediction, overspending checks, and explainable AI endpoints."""

from __future__ import annotations

from typing import Any, Dict, Literal, Optional, Union

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.debt_risk_service import predict_debt_risk
from app.services.explainability import (
    explain_expense_forecast,
    explain_financial_score,
    explain_risk_prediction,
)
from app.services.ml_models import model_registry
from app.services.risk_engine import predict_financial_risk

router = APIRouter(tags=["Prediction"])


class PredictExpenseRequest(BaseModel):
    """Payload for monthly expense forecasting."""

    monthly_history: list[float] = Field(min_length=3, description="Historical monthly expenses")
    category_history: dict[str, list[float]] = Field(default_factory=dict)


class PredictExpenseResponse(BaseModel):
    """Predicted total and category-level spending trend."""

    next_month_expense: float
    category_spending_trend: dict[str, float]


class PredictOverspendingRequest(BaseModel):
    """Payload for overspending risk estimation."""

    budget: float = Field(gt=0)
    monthly_history: list[float] = Field(min_length=3)


class PredictOverspendingResponse(BaseModel):
    """Overspending output with delta and risk level."""

    predicted_spending: float
    budget: float
    overspending_amount: float
    will_overspend: bool
    risk_level: str


class DebtRiskPredictRequest(BaseModel):
    """Payload for 3-month debt risk forecasting."""

    income: float = Field(gt=0)
    monthly_budget: float = Field(gt=0)
    current_savings: float = Field(ge=0)
    current_investment: float = Field(default=0, ge=0)
    monthly_expense_history: list[float] = Field(min_length=3)
    anomalies_recent: int = Field(default=0, ge=0)
    foreign_transactions: int = Field(default=0, ge=0)
    late_night_transactions: int = Field(default=0, ge=0)


class DebtRiskPredictResponse(BaseModel):
    """Debt risk model output for next 3 months."""

    will_go_into_debt: bool
    debt_risk_probability: float
    risk_level: str
    forecast_horizon_months: int
    risk_factors: Dict[str, Union[float, int]]


class FinancialRiskRequest(BaseModel):
    """Input payload for 3-month financial risk predictor engine."""

    income: float = Field(gt=0)
    monthly_expense: float = Field(ge=0)
    savings: float = Field(ge=0)
    loan_amount: float = Field(ge=0)
    credit_card_usage: float = Field(ge=0)
    investment: float = Field(ge=0)
    spending_ratio: float = Field(ge=0)
    anomaly_frequency: float = Field(ge=0)


class FinancialRiskResponse(BaseModel):
    """Financial risk prediction output with SHAP-informed factors."""

    risk_probability: float
    risk_level: str
    factors_influencing_risk: dict[str, float]
    top_contributing_factors: dict[str, float]
    feature_contribution_values: dict[str, float]
    model: str
    horizon_months: int


class ExplainModelRequest(BaseModel):
    """Payload for SHAP-based model explanation."""

    model_type: Literal["financial_score", "risk_prediction", "expense_forecast", "forecast"]

    # Financial score explanation fields
    monthly_history: list[float] = Field(default_factory=list)
    income: Optional[float] = Field(default=None, gt=0)
    spending: Optional[float] = Field(default=None, ge=0)
    savings_rate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    anomalies: int = Field(default=0, ge=0)
    investment_ratio: Optional[float] = Field(default=None, ge=0.0, le=1.0)

    # Risk prediction explanation fields
    monthly_expense: Optional[float] = Field(default=None, ge=0)
    savings: Optional[float] = Field(default=None, ge=0)
    investment: Optional[float] = Field(default=None, ge=0)
    loan_amount: Optional[float] = Field(default=None, ge=0)
    credit_card_usage: Optional[float] = Field(default=None, ge=0)
    spending_ratio: Optional[float] = Field(default=None, ge=0)
    anomaly_frequency: Optional[float] = Field(default=None, ge=0)


class ExplainModelResponse(BaseModel):
    """Unified SHAP explanation response schema."""

    model_type: str
    feature_importance: dict[str, float]
    contribution_values: dict[str, float]
    positive_impact_features: dict[str, float] = Field(default_factory=dict)
    negative_impact_features: dict[str, float] = Field(default_factory=dict)
    base_value: float
    target_class: Optional[str] = None
    predicted_score: Optional[float] = None
    prediction: Optional[float] = None
    risk_level: Optional[str] = None
    top_contributing_factors: Optional[dict[str, float]] = None


@router.post("/predict-expense", response_model=PredictExpenseResponse)
def predict_expense(payload: PredictExpenseRequest) -> PredictExpenseResponse:
    """Predict next month expense with Linear Regression."""
    predicted = model_registry.predict_expense(payload.monthly_history)

    category_trend: dict[str, float] = {}
    for category, history in payload.category_history.items():
        if len(history) < 2:
            category_trend[category] = 0.0
            continue
        trend = float(np.mean(np.diff(np.array(history, dtype=float))))
        category_trend[category] = round(trend, 4)

    return PredictExpenseResponse(
        next_month_expense=round(predicted, 2),
        category_spending_trend=category_trend,
    )


@router.post("/predict-overspending", response_model=PredictOverspendingResponse)
def predict_overspending(payload: PredictOverspendingRequest) -> PredictOverspendingResponse:
    """Compare predicted spending against provided budget."""
    predicted = model_registry.predict_expense(payload.monthly_history)
    overspending_amount = max(0.0, predicted - payload.budget)
    will_overspend = overspending_amount > 0

    budget_ratio = predicted / payload.budget
    if budget_ratio < 0.9:
        risk_level = "Low"
    elif budget_ratio <= 1.0:
        risk_level = "Medium"
    else:
        risk_level = "High"

    return PredictOverspendingResponse(
        predicted_spending=round(predicted, 2),
        budget=round(payload.budget, 2),
        overspending_amount=round(overspending_amount, 2),
        will_overspend=will_overspend,
        risk_level=risk_level,
    )


@router.post("/predict-debt-risk", response_model=DebtRiskPredictResponse)
def predict_debt_risk_endpoint(payload: DebtRiskPredictRequest) -> DebtRiskPredictResponse:
    """Predict whether user may go into debt within next 3 months."""
    result = predict_debt_risk(
        income=payload.income,
        monthly_budget=payload.monthly_budget,
        current_savings=payload.current_savings,
        current_investment=payload.current_investment,
        monthly_expense_history=payload.monthly_expense_history,
        anomalies_recent=payload.anomalies_recent,
        foreign_transactions=payload.foreign_transactions,
        late_night_transactions=payload.late_night_transactions,
    )
    return DebtRiskPredictResponse(**result)


@router.post("/predict-financial-risk", response_model=FinancialRiskResponse)
def predict_financial_risk_endpoint(payload: FinancialRiskRequest) -> FinancialRiskResponse:
    """Predict debt risk in next 3 months with explainable factor contributions."""
    result = predict_financial_risk(
        income=payload.income,
        monthly_expense=payload.monthly_expense,
        savings=payload.savings,
        loan_amount=payload.loan_amount,
        credit_card_usage=payload.credit_card_usage,
        investment=payload.investment,
        spending_ratio=payload.spending_ratio,
        anomaly_frequency=payload.anomaly_frequency,
    )
    return FinancialRiskResponse(**result)


@router.post("/risk-predict", response_model=FinancialRiskResponse)
def risk_predict_endpoint(payload: FinancialRiskRequest) -> FinancialRiskResponse:
    """Alias endpoint for financial debt risk prediction in next 3 months."""
    result = predict_financial_risk(
        income=payload.income,
        monthly_expense=payload.monthly_expense,
        savings=payload.savings,
        loan_amount=payload.loan_amount,
        credit_card_usage=payload.credit_card_usage,
        investment=payload.investment,
        spending_ratio=payload.spending_ratio,
        anomaly_frequency=payload.anomaly_frequency,
    )
    return FinancialRiskResponse(**result)


@router.post("/explain-model", response_model=ExplainModelResponse)
def explain_model(payload: ExplainModelRequest) -> ExplainModelResponse:
    """Provide SHAP explanation for supported model predictions."""
    result: dict[str, Any]
    if payload.model_type == "financial_score":
        income = payload.income
        spending = payload.spending
        savings_rate = payload.savings_rate
        investment_ratio = payload.investment_ratio

        if (
            income is None
            or spending is None
            or savings_rate is None
            or investment_ratio is None
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "income, spending, savings_rate, and investment_ratio "
                    "are required for financial_score explanation"
                ),
            )
        result = explain_financial_score(
            income=income,
            spending=spending,
            savings_rate=savings_rate,
            anomalies=payload.anomalies,
            investment_ratio=investment_ratio,
        )
    elif payload.model_type == "risk_prediction":
        required = [
            payload.income,
            payload.monthly_expense,
            payload.savings,
            payload.investment,
            payload.loan_amount,
            payload.credit_card_usage,
            payload.spending_ratio,
            payload.anomaly_frequency,
        ]
        if any(value is None for value in required):
            raise HTTPException(
                status_code=400,
                detail=(
                    "income, monthly_expense, savings, investment, loan_amount, "
                    "credit_card_usage, spending_ratio, and anomaly_frequency are "
                    "required for risk_prediction explanation"
                ),
            )
        result = explain_risk_prediction(
            income=payload.income,
            monthly_expense=payload.monthly_expense,
            savings=payload.savings,
            investment=payload.investment,
            loan_amount=payload.loan_amount,
            credit_card_usage=payload.credit_card_usage,
            spending_ratio=payload.spending_ratio,
            anomaly_frequency=payload.anomaly_frequency,
        )
    elif payload.model_type in {"expense_forecast", "forecast"}:
        if len(payload.monthly_history) >= 4:
            result = explain_expense_forecast(payload.monthly_history)
            if payload.model_type == "forecast":
                result["model_type"] = "forecast"
        elif payload.model_type == "forecast" and len(payload.monthly_history) >= 3:
            income = max(float(np.mean(payload.monthly_history) * 1.5), 1.0)
            spending = float(payload.monthly_history[-1])
            savings_rate = max(0.0, min((income - spending) / income, 1.0))
            investment_ratio = 0.1
            result = explain_financial_score(
                income=income,
                spending=spending,
                savings_rate=savings_rate,
                anomalies=payload.anomalies,
                investment_ratio=investment_ratio,
            )
            result["model_type"] = "forecast"
        else:
            raise HTTPException(
                status_code=400,
                detail="monthly_history with at least 4 entries is required for expense_forecast explanation",
            )
    else:
        raise HTTPException(status_code=400, detail="unsupported model_type")

    return ExplainModelResponse(**result)
