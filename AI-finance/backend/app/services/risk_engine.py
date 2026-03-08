"""Financial risk prediction engine with SHAP explainability.

This module predicts whether a user is likely to enter debt within 3 months.
It uses a Gradient Boosting classifier and returns interpretable risk factors.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import numpy as np
import shap
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split


FEATURE_NAMES: list[str] = [
    "income",
    "monthly_expense",
    "savings",
    "loan_amount",
    "credit_card_usage",
    "investment",
    "spending_ratio",
    "anomaly_frequency",
]


@dataclass(frozen=True)
class RiskInput:
    """Input schema for 3-month debt risk prediction."""

    income: float
    monthly_expense: float
    savings: float
    loan_amount: float
    credit_card_usage: float
    investment: float
    spending_ratio: float
    anomaly_frequency: float


class FinancialRiskEngine:
    """Gradient Boosting debt risk classifier + SHAP explanation layer."""

    def __init__(self, random_state: int = 42) -> None:
        self.random_state = random_state
        self.model = GradientBoostingClassifier(random_state=random_state)
        self.background_x, self.training_metrics = self._train_model()
        self.explainer = shap.TreeExplainer(self.model)

    def _train_model(self) -> tuple[np.ndarray, dict[str, float]]:
        """Train a reproducible model on synthetic finance behavior patterns."""
        rng = np.random.default_rng(self.random_state)
        n_samples = 5000

        income = rng.uniform(20000, 250000, n_samples)
        monthly_expense = rng.uniform(12000, 220000, n_samples)
        savings = rng.uniform(0, 500000, n_samples)
        loan_amount = rng.uniform(0, 600000, n_samples)
        credit_card_usage = rng.uniform(0.0, 1.2, n_samples)
        investment = rng.uniform(0, 400000, n_samples)
        anomaly_frequency = rng.uniform(0.0, 1.0, n_samples)

        spending_ratio = np.divide(monthly_expense, np.maximum(income, 1.0))

        x = np.column_stack(
            [
                income,
                monthly_expense,
                savings,
                loan_amount,
                credit_card_usage,
                investment,
                spending_ratio,
                anomaly_frequency,
            ]
        )

        # Proxy risk function to create realistic training labels.
        risk_signal = (
            1.35 * np.clip(spending_ratio, 0.0, 2.0)
            + 0.75 * np.clip(credit_card_usage, 0.0, 1.2)
            + 0.55 * np.divide(loan_amount, np.maximum(income * 6.0, 1.0))
            + 0.45 * anomaly_frequency
            + 0.45 * np.maximum(0.0, 1.0 - np.divide(savings + investment, np.maximum(income * 3.0, 1.0)))
        )
        threshold = float(np.quantile(risk_signal, 0.58))
        y = (risk_signal > threshold).astype(int)

        x_train, x_test, y_train, y_test = train_test_split(
            x,
            y,
            test_size=0.2,
            random_state=self.random_state,
            stratify=y,
        )

        self.model.fit(x_train, y_train)
        accuracy = float(self.model.score(x_test, y_test))

        # Background sample for stable SHAP values.
        background_x = x_train[:500]
        metrics = {"accuracy": accuracy}
        return background_x, metrics

    @staticmethod
    def _risk_level(probability: float) -> str:
        if probability < 0.35:
            return "LOW"
        if probability < 0.70:
            return "MEDIUM"
        return "HIGH"

    @staticmethod
    def _semantic_factors(input_data: RiskInput) -> dict[str, float]:
        """Heuristic factor strengths (0..1) used alongside SHAP output."""
        high_spending = max(0.0, min(1.0, input_data.spending_ratio - 0.70))
        low_savings = max(
            0.0,
            min(1.0, 1.0 - ((input_data.savings + input_data.investment) / max(input_data.income * 2.0, 1.0))),
        )
        loan_dependency = max(0.0, min(1.0, input_data.loan_amount / max(input_data.income * 8.0, 1.0)))
        card_overuse = max(0.0, min(1.0, input_data.credit_card_usage - 0.45))
        anomaly_pattern = max(0.0, min(1.0, input_data.anomaly_frequency))

        return {
            "high_spending": round(high_spending, 4),
            "low_savings": round(low_savings, 4),
            "loan_dependency": round(loan_dependency, 4),
            "credit_utilization": round(card_overuse, 4),
            "anomaly_pattern": round(anomaly_pattern, 4),
        }

    def predict(self, input_data: RiskInput) -> dict[str, Any]:
        """Predict debt risk probability, risk level, and explanatory factors."""
        vector = np.array(
            [
                [
                    input_data.income,
                    input_data.monthly_expense,
                    input_data.savings,
                    input_data.loan_amount,
                    input_data.credit_card_usage,
                    input_data.investment,
                    input_data.spending_ratio,
                    input_data.anomaly_frequency,
                ]
            ],
            dtype=float,
        )

        risk_probability = float(self.model.predict_proba(vector)[0][1])
        risk_level = self._risk_level(risk_probability)

        shap_values = self.explainer.shap_values(vector)
        if isinstance(shap_values, list):
            class_one_values = np.array(shap_values[1][0], dtype=float)
        else:
            class_one_values = np.array(shap_values[0], dtype=float)

        feature_contrib = {
            name: round(float(value), 6)
            for name, value in zip(FEATURE_NAMES, class_one_values)
        }
        semantic = self._semantic_factors(input_data)

        # Blend semantic factor strengths with SHAP directionality for readability.
        factor_influence = {
            "high_spending": round(semantic["high_spending"] + max(0.0, feature_contrib["spending_ratio"]), 4),
            "low_savings": round(semantic["low_savings"] + max(0.0, -feature_contrib["savings"]), 4),
            "loan_dependency": round(semantic["loan_dependency"] + max(0.0, feature_contrib["loan_amount"]), 4),
            "credit_utilization": round(
                semantic["credit_utilization"] + max(0.0, feature_contrib["credit_card_usage"]), 4
            ),
            "anomaly_pattern": round(semantic["anomaly_pattern"] + max(0.0, feature_contrib["anomaly_frequency"]), 4),
        }

        # Return strongest 3 factors for concise API consumption.
        top_contributing_factors = dict(
            sorted(factor_influence.items(), key=lambda item: item[1], reverse=True)[:3]
        )

        return {
            "risk_probability": round(risk_probability, 4),
            "risk_level": risk_level,
            "factors_influencing_risk": factor_influence,
            "top_contributing_factors": top_contributing_factors,
            "feature_contribution_values": feature_contrib,
            "model": "GradientBoostingClassifier",
            "horizon_months": 3,
        }


@lru_cache(maxsize=1)
def get_risk_engine() -> FinancialRiskEngine:
    """Singleton engine to avoid repeated model training in process."""
    return FinancialRiskEngine()


def predict_financial_risk(
    *,
    income: float,
    monthly_expense: float,
    savings: float,
    loan_amount: float,
    credit_card_usage: float,
    investment: float,
    spending_ratio: float,
    anomaly_frequency: float,
) -> dict[str, Any]:
    """Convenience function for API routes/services.

    Returns example shape:
    {
      "risk_probability": 0.78,
      "risk_level": "HIGH",
      "factors_influencing_risk": {
        "high_spending": 0.35,
        "low_savings": 0.28,
        "loan_dependency": 0.15
      }
    }
    """
    payload = RiskInput(
        income=income,
        monthly_expense=monthly_expense,
        savings=savings,
        loan_amount=loan_amount,
        credit_card_usage=credit_card_usage,
        investment=investment,
        spending_ratio=spending_ratio,
        anomaly_frequency=anomaly_frequency,
    )
    return get_risk_engine().predict(payload)
