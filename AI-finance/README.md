# FinMind AI Pro

FinMind AI Pro is an AI-powered personal finance intelligence platform built for final-year engineering capstone work and IEEE-style research demonstration. It combines anomaly detection, forecasting, financial health analytics, affordability planning, and explainable AI in a full-stack system.

## Project Overview

Traditional expense trackers provide static reports, but users need predictive and interpretable intelligence. FinMind AI Pro addresses this by delivering:

- Real-time transaction intelligence
- Spending anomaly detection
- Financial health scoring
- Expense forecasting and overspending risk
- Affordability simulation for planned purchases/events
- Explainable AI outputs with SHAP
- Interactive analytics dashboard

## System Architecture

```text
Frontend (React + TypeScript + Tailwind + Recharts)
    |
    | REST (Axios)
    v
Backend API (FastAPI + Uvicorn)
    |
    +--> ML Inference Services (scikit-learn models)
    |       - Random Forest (classification)
    |       - Isolation Forest (anomaly detection)
    |       - Linear Regression (expense forecasting)
    |       - Gradient Boosting Regressor (financial score)
    |
    +--> Explainability Service (SHAP)
    |
    +--> Data Layer (SQLite + CSV dataset)
```

## AI Models Used

- `RandomForestClassifier`: transaction category classification
- `IsolationForest`: unusual/fraud-like transaction detection
- `LinearRegression`: next-month expense prediction
- `GradientBoostingRegressor`: financial health score prediction
- `SHAP`: local and global explanation of model decisions

## Key Features

- Transaction classification (`/classify-transaction`)
- Expense forecasting (`/predict-expense`)
- Overspending prediction (`/predict-overspending`)
- Financial score estimation (`/financial-score`)
- Transaction anomaly detection (`/anomaly-detection`)
- Affordability simulation (`/affordability-simulation`)
- Explainable model output (`/explain-model`)
- Interactive dashboard modules:
  - Dashboard
  - Transactions
  - Anomaly Detection
  - Savings Goals
  - Smart Planner
  - Financial Score
  - AI Wealth Assistant

## Repository Structure

```text
AI-finance/
  backend/
    main.py
    requirements.txt
    app/
      main.py
      routes/
        anomaly.py
        prediction.py
        planner.py
        financial_score.py
        transactions.py
      services/
        ml_models.py
        explainability.py
        anomaly_service.py
      models/
        train_model.py
      utils/
        preprocessing.py
        feature_engineering.py

  frontend/
    package.json
    index.html
    tailwind.config.js
    src/
      App.tsx
      main.tsx
      pages/
        Dashboard.tsx
        Transactions.tsx
        AnomalyDetection.tsx
        SavingsGoals.tsx
        SmartPlanner.tsx
        FinancialScore.tsx
        AIWealthAssistant.tsx
      components/
        Sidebar.tsx
        Charts.tsx
        GoalCard.tsx
        PlannerTimeline.tsx
        ErrorBoundary.tsx
      services/
        api.ts
      types/
        index.ts

  dataset/
    transactions.csv

  models/
    transaction_classifier.pkl
    anomaly_detector.pkl
    expense_predictor.pkl
    financial_score_model.pkl

  docs/
    ieee/
    figures/
```

## Installation

### Prerequisites

- Python 3.9+
- Node.js 18+ and `npm`

### 1) Clone Repository

```bash
git clone <your-repo-url>
cd AI-finance
```

### 2) Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3) Frontend Setup

```bash
cd ../frontend
npm install
```

## How To Run Backend

From `backend/`:

```bash
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## How To Run Frontend

From `frontend/`:

```bash
npm run dev
```

Open:

- `http://127.0.0.1:5173`

Optional environment variable in `frontend/.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Model Training Pipeline

To train and save all model artifacts:

```bash
cd backend
source .venv/bin/activate
python -m app.models.train_model
```

Generated models are saved in `models/` at repository root.

## Example API Responses

### `POST /classify-transaction`

```json
{
  "category": "Shopping",
  "confidence": 0.84,
  "probabilities": {
    "Bills": 0.04,
    "Food": 0.03,
    "Healthcare": 0.02,
    "Investment": 0.01,
    "Shopping": 0.84,
    "Travel": 0.06
  }
}
```

### `POST /financial-score`

```json
{
  "score": 78.63,
  "status": "Good",
  "factors": {
    "income": 85000.0,
    "spending_ratio": 0.61,
    "savings_rate": 0.22,
    "investment_ratio": 0.11,
    "anomaly_penalty": 4.0
  }
}
```

### `POST /anomaly-detection`

```json
{
  "anomaly_count": 2,
  "results": [
    {
      "transaction": {
        "amount": 4200,
        "account_balance": 3900,
        "merchant_risk": 0.95
      },
      "is_anomaly": true,
      "risk_type": "fraud-like activity",
      "anomaly_score": -0.1282
    }
  ]
}
```

### `POST /explain-model` (financial_score)

```json
{
  "model_type": "financial_score",
  "predicted_score": 74.21,
  "feature_importance": {
    "income": 12.0,
    "spending": 8.0,
    "savings_rate": 6.0,
    "anomalies": 4.0,
    "investment_ratio": 3.0
  },
  "contribution_values": {
    "income": 12.0,
    "spending": -8.0,
    "savings_rate": 6.0,
    "anomalies": -4.0,
    "investment_ratio": 3.0
  },
  "positive_impact_features": {
    "income": 12.0,
    "savings_rate": 6.0,
    "investment_ratio": 3.0
  },
  "negative_impact_features": {
    "spending": -8.0,
    "anomalies": -4.0
  },
  "base_value": 65.0
}
```

## Screenshots (Placeholders)

Add your UI screenshots under `docs/figures/` and update the paths below.

```markdown
![Dashboard](docs/figures/dashboard.png)
![Transactions](docs/figures/transactions.png)
![Anomaly Detection](docs/figures/anomaly-detection.png)
![Financial Score](docs/figures/financial-score.png)
![AI Wealth Assistant](docs/figures/ai-wealth-assistant.png)
```

## Research Contribution

FinMind AI Pro contributes an end-to-end framework for intelligent personal finance assistance that integrates anomaly detection, predictive modeling, and explainable AI into a single deployable platform. The architecture supports reproducible experimentation, API-level evaluation, and demonstrable user-facing transparency, making it suitable for IEEE conference submissions and final-year engineering research projects.

## Future Improvements

- Sequence models (LSTM/Transformer) for long-range spending dynamics
- Personalized recommendation engine with reinforcement learning
- Federated privacy-preserving training
- Real bank statement integration and streaming ingestion
- Multi-user role-based dashboards and alert workflows
- MLOps pipeline (model registry, drift detection, scheduled retraining)

## License

Use an academic or open-source license appropriate for your institution and publication policy.
