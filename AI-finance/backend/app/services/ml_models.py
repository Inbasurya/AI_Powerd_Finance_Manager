"""Shared ML model registry for training and inference workflows."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.linear_model import LinearRegression

from app.utils.feature_engineering import build_classification_vector, build_forecast_vector


TRANSACTION_CATEGORIES: list[str] = [
    "Food",
    "Travel",
    "Bills",
    "Shopping",
    "Investment",
    "Healthcare",
]


@dataclass
class ModelRegistry:
    """In-memory registry holding fitted models and training references."""

    classifier: RandomForestClassifier = field(
        default_factory=lambda: RandomForestClassifier(n_estimators=150, random_state=42)
    )
    forecaster: LinearRegression = field(default_factory=LinearRegression)
    anomaly_detector: IsolationForest = field(
        default_factory=lambda: IsolationForest(contamination=0.08, random_state=42)
    )
    classification_x: Optional[np.ndarray] = None
    classification_y: Optional[np.ndarray] = None
    forecast_x: Optional[np.ndarray] = None
    forecast_y: Optional[np.ndarray] = None

    def __post_init__(self) -> None:
        self._fit_default_models()

    def _fit_default_models(self) -> None:
        """Train baseline models on synthetic data for a ready-to-run API."""
        rng = np.random.default_rng(seed=42)

        # Synthetic classification data shaped to the engineered feature contract.
        self.classification_x = rng.uniform(low=0.0, high=1.0, size=(1200, 6))
        self.classification_x[:, 1] *= 31.0  # day_of_month
        self.classification_x[:, 2] *= 24.0  # hour
        self.classification_x[:, 3] = (self.classification_x[:, 3] > 0.7).astype(float)

        y_indices = (
            (self.classification_x[:, 0] * 5)
            + (self.classification_x[:, 4] * 2)
            + (self.classification_x[:, 5] * 3)
        ).astype(int) % len(TRANSACTION_CATEGORIES)
        self.classification_y = np.array([TRANSACTION_CATEGORIES[idx] for idx in y_indices])
        self.classifier.fit(self.classification_x, self.classification_y)

        # Forecast model: [month_index, recent_avg, trend] -> next month expense.
        forecast_rows: list[np.ndarray] = []
        forecast_targets: list[float] = []
        for _ in range(800):
            n_months = int(rng.integers(low=4, high=14))
            base = float(rng.uniform(300.0, 1800.0))
            slope = float(rng.uniform(-35.0, 60.0))
            noise = rng.normal(0, 45, size=n_months)
            history = [max(50.0, base + slope * i + noise[i]) for i in range(n_months)]
            features = build_forecast_vector(history)
            target = max(50.0, history[-1] + slope + float(rng.normal(0, 30)))
            forecast_rows.append(features)
            forecast_targets.append(target)

        self.forecast_x = np.array(forecast_rows, dtype=float)
        self.forecast_y = np.array(forecast_targets, dtype=float)
        self.forecaster.fit(self.forecast_x, self.forecast_y)

        # Anomaly model consumes transaction-like vectors.
        anomaly_x = np.column_stack(
            [
                rng.uniform(0.0, 1.0, 1200),
                rng.uniform(1.0, 31.0, 1200),
                rng.uniform(0.0, 23.0, 1200),
                rng.integers(0, 2, 1200).astype(float),
                rng.uniform(0.0, 2.0, 1200),
                rng.uniform(0.0, 1.0, 1200),
            ]
        )
        self.anomaly_detector.fit(anomaly_x)

    def classify_transaction(
        self,
        amount: float,
        account_balance: float,
        merchant_risk: float,
        timestamp,
    ) -> tuple[str, float, dict[str, float]]:
        """Classify a transaction into one of the project category labels."""
        vector = build_classification_vector(
            amount=amount,
            account_balance=account_balance,
            merchant_risk=merchant_risk,
            timestamp=timestamp,
        ).reshape(1, -1)
        probabilities = self.classifier.predict_proba(vector)[0]
        labels = self.classifier.classes_
        indexed = dict(zip(labels, probabilities, strict=False))
        category = max(indexed, key=indexed.get)
        confidence = float(indexed[category])
        probs = {k: round(float(v), 4) for k, v in indexed.items()}
        return category, confidence, probs

    def predict_expense(self, monthly_history: list[float]) -> float:
        """Predict next month expense using linear regression."""
        vector = build_forecast_vector(monthly_history).reshape(1, -1)
        prediction = float(self.forecaster.predict(vector)[0])
        return max(0.0, prediction)

    def detect_anomaly_scores(self, feature_matrix: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Return anomaly labels and anomaly scores for transaction vectors."""
        labels = self.anomaly_detector.predict(feature_matrix)
        scores = self.anomaly_detector.decision_function(feature_matrix)
        return labels, scores


model_registry = ModelRegistry()
