"""Savings Strategy AI module.

This service recommends an optimal savings plan using:
1) rule-based finance heuristics, and
2) regression-based projection for completion timeline.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import numpy as np
from sklearn.linear_model import LinearRegression


@dataclass(frozen=True)
class SavingsStrategyInput:
    """Input schema for savings strategy recommendation."""

    income: float
    expenses: float
    target_goal: float
    deadline: float
    risk_level: str


class SavingsStrategyAI:
    """Hybrid rule-based + regression savings planning engine."""

    def __init__(self, random_state: int = 42) -> None:
        self.random_state = random_state
        self.model = self._train_projection_model()

    def _train_projection_model(self) -> LinearRegression:
        """Train regression model to estimate projected completion months."""
        rng = np.random.default_rng(self.random_state)
        n = 4000

        income = rng.uniform(18000, 280000, n)
        expenses = rng.uniform(9000, 250000, n)
        target_goal = rng.uniform(20000, 1500000, n)
        deadline = rng.uniform(1.0, 36.0, n)

        risk_levels = rng.choice(["LOW", "MEDIUM", "HIGH"], size=n, p=[0.35, 0.45, 0.2])
        risk_factor = np.where(risk_levels == "LOW", 1.08, np.where(risk_levels == "MEDIUM", 1.0, 0.92))

        free_cash = np.maximum(income - expenses, 1000.0)
        monthly_save_capacity = free_cash * (0.34 * risk_factor)
        months_to_goal = np.divide(target_goal, np.maximum(monthly_save_capacity, 1.0))

        # Slight noise to mimic real behavior uncertainty.
        months_to_goal += rng.normal(0.0, 0.6, n)
        months_to_goal = np.clip(months_to_goal, 0.5, 72.0)

        x = np.column_stack(
            [
                income,
                expenses,
                target_goal,
                deadline,
                np.where(risk_levels == "LOW", 0.0, np.where(risk_levels == "MEDIUM", 1.0, 2.0)),
                np.divide(expenses, np.maximum(income, 1.0)),
            ]
        )

        reg = LinearRegression()
        reg.fit(x, months_to_goal)
        return reg

    @staticmethod
    def _normalize_risk_level(risk_level: str) -> str:
        level = risk_level.strip().upper()
        if level not in {"LOW", "MEDIUM", "HIGH"}:
            return "MEDIUM"
        return level

    @staticmethod
    def _risk_multiplier(risk_level: str) -> float:
        if risk_level == "LOW":
            return 0.85
        if risk_level == "HIGH":
            return 1.15
        return 1.0

    @staticmethod
    def _strategy_message(expense_ratio: float, risk_level: str, monthly_boost_pct: float) -> str:
        tips: list[str] = []
        if expense_ratio > 0.8:
            tips.append("reduce discretionary spending (dining/shopping)")
        elif expense_ratio > 0.65:
            tips.append("optimize recurring bills and subscriptions")
        else:
            tips.append("maintain current expense discipline")

        if risk_level == "HIGH":
            tips.append("prioritize emergency buffer over high-risk investments")
        elif risk_level == "LOW":
            tips.append("allocate a small portion to stable long-term investments")

        tips_text = " and ".join(tips)
        return f"{tips_text}; increase monthly savings by {monthly_boost_pct:.1f}%"

    def _predict_months(self, payload: SavingsStrategyInput) -> float:
        risk_numeric = 0.0 if payload.risk_level == "LOW" else (1.0 if payload.risk_level == "MEDIUM" else 2.0)
        x = np.array(
            [
                [
                    payload.income,
                    payload.expenses,
                    payload.target_goal,
                    payload.deadline,
                    risk_numeric,
                    payload.expenses / max(payload.income, 1.0),
                ]
            ],
            dtype=float,
        )
        pred = float(self.model.predict(x)[0])
        return max(0.5, pred)

    def recommend(self, payload: SavingsStrategyInput) -> dict[str, Any]:
        """Generate savings strategy recommendation and simulation baseline."""
        expense_ratio = payload.expenses / max(payload.income, 1.0)
        free_cash = max(payload.income - payload.expenses, 0.0)

        risk_mult = self._risk_multiplier(payload.risk_level)
        baseline_save_ratio = min(0.45, max(0.12, 0.25 * risk_mult))
        monthly_saving_required = payload.target_goal / max(payload.deadline, 1.0)

        recommended_monthly_saving = max(monthly_saving_required, free_cash * baseline_save_ratio)
        monthly_boost_pct = max(0.0, ((recommended_monthly_saving / max(free_cash * 0.22, 1.0)) - 1.0) * 100.0)

        projected_months = self._predict_months(payload)
        strategy = self._strategy_message(expense_ratio, payload.risk_level, monthly_boost_pct)

        return {
            "monthly_saving_required": round(recommended_monthly_saving, 2),
            "recommended_strategy": strategy,
            "projected_goal_completion": f"{projected_months:.1f} months",
            "baseline": {
                "income": round(payload.income, 2),
                "expenses": round(payload.expenses, 2),
                "free_cash_flow": round(free_cash, 2),
                "expense_ratio": round(expense_ratio, 4),
            },
        }

    def simulate_scenario(
        self,
        payload: SavingsStrategyInput,
        *,
        spending_reduction_pct: float = 0.0,
        income_increase_pct: float = 0.0,
        extra_monthly_investment: float = 0.0,
    ) -> dict[str, Any]:
        """Run what-if simulation on spending/income/investment adjustments.

        Example: What if user reduces spending by 10%?
        """
        reduction = max(0.0, min(spending_reduction_pct, 90.0)) / 100.0
        income_boost = max(0.0, min(income_increase_pct, 300.0)) / 100.0

        adjusted_income = payload.income * (1.0 + income_boost)
        adjusted_expenses = payload.expenses * (1.0 - reduction)

        adjusted = SavingsStrategyInput(
            income=adjusted_income,
            expenses=adjusted_expenses,
            target_goal=payload.target_goal,
            deadline=payload.deadline,
            risk_level=payload.risk_level,
        )

        base_result = self.recommend(payload)
        adjusted_result = self.recommend(adjusted)

        adjusted_monthly = adjusted_result["monthly_saving_required"] + max(0.0, extra_monthly_investment)
        projected_months = payload.target_goal / max(adjusted_monthly, 1.0)

        return {
            "scenario": {
                "spending_reduction_pct": round(spending_reduction_pct, 2),
                "income_increase_pct": round(income_increase_pct, 2),
                "extra_monthly_investment": round(extra_monthly_investment, 2),
            },
            "base_plan": base_result,
            "adjusted_plan": {
                "monthly_saving_required": round(adjusted_monthly, 2),
                "recommended_strategy": adjusted_result["recommended_strategy"],
                "projected_goal_completion": f"{projected_months:.1f} months",
            },
            "impact_summary": {
                "monthly_saving_delta": round(adjusted_monthly - base_result["monthly_saving_required"], 2),
                "completion_time_improvement_months": round(
                    float(base_result["projected_goal_completion"].split()[0]) - projected_months,
                    2,
                ),
            },
        }


@lru_cache(maxsize=1)
def get_savings_strategy_ai() -> SavingsStrategyAI:
    """Singleton accessor for Savings Strategy AI engine."""
    return SavingsStrategyAI()


def recommend_savings_strategy(
    *,
    income: float,
    expenses: float,
    target_goal: float,
    deadline: float,
    risk_level: str,
) -> dict[str, Any]:
    """Public helper for direct recommendation output."""
    normalized_risk = SavingsStrategyAI._normalize_risk_level(risk_level)
    payload = SavingsStrategyInput(
        income=income,
        expenses=expenses,
        target_goal=target_goal,
        deadline=deadline,
        risk_level=normalized_risk,
    )
    return get_savings_strategy_ai().recommend(payload)


def simulate_savings_scenario(
    *,
    income: float,
    expenses: float,
    target_goal: float,
    deadline: float,
    risk_level: str,
    spending_reduction_pct: float = 0.0,
    income_increase_pct: float = 0.0,
    extra_monthly_investment: float = 0.0,
) -> dict[str, Any]:
    """Public helper for scenario simulation."""
    normalized_risk = SavingsStrategyAI._normalize_risk_level(risk_level)
    payload = SavingsStrategyInput(
        income=income,
        expenses=expenses,
        target_goal=target_goal,
        deadline=deadline,
        risk_level=normalized_risk,
    )
    return get_savings_strategy_ai().simulate_scenario(
        payload,
        spending_reduction_pct=spending_reduction_pct,
        income_increase_pct=income_increase_pct,
        extra_monthly_investment=extra_monthly_investment,
    )
