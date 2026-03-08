"""Generate a realistic synthetic transactions dataset for FinMind AI Pro.

This script creates a finance dataset suitable for machine learning experiments
in final-year engineering and research workflows.

Output:
    dataset/transactions.csv
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from faker import Faker


# ------------------------------
# Configuration
# ------------------------------
SEED = 42
N_ROWS = 10000  # Minimum required rows; can be increased for larger experiments.

CATEGORIES: List[str] = [
    "Food",
    "Travel",
    "Shopping",
    "Bills",
    "Healthcare",
    "Entertainment",
    "Investment",
    "Education",
]

PAYMENT_METHODS: List[str] = [
    "Credit Card",
    "Debit Card",
    "UPI",
    "Net Banking",
    "Cash",
]

LOCATIONS: List[str] = [
    "Chennai",
    "Bangalore",
    "Mumbai",
    "Delhi",
    "Hyderabad",
    "Remote",
]

TRANSACTION_TYPES: List[str] = ["expense", "income", "transfer"]

# Required amount ranges from prompt (plus realistic ranges for other categories).
AMOUNT_RANGES: Dict[str, Tuple[int, int]] = {
    "Food": (100, 1500),
    "Travel": (500, 8000),
    "Shopping": (500, 15000),
    "Bills": (1000, 10000),
    "Healthcare": (500, 20000),
    "Entertainment": (200, 5000),
    "Investment": (1000, 40000),
    "Education": (800, 25000),
}

# Category-specific merchant templates for realism.
CATEGORY_MERCHANTS: Dict[str, List[str]] = {
    "Food": ["Swiggy", "Zomato", "Cafe House", "Fresh Mart"],
    "Travel": ["Uber", "Ola", "IRCTC", "Airline Booking"],
    "Shopping": ["Amazon", "Flipkart", "Lifestyle Store", "Mega Mall"],
    "Bills": ["Electricity Board", "Water Supply", "Broadband Provider", "Gas Utility"],
    "Healthcare": ["Apollo Pharmacy", "City Hospital", "MediLab", "Health Clinic"],
    "Entertainment": ["Netflix", "BookMyShow", "Spotify", "Game Zone"],
    "Investment": ["Mutual Fund SIP", "Brokerage Account", "ETF Platform", "Gold Savings"],
    "Education": ["Online Courses", "Book Store", "Exam Center", "Tuition Institute"],
}


def set_reproducibility(seed: int = SEED) -> None:
    """Set deterministic random seeds for reproducible dataset generation."""
    random.seed(seed)
    np.random.seed(seed)


def random_datetime(start: datetime, end: datetime) -> datetime:
    """Generate a random datetime between start and end."""
    total_seconds = int((end - start).total_seconds())
    offset = random.randint(0, total_seconds)
    return start + timedelta(seconds=offset)


def build_user_profiles(n_users: int = 250) -> List[Dict[str, float]]:
    """Create synthetic user financial profiles for realistic monthly behavior."""
    profiles: List[Dict[str, float]] = []

    for _ in range(n_users):
        income = float(np.random.randint(25000, 220000))
        budget = income * np.random.uniform(0.55, 0.9)
        savings = max(0.0, income * np.random.uniform(0.08, 0.35))
        investment = max(0.0, income * np.random.uniform(0.05, 0.25))

        profiles.append(
            {
                "income": round(income, 2),
                "monthly_budget": round(budget, 2),
                "savings": round(savings, 2),
                "investment": round(investment, 2),
            }
        )

    return profiles


def generate_base_transactions(n_rows: int, fake: Faker) -> pd.DataFrame:
    """Generate base transaction table before anomaly injection."""
    start_date = datetime(2023, 1, 1)
    end_date = datetime(2026, 3, 1)

    profiles = build_user_profiles(n_users=300)

    records: List[Dict[str, object]] = []

    # Transaction type probabilities: mostly expenses, fewer income/transfer rows.
    type_weights = [0.78, 0.15, 0.07]

    for tx_id in range(1, n_rows + 1):
        profile = random.choice(profiles)

        tx_type = random.choices(TRANSACTION_TYPES, weights=type_weights, k=1)[0]
        category = random.choice(CATEGORIES)
        location = random.choice(LOCATIONS)
        payment_method = random.choice(PAYMENT_METHODS)

        tx_dt = random_datetime(start_date, end_date)

        # Create realistic amount by combining category range + transaction type logic.
        low, high = AMOUNT_RANGES[category]
        amount = float(np.random.uniform(low, high))

        if tx_type == "income":
            # Income entries are typically larger and less frequent.
            amount = float(np.random.uniform(profile["income"] * 0.6, profile["income"] * 1.2))
            payment_method = random.choice(["Net Banking", "UPI", "Credit Card"])
        elif tx_type == "transfer":
            # Transfer entries can vary between wallet/bank movements.
            amount = float(np.random.uniform(500, 30000))
            payment_method = random.choice(["UPI", "Net Banking", "Debit Card"])

        merchant_pool = CATEGORY_MERCHANTS.get(category, [fake.company()])
        merchant = random.choice(merchant_pool)

        records.append(
            {
                "transaction_id": tx_id,
                "date": tx_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "amount": round(amount, 2),
                "category": category,
                "merchant": merchant,
                "payment_method": payment_method,
                "location": location,
                "income": profile["income"],
                "monthly_budget": profile["monthly_budget"],
                "savings": profile["savings"],
                "investment": profile["investment"],
                "transaction_type": tx_type,
                "is_anomaly": 0,
            }
        )

    return pd.DataFrame(records)


def inject_anomalies(df: pd.DataFrame, fake: Faker) -> pd.DataFrame:
    """Inject 3-5% anomalies: large spend, unusual hours, foreign-like behavior."""
    data = df.copy()

    anomaly_fraction = float(np.random.uniform(0.03, 0.05))
    n_anomalies = int(len(data) * anomaly_fraction)

    anomaly_indices = np.random.choice(data.index, size=n_anomalies, replace=False)

    for idx in anomaly_indices:
        anomaly_type = random.choice(["large_spending", "unusual_time", "foreign_transaction"])

        # Mark this transaction as anomaly.
        data.at[idx, "is_anomaly"] = 1

        if anomaly_type == "large_spending":
            # Very large sudden spending spikes.
            base_amount = float(data.at[idx, "amount"])
            data.at[idx, "amount"] = round(base_amount * np.random.uniform(4.0, 12.0), 2)
            data.at[idx, "merchant"] = random.choice(
                ["Luxury Boutique", "Premium Electronics", "Elite Jewels", fake.company()]
            )
            data.at[idx, "transaction_type"] = "expense"

        elif anomaly_type == "unusual_time":
            # Force transaction time to late-night hours (00:00-04:59).
            dt = datetime.strptime(str(data.at[idx, "date"]), "%Y-%m-%d %H:%M:%S")
            new_hour = random.randint(0, 4)
            dt = dt.replace(hour=new_hour, minute=random.randint(0, 59), second=random.randint(0, 59))
            data.at[idx, "date"] = dt.strftime("%Y-%m-%d %H:%M:%S")
            data.at[idx, "merchant"] = random.choice(["24x7 Store", "Night Kiosk", "LatePay Online"])

        else:  # foreign_transaction
            # Keep location schema constraint by mapping foreign behavior to remote + merchant tags.
            data.at[idx, "location"] = "Remote"
            data.at[idx, "merchant"] = random.choice(
                ["Intl POS", "Global Travel Pay", "Overseas Gateway", "Foreign Marketplace"]
            )
            data.at[idx, "payment_method"] = random.choice(["Credit Card", "Net Banking", "UPI"])
            data.at[idx, "transaction_type"] = "expense"
            data.at[idx, "amount"] = round(float(data.at[idx, "amount"]) * np.random.uniform(1.5, 4.0), 2)

    return data


def generate_dataset(n_rows: int = N_ROWS) -> pd.DataFrame:
    """Generate full synthetic dataset with realistic behavior and anomalies."""
    set_reproducibility(SEED)
    fake = Faker("en_IN")
    fake.seed_instance(SEED)

    base_df = generate_base_transactions(n_rows=n_rows, fake=fake)
    final_df = inject_anomalies(base_df, fake=fake)

    # Reorder columns exactly as requested.
    final_df = final_df[
        [
            "transaction_id",
            "date",
            "amount",
            "category",
            "merchant",
            "payment_method",
            "location",
            "income",
            "monthly_budget",
            "savings",
            "investment",
            "transaction_type",
            "is_anomaly",
        ]
    ]

    return final_df


def main() -> None:
    """Run generator and save output CSV to dataset/transactions.csv."""
    dataset_dir = Path(__file__).resolve().parent
    output_path = dataset_dir / "transactions.csv"

    df = generate_dataset(n_rows=N_ROWS)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)

    anomaly_ratio = float(df["is_anomaly"].mean())
    print(f"Generated rows: {len(df)}")
    print(f"Anomaly ratio: {anomaly_ratio:.2%}")
    print(f"Saved dataset to: {output_path}")


if __name__ == "__main__":
    main()
