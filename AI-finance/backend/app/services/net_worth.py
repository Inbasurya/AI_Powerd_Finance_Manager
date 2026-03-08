"""Net worth calculator utilities."""

from __future__ import annotations

from typing import Mapping, Optional

ASSET_CATEGORIES = [
    "Land",
    "House",
    "Gold",
    "Silver",
    "Stocks",
    "Mutual Funds",
    "Crypto",
    "Bonds",
    "Bank Balance",
    "Fixed Deposit",
    "Vehicles",
    "Insurance",
    "Investments",
    "Other",
]

LIABILITY_CATEGORIES = [
    "Loans",
    "Credit card debt",
    "Mortgage",
]


def calculate_net_worth(
    assets: Optional[Mapping[str, float]] = None,
    liabilities: Optional[Mapping[str, float]] = None,
) -> dict[str, float]:
    """Compute totals across assets and liabilities and return net worth."""

    assets = assets or {}
    liabilities = liabilities or {}

    total_assets = 0.0
    for category in ASSET_CATEGORIES:
        total_assets += float(assets.get(category, 0.0) or 0.0)

    total_liabilities = 0.0
    for category in LIABILITY_CATEGORIES:
        total_liabilities += float(liabilities.get(category, 0.0) or 0.0)

    net_worth = round(total_assets - total_liabilities, 2)

    return {
        "total_assets": round(total_assets, 2),
        "total_liabilities": round(total_liabilities, 2),
        "net_worth": net_worth,
    }
