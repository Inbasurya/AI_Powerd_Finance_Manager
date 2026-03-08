"""AI-driven portfolio optimization using a Modern Portfolio Theory inspired approach."""

from __future__ import annotations

import math
import random
from typing import Dict, List, Tuple

import numpy as np

ASSET_CONFIG: Dict[str, Dict[str, float]] = {
    "stocks": {"return": 0.12, "vol": 0.18},
    "mutual_funds": {"return": 0.10, "vol": 0.14},
    "etf": {"return": 0.095, "vol": 0.13},
    "gold": {"return": 0.06, "vol": 0.12},
    "real_estate": {"return": 0.08, "vol": 0.10},
    "bonds": {"return": 0.045, "vol": 0.05},
    "cash": {"return": 0.025, "vol": 0.005},
    "crypto": {"return": 0.16, "vol": 0.35},
    "business": {"return": 0.14, "vol": 0.22},
}

RISK_PROFILE = {"low": 0.7, "medium": 1.0, "high": 1.35}
DEFAULT_ASSETS = list(ASSET_CONFIG.keys())


def _correlation(asset_a: str, asset_b: str) -> float:
    pair_corr = {
        ("stocks", "mutual_funds"): 0.82,
        ("stocks", "etf"): 0.78,
        ("stocks", "bonds"): 0.22,
        ("etf", "bonds"): 0.3,
        ("gold", "stocks"): 0.05,
        ("real_estate", "stocks"): 0.35,
        ("crypto", "stocks"): 0.25,
        ("crypto", "bonds"): 0.0,
        ("cash", "crypto"): -0.05,
    }
    return pair_corr.get((asset_a, asset_b)) or pair_corr.get((asset_b, asset_a)) or 0.25


def _build_cov_matrix(assets: List[str]) -> np.ndarray:
    size = len(assets)
    cov = np.zeros((size, size))
    for i, a in enumerate(assets):
        for j, b in enumerate(assets):
            vol_i = ASSET_CONFIG[a]["vol"]
            vol_j = ASSET_CONFIG[b]["vol"]
            corr = 1.0 if i == j else _correlation(a, b)
            cov[i, j] = vol_i * vol_j * corr
    return cov


def _expected_portfolio_metrics(weights: np.ndarray, assets: List[str], risk_free: float = 0.02) -> Tuple[float, float, float]:
    returns_vec = np.array([ASSET_CONFIG[a]["return"] for a in assets])
    cov = _build_cov_matrix(assets)
    exp_return = float(weights @ returns_vec)
    variance = float(weights @ cov @ weights.T)
    risk = math.sqrt(max(variance, 0))
    sharpe = (exp_return - risk_free) / risk if risk > 0 else 0.0
    return exp_return * 100, risk * 100, sharpe


def _dirichlet_weights(size: int, tilt: float) -> np.ndarray:
    alpha = np.ones(size) * max(0.5, tilt)
    return np.random.dirichlet(alpha)


def _select_assets(requested: List[str] | None) -> List[str]:
    if requested:
        filtered = [asset for asset in requested if asset in ASSET_CONFIG]
        if filtered:
            return filtered
    return DEFAULT_ASSETS


def optimize_portfolio(payload: Dict[str, object]) -> Dict[str, object]:
    risk_tolerance = str(payload.get("risk_tolerance", "medium")).lower()
    horizon_years = float(payload.get("investment_horizon", 5) or 5)
    monthly_income = float(payload.get("monthly_income", 0) or 0)
    monthly_expense = float(payload.get("monthly_expense", 0) or 0)
    current_savings = float(payload.get("current_savings", 0) or 0)
    investment_amount = float(payload.get("investment_amount", 0) or 0)
    asset_classes = payload.get("asset_classes")
    existing_assets = payload.get("existing_assets") or {}

    assets = _select_assets(asset_classes if isinstance(asset_classes, list) else None)
    risk_amp = RISK_PROFILE.get(risk_tolerance, 1.0)
    risk_free_rate = 0.02

    investable = investment_amount or max(monthly_income - monthly_expense, 0) * 12

    frontier = []
    best_portfolio = None

    for _ in range(80):
        weights = _dirichlet_weights(len(assets), risk_amp)

        # Tilt weights away from over-owned assets if provided
        if isinstance(existing_assets, dict) and existing_assets:
            total_existing = sum(float(v or 0) for v in existing_assets.values()) or 1.0
            adjustments = []
            for asset in assets:
                share = float(existing_assets.get(asset, 0) or 0) / total_existing
                adjustments.append(max(0.65, 1.1 - share))
            weights = weights * np.array(adjustments)
            weights = weights / weights.sum()

        exp_return, risk, sharpe = _expected_portfolio_metrics(weights, assets, risk_free_rate)
        frontier.append({"weights": weights, "expected_return": exp_return, "risk": risk, "sharpe": sharpe})

        if best_portfolio is None or sharpe > best_portfolio["sharpe"]:
            best_portfolio = frontier[-1]

    if best_portfolio is None:
        raise RuntimeError("Unable to compute portfolio recommendations")

    recommended_weights = {asset: round(float(w) * 100, 2) for asset, w in zip(assets, best_portfolio["weights"])}

    growth_forecast = []
    annual_return = best_portfolio["expected_return"] / 100
    for year in range(1, int(horizon_years) + 1):
        future = (current_savings + investable) * ((1 + annual_return) ** year)
        growth_forecast.append({"year": year, "value": round(future, 2)})

    risk_return_points = [
        {"label": f"Frontier #{idx+1}", "expected_return": round(p["expected_return"], 2), "risk": round(p["risk"], 2)}
        for idx, p in enumerate(sorted(frontier, key=lambda row: row["risk"]))
    ]

    explanation = [
        f"Optimized across {len(assets)} asset classes with risk tilt '{risk_tolerance}'.",
        "Weights maximize Sharpe ratio while respecting diversification across equities, debt, and alternatives.",
        "Efficient frontier shows risk/return trade-offs for scenario planning.",
    ]

    return {
        "recommended_allocation": recommended_weights,
        "expected_return": round(best_portfolio["expected_return"], 2),
        "portfolio_risk": round(best_portfolio["risk"], 2),
        "sharpe_ratio": round(best_portfolio["sharpe"], 2),
        "explanation": explanation,
        "growth_forecast": growth_forecast,
        "risk_return_points": risk_return_points,
    }
