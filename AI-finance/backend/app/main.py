"""Main FastAPI application object and router registration."""

from fastapi import FastAPI

from app.routes.anomaly import router as anomaly_router
from app.routes.assets import router as assets_router
from app.routes.family_budget import router as family_budget_router
from app.routes.financial_score import router as financial_score_router
from app.routes.financial_forecasting import router as financial_forecasting_router
from app.routes.financial_health import router as financial_health_router
from app.routes.financial_simulation import router as financial_simulation_router
from app.routes.model_metrics import router as model_metrics_router
from app.routes.planner import router as planner_router
from app.routes.prediction import router as prediction_router
from app.routes.risk import router as risk_router
from app.routes.transactions import router as transactions_router
from app.routes.wealth_assistant import router as wealth_assistant_router
from app.routes.net_worth import router as net_worth_router
from app.routes.portfolio_optimizer import router as portfolio_optimizer_router
from app.routes.calendar import router as calendar_router
from app.routes.digital_twin import router as digital_twin_router

app = FastAPI(
    title="FinMind AI Pro API",
    version="1.0.0",
    description="AI-powered personal finance intelligence backend",
)

app.include_router(transactions_router)
app.include_router(prediction_router)
app.include_router(financial_score_router)
app.include_router(anomaly_router)
app.include_router(planner_router)
app.include_router(wealth_assistant_router)
app.include_router(assets_router)
app.include_router(family_budget_router)
app.include_router(model_metrics_router)
app.include_router(net_worth_router)
app.include_router(financial_forecasting_router)
app.include_router(financial_health_router)
app.include_router(portfolio_optimizer_router)
app.include_router(financial_simulation_router)
app.include_router(risk_router)
app.include_router(calendar_router)
app.include_router(digital_twin_router)


@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    """Simple service liveness endpoint for deployment checks."""
    return {"status": "ok"}
