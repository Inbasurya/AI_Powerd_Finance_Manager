export interface Transaction {
	id: string;
	date: string;
	description: string;
	category: string;
	amount: number;
	account_balance: number;
	merchant_risk: number;
}

export interface FinancialScoreResponse {
	score: number;
	status: "Excellent" | "Good" | "Moderate" | "Risky";
	shap_explanation: {
		savings: number;
		spending: number;
		investments: number;
		anomalies: number;
		liquidity: number;
	};
	factors: Record<string, number>;
}

export interface FinancialScoreHistoryItem {
	month: string;
	score: number;
}

export interface ExpensePredictionResponse {
	next_month_expense: number;
	category_spending_trend: Record<string, number>;
}

export interface AnomalyResult {
	transaction_id?: string | null;
	amount: number;
	category?: string | null;
	anomaly_score: number;
	is_anomaly: boolean;
	risk_type?: string | null;
	anomaly_label?: string | null;
	fraud_probability?: number | null;
	explanation_factors?: Record<string, number>;
}

export interface AnomalyDetectionResponse {
	anomaly_count: number;
	anomalies: AnomalyResult[];
}

export interface ExplainModelResponse {
	model_type: string;
	target_class?: string;
	predicted_score?: number;
	feature_importance: Record<string, number>;
	contribution_values: Record<string, number>;
	positive_impact_features: Record<string, number>;
	negative_impact_features: Record<string, number>;
	base_value: number;
}

export interface AffordabilityResponse {
	can_afford: boolean;
	projected_savings: number;
	shortfall: number;
	required_monthly_savings: number;
	recommendation: string;
}

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
}

export interface Asset {
	id: number;
	name: string;
	asset_type: string;
	purchase_value: number;
	current_value: number;
	purchase_date: string;
	location?: string | null;
	notes?: string | null;
}

export interface AssetDistributionItem {
	asset_type: string;
	value: number;
	percentage: number;
}

export interface PortfolioSummary {
	total_assets_value: number;
	total_liabilities: number;
	net_worth: number;
	distribution: AssetDistributionItem[];
	net_worth_history: Array<{ label: string; net_worth: number }>;
	diversification_score: number;
	projected_net_worth_next_year: number;
	appreciation_projection: Array<{ asset_type: string; projected_value: number; assumed_growth_rate: number }>;
}

export interface PortfolioResponse {
	assets: Asset[];
	summary: PortfolioSummary;
}

export interface FamilyMember {
	id: number;
	name: string;
	role: string;
	monthly_income: number;
	monthly_expense: number;
	savings: number;
	contribution: number;
}

export interface FamilySummary {
	total_income: number;
	total_expense: number;
	total_savings: number;
	savings_rate: number;
	highest_contributor: { name: string; role: string; contribution: number } | null;
	member_count: number;
	income_breakdown: Array<{ name: string; role: string; income: number }>;
	expense_breakdown: Array<{ name: string; role: string; expense: number }>;
}

export interface FamilyResponse {
	members: FamilyMember[];
	summary: FamilySummary;
}

export interface ModelMetric {
	accuracy?: number | null;
	precision?: number | null;
	recall?: number | null;
	f1_score?: number | null;
	roc_auc?: number | null;
}

export interface ModelMetricsResponse {
	transaction_classifier: ModelMetric;
	anomaly_detector: ModelMetric;
	expense_predictor: ModelMetric;
	risk_model: ModelMetric;
	generated_at?: string;
	confusion_matrix?: { labels: Array<string | number>; matrix: number[][] };
}

export interface NetWorthResponse {
	total_assets: number;
	total_liabilities: number;
	net_worth: number;
}

export interface ForecastResponse {
	projected_wealth: number;
	monthly_investment_required: number;
	goal_probability: number;
	financial_gap: number;
	shap_contributions: Record<string, number>;
}

export interface FinancialHealthResponse {
	financial_score: number;
	status: string;
	improvement_suggestion: string;
	shap_contributions: Record<string, number>;
}

export interface FinancialHealthHistoryItem {
	year: number;
	score: number;
}

export interface FinancialCalendarEvent {
	id: number;
	title: string;
	event_type: string;
	amount?: number | null;
	due_date: string;
	status: string;
	notes?: string | null;
}

export interface DigitalTwinResponse {
	behavior_profile: string;
	savings_discipline: string;
	debt_risk_level: string;
	investment_diversification_score: number;
	financial_health_score: number;
	predicted_net_worth_12_months: number;
	predicted_expense_next_month: number;
	predicted_risk_trend: string;
	financial_behavior_score: number;
	spending_volatility: number;
	savings_ratio: number;
	debt_to_income_ratio: number;
	anomaly_frequency: number;
	recommended_actions: string[];
	shap_explanations: Array<{ factor: string; impact: number }>;
}

export interface PortfolioOptimizationResponse {
	recommended_allocation: Record<string, number>;
	expected_return: number;
	portfolio_risk: number;
	sharpe_ratio: number;
	explanation: string[];
	growth_forecast: Array<{ year: number; value: number }>;
	risk_return_points: Array<{ label: string; expected_return: number; risk: number }>;
}

export interface SimulationResponse {
	projected_net_worth: number;
	retirement_success_probability: number;
	years_to_financial_independence: number;
	wealth_trajectory: number[];
	scenario_results: Array<{ scenario: string; net_worth: number }>;
}

export interface PlannerSimulationResponse {
	recommended_monthly_saving: number;
	projected_savings: number;
	goal_probability: number;
	timeline: Array<{ month: number; savings: number }>;
}

export interface RiskPredictResponse {
	risk_score: number;
	debt_probability: number;
	risk_level: string;
	shap_explanation: Record<string, number>;
}
