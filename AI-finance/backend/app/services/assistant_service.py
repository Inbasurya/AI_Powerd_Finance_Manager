"""Natural-language finance assistant orchestration service."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.utils.feature_engineering import (
	build_financial_analytics_features,
	compute_anomaly_rate,
)


@dataclass(frozen=True)
class AssistantContext:
	"""Context payload consumed by AI Wealth Assistant."""

	question: str
	income: float
	expenses: float
	savings: float
	investment: float
	loan: float
	anomalies: int
	transactions: int
	financial_score: float
	risk_probability: float
	risk_level: str


def _detect_intent(question: str) -> str:
	q = question.lower()
	if "score" in q or "financial score" in q:
		return "financial_score"
	if "save" in q or "savings" in q:
		return "savings"
	if "anomaly" in q or "fraud" in q or "suspicious" in q:
		return "anomaly"
	if "risk" in q or "debt" in q:
		return "risk"
	return "general"


def _score_reasoning(ctx: AssistantContext, features: dict[str, float]) -> list[str]:
	insights: list[str] = []
	if features["spending_ratio"] > 0.8:
		insights.append("Your spending ratio is high relative to income, which directly pulls your score down.")
	if features["savings_rate"] < 0.15:
		insights.append("Savings rate is below healthy threshold, reducing resilience in your score profile.")
	if features["investment_ratio"] < 0.08:
		insights.append("Investment allocation is low, limiting long-term score growth potential.")
	if features["anomaly_rate"] > 0.08:
		insights.append("Frequent anomalous transactions are introducing a behavioral risk penalty.")
	if not insights:
		insights.append("Your score is stable; incremental gains can come from reducing variable expenses.")
	return insights


def _savings_actions(features: dict[str, float]) -> list[str]:
	actions: list[str] = []
	if features["spending_ratio"] > 0.75:
		actions.append("Cut discretionary spending by 8-12% (dining, impulse shopping, subscriptions).")
	actions.append("Set an automatic monthly transfer to savings right after income credit.")
	if features["investment_ratio"] < 0.12:
		actions.append("Redirect a small fixed amount monthly toward low-volatility investments.")
	if features["debt_to_income"] > 1.2:
		actions.append("Prioritize high-interest debt repayment before increasing lifestyle spending.")
	return actions


def _anomaly_explanation(ctx: AssistantContext, anomaly_rate: float) -> list[str]:
	insights: list[str] = []
	insights.append(f"Anomaly frequency is {ctx.anomalies}/{ctx.transactions} transactions ({anomaly_rate:.2%}).")
	if anomaly_rate > 0.10:
		insights.append("This indicates elevated fraud-like or irregular behavior patterns.")
	elif anomaly_rate > 0.04:
		insights.append("This is moderate anomaly activity; monitor high-value and late-night transactions.")
	else:
		insights.append("Anomaly levels are currently low and within acceptable behavioral range.")
	insights.append("Review merchants with unusual amount spikes and location/time irregularities.")
	return insights


def _risk_explanation(ctx: AssistantContext) -> list[str]:
	insights = [
		f"Debt risk probability for next 3 months is {ctx.risk_probability:.1%} ({ctx.risk_level}).",
	]
	if ctx.risk_probability >= 0.7:
		insights.append("High risk is mainly associated with spending pressure and weak monthly cash buffer.")
	elif ctx.risk_probability >= 0.4:
		insights.append("Moderate risk can be reduced by tightening variable expenses and increasing reserve savings.")
	else:
		insights.append("Risk is currently controlled; maintain budget discipline to keep it low.")
	return insights


def generate_ai_assistant_response(ctx: AssistantContext) -> dict[str, Any]:
	"""Generate contextual assistant response from financial analytics results."""
	features = build_financial_analytics_features(
		income=ctx.income,
		expenses=ctx.expenses,
		savings=ctx.savings,
		investment=ctx.investment,
		loan=ctx.loan,
		anomalies=ctx.anomalies,
		transactions=ctx.transactions,
	)
	anomaly_rate = compute_anomaly_rate(ctx.anomalies, ctx.transactions)
	intent = _detect_intent(ctx.question)

	if intent == "financial_score":
		headline = "Financial score diagnostic"
		insights = _score_reasoning(ctx, features)
		recommendations = _savings_actions(features)
	elif intent == "savings":
		headline = "Savings improvement plan"
		insights = [
			f"Current savings rate is {features['savings_rate']:.1%}.",
			f"Spending ratio stands at {features['spending_ratio']:.1%}.",
		]
		recommendations = _savings_actions(features)
	elif intent == "anomaly":
		headline = "Anomaly detection interpretation"
		insights = _anomaly_explanation(ctx, anomaly_rate)
		recommendations = [
			"Enable alerts for high-value transactions.",
			"Audit foreign and late-night transactions weekly.",
		]
	elif intent == "risk":
		headline = "Debt risk outlook"
		insights = _risk_explanation(ctx)
		recommendations = _savings_actions(features)
	else:
		headline = "Financial intelligence summary"
		insights = [
			f"Financial score: {ctx.financial_score:.1f}.",
			f"Debt risk (3 months): {ctx.risk_probability:.1%} ({ctx.risk_level}).",
			f"Spending ratio: {features['spending_ratio']:.1%}, savings rate: {features['savings_rate']:.1%}.",
		]
		recommendations = _savings_actions(features)

	return {
		"headline": headline,
		"question": ctx.question,
		"intent": intent,
		"insights": insights,
		"recommendations": recommendations,
		"analytics_snapshot": {
			"financial_score": round(ctx.financial_score, 2),
			"risk_probability": round(ctx.risk_probability, 4),
			"risk_level": ctx.risk_level,
			"spending_ratio": round(features["spending_ratio"], 4),
			"savings_rate": round(features["savings_rate"], 4),
			"investment_ratio": round(features["investment_ratio"], 4),
			"debt_to_income": round(features["debt_to_income"], 4),
			"anomaly_rate": round(anomaly_rate, 4),
		},
	}
