"""AI-driven financial simulation engine with Monte Carlo scenarios."""

from __future__ import annotations

import math
import random
from typing import Dict, List

ITERATIONS = 500


def _run_single_path(params: Dict[str, float]) -> List[float]:
    """Simulate annual net worth trajectory."""

    income = float(params.get("current_income", 0) or 0)
    expense = float(params.get("monthly_expense", 0) or 0) * 12
    savings = float(params.get("current_savings", 0) or 0)
    investment = float(params.get("investment", 0) or 0)
    assets = float(params.get("assets", 0) or 0)
    liabilities = float(params.get("liabilities", 0) or 0)
    inflation_rate = float(params.get("inflation_rate", 0.04) or 0.04)
    salary_growth_rate = float(params.get("salary_growth_rate", 0.05) or 0.05)
    years = int(params.get("simulation_years", 20) or 20)

    trajectory = []
    net_worth = savings + investment + assets - liabilities

    for year in range(1, years + 1):
        # Grow income and expense with inflation/salary dynamics
        income *= 1 + salary_growth_rate + random.gauss(0, 0.01)
        expense *= 1 + inflation_rate + random.gauss(0, 0.005)

        investable = max(income - expense, 0) * 0.3  # invest 30% of surplus
        savings += max(income - expense - investable, 0)

        # Investment return with randomness
        base_return = 0.07 + random.gauss(0, 0.02)
        investment = (investment + investable) * (1 + base_return)

        net_worth = savings + investment + assets - liabilities
        trajectory.append(net_worth)

    return trajectory


def simulate_financial_future(params: Dict[str, float]) -> Dict[str, object]:
    paths = []
    for _ in range(ITERATIONS):
        paths.append(_run_single_path(params))

    # Align lengths
    years = int(params.get("simulation_years", 20) or 20)
    avg_path = [sum(path[i] for path in paths) / len(paths) for i in range(years)] if paths else [0.0] * years

    projected_net_worth = avg_path[-1] if avg_path else 0.0

    # Financial independence criterion: net worth >= 25 * annual expense (4% rule)
    annual_expense = float(params.get("monthly_expense", 0) or 0) * 12
    fi_threshold = annual_expense * 25 if annual_expense else 0
    fi_hits = 0
    fi_years = []
    for path in paths:
        for idx, value in enumerate(path):
            if value >= fi_threshold and fi_threshold > 0:
                fi_years.append(idx + 1)
                break
        else:
            pass
    if fi_years:
        fi_hits = len(fi_years)
    retirement_success_probability = round(fi_hits / len(paths), 4) if paths else 0.0
    years_to_fi = min(fi_years) if fi_years else years

    # Base scenarios
    scenario_results = []
    scenario_results.append({
        "scenario": "increase_savings",
        "net_worth": round(_run_scenario(params, savings_boost=0.20), 2),
    })
    scenario_results.append({
        "scenario": "invest_more",
        "net_worth": round(_run_scenario(params, invest_boost=0.15), 2),
    })
    scenario_results.append({
        "scenario": "reduce_spending",
        "net_worth": round(_run_scenario(params, expense_cut=0.10), 2),
    })

    return {
        "projected_net_worth": round(projected_net_worth, 2),
        "retirement_success_probability": retirement_success_probability,
        "years_to_financial_independence": years_to_fi,
        "wealth_trajectory": [round(v, 2) for v in avg_path],
        "scenario_results": scenario_results,
    }


def _run_scenario(params: Dict[str, float], savings_boost: float = 0.0, invest_boost: float = 0.0, expense_cut: float = 0.0) -> float:
    adj = params.copy()
    if savings_boost:
        adj["current_income"] = float(adj.get("current_income", 0) or 0) * (1 + savings_boost)
    if invest_boost:
        adj["investment"] = float(adj.get("investment", 0) or 0) * (1 + invest_boost)
    if expense_cut:
        adj["monthly_expense"] = float(adj.get("monthly_expense", 0) or 0) * (1 - expense_cut)

    path = _run_single_path(adj)
    return path[-1] if path else 0.0
