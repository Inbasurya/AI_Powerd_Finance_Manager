"""Financial forecasting utilities with Monte Carlo simulation and explainability."""

from __future__ import annotations

import math
import random
from typing import Any, Dict, List, Tuple

NUM_SIMULATIONS = 100


def _simulate_growth(
    current_savings: float,
    monthly_investment: float,
    years: int,
    return_rate: float,
    inflation_rate: float,
) -> float:
    """Simulate savings growth over time with compounding and inflation adjustment."""

    balance = float(current_savings)
    monthly_rate = return_rate / 12.0
    inflation_monthly = inflation_rate / 12.0

    for _ in range(years * 12):
        balance = balance * (1 + monthly_rate) + monthly_investment
        balance = balance / (1 + inflation_monthly)  # adjust for inflation drift
    return balance


def _run_monte_carlo(
    current_savings: float,
    monthly_investment: float,
    years: int,
    base_return: float,
    inflation_rate: float,
) -> Tuple[float, float, float]:
    """Run Monte Carlo simulations and return (mean, median, success_prob)."""

    outcomes = []
    for _ in range(NUM_SIMULATIONS):
        # small volatility around the base return
        simulated_return = random.gauss(mu=base_return, sigma=base_return * 0.25 if base_return else 0.01)
        outcomes.append(
            _simulate_growth(
                current_savings=current_savings,
                monthly_investment=monthly_investment,
                years=years,
                return_rate=simulated_return,
                inflation_rate=inflation_rate,
            )
        )

    outcomes.sort()
    mean_value = sum(outcomes) / len(outcomes)
    median_value = outcomes[len(outcomes) // 2]
    return mean_value, median_value, 0.0  # success probability calculated externally


def _goal_probability(outcomes: List[float], target: float) -> float:
    if not outcomes:
        return 0.0
    success = sum(1 for value in outcomes if value >= target)
    return round(success / len(outcomes), 4)


def _required_monthly_investment(
    target: float,
    current_savings: float,
    years: int,
    annual_return: float,
    inflation_rate: float,
) -> float:
    """Approximate monthly investment needed to hit target in future value terms."""

    # Adjust target for inflation
    target_in_future = target * ((1 + inflation_rate) ** years)

    r = annual_return / 12.0
    n = years * 12
    if r == 0:
        needed = max(target_in_future - current_savings, 0) / n if n > 0 else 0
        return round(needed, 2)

    future_from_current = current_savings * ((1 + r) ** n)
    numerator = max(target_in_future - future_from_current, 0)
    denominator = ((1 + r) ** n - 1) / r if r != 0 else n
    if denominator == 0:
        return 0.0
    return round(numerator / denominator, 2)


def _explainability_snapshot(params: Dict[str, float], target: float, probability: float) -> Dict[str, float]:
    """Provide simple factor attributions to mimic SHAP-style insights."""

    contributions = {
        "monthly_income": params.get("monthly_income", 0) * 0.001,
        "monthly_expense": -params.get("monthly_expense", 0) * 0.001,
        "current_savings": params.get("current_savings", 0) * 0.0005,
        "investment_return_rate": params.get("investment_return_rate", 0) * 10,
        "inflation_rate": -params.get("inflation_rate", 0) * 8,
    }

    # Normalize contributions for readability
    total = sum(abs(v) for v in contributions.values()) or 1.0
    normalized = {k: round(v / total, 4) for k, v in contributions.items()}
    normalized["goal_target"] = round(target / (params.get("goal_amount", target) or 1), 4)
    normalized["success_probability"] = probability
    return normalized


def _build_summary(
    *,
    mean_value: float,
    median_value: float,
    probability: float,
    required_monthly: float,
    goal_amount: float,
    params: Dict[str, float],
) -> Dict[str, Any]:
    gap = max(goal_amount - median_value, 0)
    insights = {
        "projected_wealth": round(mean_value, 2),
        "monthly_investment_required": round(required_monthly, 2),
        "goal_probability": round(probability, 4),
        "financial_gap": round(gap, 2),
        "shap_contributions": _explainability_snapshot(params, goal_amount, probability),
    }
    return insights


def forecast_retirement(params: Dict[str, float]) -> Dict[str, Any]:
    current_age = int(params.get("current_age", 30))
    retirement_age = int(params.get("retirement_age", 60))
    years = max(retirement_age - current_age, 0)
    return _generic_forecast(params, years)


def forecast_house_purchase(params: Dict[str, float]) -> Dict[str, Any]:
    years = max(int(params.get("goal_target_year", 5)), 0)
    return _generic_forecast(params, years)


def forecast_child_education(params: Dict[str, float]) -> Dict[str, Any]:
    years = max(int(params.get("goal_target_year", 10)), 0)
    return _generic_forecast(params, years)


def forecast_emergency_fund(params: Dict[str, float]) -> Dict[str, Any]:
    years = max(int(params.get("goal_target_year", 2)), 0)
    return _generic_forecast(params, years)


def forecast_vehicle_purchase(params: Dict[str, float]) -> Dict[str, Any]:
    years = max(int(params.get("goal_target_year", 5)), 0)
    return _generic_forecast(params, years)


def forecast_goal_completion(params: Dict[str, float]) -> Dict[str, Any]:
    years = max(int(params.get("goal_target_year", 8)), 0)
    return _generic_forecast(params, years)


def _generic_forecast(params: Dict[str, float], years: int) -> Dict[str, Any]:
    current_savings = float(params.get("current_savings", 0))
    monthly_income = float(params.get("monthly_income", 0))
    monthly_expense = float(params.get("monthly_expense", 0))
    monthly_investment = max(monthly_income - monthly_expense, 0) * 0.3  # assume 30% investable
    investment_return_rate = float(params.get("investment_return_rate", 0.07))
    inflation_rate = float(params.get("inflation_rate", 0.04))
    goal_amount = float(params.get("goal_amount", 0))

    outcomes = []
    for _ in range(NUM_SIMULATIONS):
        simulated_return = random.gauss(mu=investment_return_rate, sigma=investment_return_rate * 0.25 if investment_return_rate else 0.01)
        outcomes.append(
            _simulate_growth(
                current_savings=current_savings,
                monthly_investment=monthly_investment,
                years=years,
                return_rate=simulated_return,
                inflation_rate=inflation_rate,
            )
        )

    outcomes.sort()
    mean_value = sum(outcomes) / len(outcomes) if outcomes else 0.0
    median_value = outcomes[len(outcomes) // 2] if outcomes else 0.0
    probability = _goal_probability(outcomes, goal_amount)
    required_monthly = _required_monthly_investment(
        target=goal_amount,
        current_savings=current_savings,
        years=years,
        annual_return=investment_return_rate,
        inflation_rate=inflation_rate,
    )

    params_copy = params.copy()
    params_copy["goal_amount"] = goal_amount

    return _build_summary(
        mean_value=mean_value,
        median_value=median_value,
        probability=probability,
        required_monthly=required_monthly,
        goal_amount=goal_amount,
        params=params_copy,
    )
