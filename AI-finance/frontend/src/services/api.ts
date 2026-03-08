import axios from "axios";

import type {
	AffordabilityResponse,
	AnomalyDetectionResponse,
	ExpensePredictionResponse,
	ExplainModelResponse,
	FinancialScoreResponse,
	FinancialScoreHistoryItem,
	FinancialHealthResponse,
	FinancialHealthHistoryItem,
	PortfolioOptimizationResponse,
	SimulationResponse,
	FamilyResponse,
	FamilySummary,
	PortfolioResponse,
	Transaction,
	ModelMetricsResponse,
	NetWorthResponse,
	ForecastResponse,
	PlannerSimulationResponse,
	RiskPredictResponse,
	FinancialCalendarEvent,
	DigitalTwinResponse,
} from "../types";

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000",
	timeout: 15000,
});

export async function classifyTransaction(payload: {
	amount: number;
	account_balance: number;
	merchant_risk: number;
	timestamp?: string;
}) {
	const { data } = await api.post("/classify-transaction", payload);
	return data as { category: string; confidence: number; probabilities: Record<string, number> };
}

export async function predictExpense(monthly_history: number[], category_history: Record<string, number[]>) {
	const { data } = await api.post("/predict-expense", { monthly_history, category_history });
	return data as ExpensePredictionResponse;
}

export async function detectAnomalies(transactions: Transaction[]) {
	const { data } = await api.post("/anomaly/detect", { transactions });
	return data as AnomalyDetectionResponse;
}

export async function getFinancialScore(payload: {
	income: number;
	spending: number;
	savings: number;
	anomalies: number;
	investments: number;
	liquid_assets?: number;
}) {
	const { data } = await api.post("/financial/score", payload);
	return data as FinancialScoreResponse;
}

export async function fetchFinancialScoreHistory() {
	const { data } = await api.get("/financial/score/history");
	return data as FinancialScoreHistoryItem[];
}

export async function explainModel(payload: Record<string, unknown>) {
	const { data } = await api.post("/explain-model", payload);
	return data as ExplainModelResponse;
}

export async function affordabilitySimulation(payload: {
	monthly_income: number;
	monthly_expenses: number;
	current_savings: number;
	future_cost: number;
	months_until_purchase: number;
}) {
	const { data } = await api.post("/affordability-simulation", payload);
	return data as AffordabilityResponse;
}

export async function fetchPortfolio() {
	const { data } = await api.get("/assets");
	return data as PortfolioResponse;
}

export async function addAsset(payload: {
	name: string;
	asset_type: string;
	purchase_value: number;
	current_value: number;
	purchase_date: string;
	location?: string;
	notes?: string;
}) {
	const { data } = await api.post("/assets/add", payload);
	return data as PortfolioResponse;
}

export async function deleteAsset(assetId: number) {
	const { data } = await api.delete(`/assets/${assetId}`);
	return data as PortfolioResponse;
}

export async function fetchFamilyMembers() {
	const { data } = await api.get("/family/members");
	return data as FamilyResponse;
}

export async function addFamilyMember(payload: {
	name: string;
	role: string;
	monthly_income: number;
	monthly_expense: number;
	savings: number;
	contribution: number;
}) {
	const { data } = await api.post("/family/add-member", payload);
	return data as FamilyResponse;
}

export async function fetchFamilySummary() {
	const { data } = await api.get("/family/summary");
	return data as FamilySummary;
}

export async function fetchModelMetrics() {
	const { data } = await api.get("/model/metrics");
	return data as ModelMetricsResponse;
}

export async function calculateNetWorth(payload: {
	land?: number;
	house?: number;
	gold?: number;
	stocks?: number;
	savings?: number;
	vehicles?: number;
	investments?: number;
	loans?: number;
	credit_card_debt?: number;
	mortgage?: number;
}) {
	const { data } = await api.post("/net-worth", payload);
	return data as NetWorthResponse;
}

export async function forecastRetirement(payload: Record<string, number>) {
	const { data } = await api.post("/forecast/retirement", payload);
	return data as ForecastResponse;
}

export async function forecastHouse(payload: Record<string, number>) {
	const { data } = await api.post("/forecast/house", payload);
	return data as ForecastResponse;
}

export async function forecastEducation(payload: Record<string, number>) {
	const { data } = await api.post("/forecast/education", payload);
	return data as ForecastResponse;
}

export async function forecastGoal(payload: Record<string, number>) {
	const { data } = await api.post("/forecast/goal", payload);
	return data as ForecastResponse;
}

export async function forecastEmergency(payload: Record<string, number>) {
	const { data } = await api.post("/forecast/emergency", payload);
	return data as ForecastResponse;
}

export async function forecastVehicle(payload: Record<string, number>) {
	const { data } = await api.post("/forecast/vehicle", payload);
	return data as ForecastResponse;
}

export async function predictFinancialHealth(payload: {
	income: number;
	monthly_expense: number;
	savings: number;
	investment: number;
	spending_ratio: number;
	anomaly_frequency: number;
	debt_to_income_ratio: number;
	asset_value: number;
	family_expense_ratio: number;
}) {
	const { data } = await api.post("/financial-health/predict", payload);
	return data as FinancialHealthResponse;
}

export async function fetchFinancialHealthHistory() {
	const { data } = await api.get("/financial-health/history");
	return data as FinancialHealthHistoryItem[];
}

export async function optimizePortfolio(payload: {
	monthly_income: number;
	monthly_expense: number;
	current_savings: number;
	risk_tolerance: string;
	investment_horizon: number;
	existing_assets?: Record<string, number>;
	investment_amount?: number;
	asset_classes?: string[];
}) {
	const { data } = await api.post("/portfolio/optimize", payload);
	return data as PortfolioOptimizationResponse;
}

export async function runSimulation(payload: {
	current_income: number;
	monthly_expense: number;
	current_savings: number;
	investment: number;
	assets: number;
	liabilities: number;
	inflation_rate: number;
	salary_growth_rate: number;
	simulation_years: number;
}) {
	const { data } = await api.post("/simulation/run", payload);
	return data as SimulationResponse;
}

export async function compareSimulation(payload: {
	current_income: number;
	monthly_expense: number;
	current_savings: number;
	investment: number;
	assets: number;
	liabilities: number;
	inflation_rate: number;
	salary_growth_rate: number;
	simulation_years: number;
}) {
	const { data } = await api.post("/simulation/compare", payload);
	return data as SimulationResponse["scenario_results"];
}

export async function simulatePlanner(payload: {
	monthly_income: number;
	monthly_expenses: number;
	current_savings: number;
	future_cost: number;
	months_until_purchase: number;
}) {
	const { data } = await api.post("/planner/simulate", payload);
	return data as PlannerSimulationResponse;
}

export async function predictRisk(payload: {
	income: number;
	monthly_expense: number;
	savings: number;
	loan_amount: number;
	credit_card_usage: number;
	investment: number;
	spending_ratio: number;
	anomaly_frequency: number;
}) {
	const { data } = await api.post("/risk/predict", payload);
	return data as RiskPredictResponse;
}

export async function fetchCalendarEvents() {
	const { data } = await api.get("/calendar/events");
	return data as FinancialCalendarEvent[];
}

export async function fetchDigitalTwin() {
	const { data } = await api.get("/ai/digital-twin");
	return data as DigitalTwinResponse;
}

export default api;
