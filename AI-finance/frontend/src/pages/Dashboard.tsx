import { useEffect, useMemo, useState } from "react";

import {
	AnomalyAlertsPanel,
	FinancialHealthScoreGauge,
	MonthlyExpenseTrend,
	SavingsGrowthChart,
	SpendingPieChart,
} from "../components/Charts";
import { detectAnomalies, getFinancialScore, predictExpense, fetchCalendarEvents, fetchDigitalTwin, fetchModelMetrics } from "../services/api";
import type { Transaction, FinancialCalendarEvent, DigitalTwinResponse, ModelMetricsResponse } from "../types";

const sampleTransactions: Transaction[] = [
	{
		id: "tx-1",
		date: "2026-02-01",
		description: "Groceries",
		category: "Food",
		amount: 240,
		account_balance: 5200,
		merchant_risk: 0.1,
	},
	{
		id: "tx-2",
		date: "2026-02-03",
		description: "Electronics",
		category: "Shopping",
		amount: 1450,
		account_balance: 3900,
		merchant_risk: 0.8,
	},
	{
		id: "tx-3",
		date: "2026-02-08",
		description: "Train pass",
		category: "Travel",
		amount: 120,
		account_balance: 3650,
		merchant_risk: 0.2,
	},
];

export function Dashboard() {
	const [score, setScore] = useState<number>(0);
	const [status, setStatus] = useState<string>("-");
	const [nextExpense, setNextExpense] = useState<number>(0);
	const [anomalyCount, setAnomalyCount] = useState<number>(0);
	const [anomalyScores, setAnomalyScores] = useState<Array<{ label: string; score: number }>>([]);
	const [calendarEvents, setCalendarEvents] = useState<FinancialCalendarEvent[]>([]);
	const [calendarError, setCalendarError] = useState<string | null>(null);
	const [behaviorProfile, setBehaviorProfile] = useState<string>("Adaptive Saver");
	const [behaviorScore, setBehaviorScore] = useState<number>(82);
	const [behaviorRiskTrend, setBehaviorRiskTrend] = useState<string>("stable");
	const [behaviorAction, setBehaviorAction] = useState<string>("Increase automated savings by 4% to hit target.");
	const [modelPerformance, setModelPerformance] = useState<Array<{ label: string; accuracy: number }>>([
		{ label: "Transaction Classifier", accuracy: 0.93 },
		{ label: "Anomaly Detection", accuracy: 0.95 },
		{ label: "Risk Model", accuracy: 0.88 },
	]);

	useEffect(() => {
		async function loadDashboardData() {
			try {
					const [scoreRes, expenseRes, anomalyRes, calendarRes] = await Promise.all([
					getFinancialScore({
						income: 5800,
						spending: 3400,
						savings: 1400,
						anomalies: 1,
						investments: 700,
					}),
					predictExpense(
						[2800, 2950, 3100, 3300, 3200, 3400],
						{
							Food: [520, 560, 590, 620],
							Travel: [260, 300, 290, 350],
							Bills: [900, 920, 940, 970],
						}
					),
					detectAnomalies(sampleTransactions),
						fetchCalendarEvents(),
				]);

				setScore(scoreRes.score);
				setStatus(scoreRes.status);
				setNextExpense(expenseRes.next_month_expense);
					setAnomalyCount(anomalyRes.anomaly_count);
					setAnomalyScores(
						(anomalyRes.anomalies ?? []).slice(0, 6).map((item, idx) => ({
							label: `TX-${idx + 1}`,
							score: item.anomaly_score,
						}))
					);
					setCalendarEvents(calendarRes);

				// Load AI digital twin summary without blocking the main dashboard data.
				try {
					const twin: DigitalTwinResponse = await fetchDigitalTwin();
					setBehaviorProfile(twin.behavior_profile);
					setBehaviorScore(twin.financial_behavior_score);
					setBehaviorRiskTrend(twin.predicted_risk_trend);
					setBehaviorAction((twin.recommended_actions ?? [])[0] ?? "Balance savings and risk to stay on track.");
				} catch (twinError) {
					console.warn("Digital twin summary fallback", twinError);
					setBehaviorProfile("Adaptive Saver");
					setBehaviorScore(82);
					setBehaviorRiskTrend("stable");
					setBehaviorAction("Increase automated savings by 4% to hit target.");
				}

				// Load model metrics for dashboard widget (demo-safe fallback).
				try {
					const metrics: ModelMetricsResponse = await fetchModelMetrics();
					setModelPerformance([
						{ label: "Transaction Classifier", accuracy: metrics.transaction_classifier?.accuracy ?? 0.93 },
						{ label: "Anomaly Detection", accuracy: metrics.anomaly_detector?.accuracy ?? 0.95 },
						{ label: "Risk Model", accuracy: metrics.risk_model?.accuracy ?? 0.88 },
					]);
				} catch (metricsError) {
					console.warn("Model metrics fallback", metricsError);
					setModelPerformance([
						{ label: "Transaction Classifier", accuracy: 0.93 },
						{ label: "Anomaly Detection", accuracy: 0.95 },
						{ label: "Risk Model", accuracy: 0.88 },
					]);
				}
			} catch (error) {
				console.error("Dashboard data failed:", error);
				setCalendarError("Calendar temporarily unavailable; showing sample events.");
				setScore(74);
				setStatus("Stable");
				setNextExpense(3500);
				setAnomalyCount(2);
				setAnomalyScores([
					{ label: "TX-1", score: -0.12 },
					{ label: "TX-2", score: -0.21 },
				]);
				setCalendarEvents([
					{
						id: 1,
						title: "Credit Card Bill",
						event_type: "credit_card_bill",
						amount: 1800,
						due_date: new Date().toISOString(),
						status: "upcoming",
						notes: "Auto-pay on due date",
					},
					{
						id: 2,
						title: "Insurance Premium",
						event_type: "insurance_premium",
						amount: 3200,
						due_date: new Date().toISOString(),
						status: "upcoming",
						notes: "Annual renewal",
					},
				]);
				setBehaviorProfile("Adaptive Saver");
				setBehaviorScore(80);
				setBehaviorRiskTrend("moderate");
				setBehaviorAction("Tighten discretionary spend and lift savings auto-transfer by 3%.");
				setModelPerformance([
					{ label: "Transaction Classifier", accuracy: 0.93 },
					{ label: "Anomaly Detection", accuracy: 0.95 },
					{ label: "Risk Model", accuracy: 0.88 },
				]);
			}
		}

		loadDashboardData();
	}, []);

	const expenseTrend = useMemo(
		() => [
			{ month: "Sep", actual: 2800, predicted: 0 },
			{ month: "Oct", actual: 2950, predicted: 0 },
			{ month: "Nov", actual: 3100, predicted: 0 },
			{ month: "Dec", actual: 3300, predicted: 0 },
			{ month: "Jan", actual: 3200, predicted: 0 },
			{ month: "Feb", actual: 3400, predicted: 0 },
			{ month: "Mar", actual: 0, predicted: nextExpense || 3500 },
		],
		[nextExpense]
	);

	const spendingMix = useMemo(
		() => [
			{ category: "Food", amount: 640 },
			{ category: "Bills", amount: 980 },
			{ category: "Travel", amount: 420 },
			{ category: "Shopping", amount: 760 },
			{ category: "Investment", amount: 560 },
			{ category: "Healthcare", amount: 300 },
		],
		[]
	);

	const savingsSeries = useMemo(
		() => [
			{ month: "Oct", savings: 760 },
			{ month: "Nov", savings: 890 },
			{ month: "Dec", savings: 910 },
			{ month: "Jan", savings: 1020 },
			{ month: "Feb", savings: 1150 },
			{ month: "Mar", savings: 1210 },
		],
		[]
	);

	const goals = useMemo(
		() => [
			{ title: "House Purchase", progress: 52, target: "$150k" },
			{ title: "Retirement Fund", progress: 68, target: "$1.2M" },
			{ title: "Emergency Fund", progress: 85, target: "$24k" },
			{ title: "Child Education", progress: 40, target: "$80k" },
		],
		[]
	);

	const calendarDays = useMemo(() => {
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const eventsByDay = new Map<number, FinancialCalendarEvent[]>();
		calendarEvents.forEach((event) => {
			const day = new Date(event.due_date).getDate();
			const list = eventsByDay.get(day) ?? [];
			list.push(event);
			eventsByDay.set(day, list);
		});
		return Array.from({ length: daysInMonth }, (_, idx) => {
			const day = idx + 1;
			return { day, events: eventsByDay.get(day) ?? [] };
		});
	}, [calendarEvents]);

	const alerts = useMemo(() => {
		const items = [] as Array<{ title: string; detail: string; tone: "warning" | "info" | "danger" }>;
		if (nextExpense > 3400) items.push({ title: "High spending warning", detail: `Next month projected at $${nextExpense.toFixed(0)}; consider trimming discretionary categories.`, tone: "warning" });
		if (anomalyCount > 0) items.push({ title: "Anomaly detected", detail: `${anomalyCount} suspicious transactions flagged this cycle.`, tone: "danger" });
		items.push({ title: "Savings below target", detail: "Maintain 20% savings rate to reach medium-term goals.", tone: "warning" });
		items.push({ title: "Increasing debt risk", detail: "Monitor credit utilization and loan EMI schedule to avoid score drag.", tone: "info" });
		return items;
	}, [anomalyCount, nextExpense]);

	const spendingInsights = useMemo(() => {
		return [
			"Food and Bills remain top categories; consider capped envelopes.",
			"Recent spike in Shopping flagged as abnormal spending.",
			`Predicted next month expense: $${nextExpense.toFixed(0)} (trend-adjusted).`,
			"Investments stable; room to increase contributions by 5-10%.",
		];
	}, [nextExpense]);

	return (
		<section className="space-y-5">
			<header>
				<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
					Financial Command Center
				</h2>
				<p className="muted">AI snapshots for score, anomalies, and savings trajectory.</p>
			</header>

			<div className="grid gap-4 md:grid-cols-4">
				<article className="kpi-card md:col-span-1">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Total Balance
					</p>
					<p className="mt-2 font-heading text-5xl" style={{ color: "var(--text)" }}>
						$12,840
					</p>
					<p className="mt-2 text-sm" style={{ color: "var(--success)" }}>
						+7.2% this month
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Monthly Spending
					</p>
					<p className="mt-3 font-heading text-4xl" style={{ color: "var(--accent-2)" }}>
						$3,400
					</p>
					<p className="muted mt-2">Forecast next month: ${nextExpense.toFixed(0)}</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Savings Progress
					</p>
					<p className="mt-3 font-heading text-4xl" style={{ color: "var(--success)" }}>
						68%
					</p>
					<div className="mt-3 h-2 rounded-full" style={{ background: "color-mix(in srgb, var(--text-muted) 25%, transparent 75%)" }}>
						<div className="h-2 w-[68%] rounded-full" style={{ background: "linear-gradient(90deg, var(--success), var(--accent))" }} />
					</div>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Financial Risk Score
					</p>
					<p className="mt-3 font-heading text-4xl" style={{ color: "var(--accent)" }}>
						{score}
					</p>
					<span className="mt-2 inline-block rounded-full px-3 py-1 text-sm" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent 80%)", color: "var(--text)" }}>
						{status}
					</span>
				</article>
			</div>

			<article className="panel">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h3 className="section-title">AI Behavior Summary</h3>
					<span className="text-xs" style={{ color: "var(--text-muted)" }}>
						{behaviorRiskTrend} trend
					</span>
				</div>
				<div className="mt-2 grid gap-3 md:grid-cols-3">
					<div>
						<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Profile</p>
						<p className="mt-1 text-lg font-semibold" style={{ color: "var(--text)" }}>{behaviorProfile}</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Behavior Score</p>
						<p className="mt-1 text-lg font-semibold" style={{ color: "var(--accent)" }}>{behaviorScore}</p>
						<div className="mt-2 h-1.5 rounded-full" style={{ background: "color-mix(in srgb, var(--text-muted) 20%, transparent 80%)" }}>
							<div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, behaviorScore)}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
						</div>
					</div>
					<div>
						<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Next Move</p>
						<p className="mt-1 text-sm" style={{ color: "var(--text)" }}>{behaviorAction}</p>
					</div>
				</div>
			</article>

			<article className="panel">
				<div className="flex items-center justify-between">
					<h3 className="section-title">AI Model Performance</h3>
					<span className="text-xs" style={{ color: "var(--text-muted)" }}>Demo-safe</span>
				</div>
				<div className="mt-3 grid gap-3 md:grid-cols-3">
					{modelPerformance.map((item) => (
						<div key={item.label} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
							<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{item.label}</p>
							<p className="mt-2 font-heading text-3xl" style={{ color: "var(--accent)" }}>
								{(item.accuracy * 100).toFixed(0)}%
							</p>
							<div className="mt-2 h-1.5 rounded-full" style={{ background: "color-mix(in srgb, var(--text-muted) 25%, transparent 75%)" }}>
								<div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, item.accuracy * 100)}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
							</div>
						</div>
					))}
				</div>
			</article>

			<article className="panel flex items-center justify-between gap-3">
				<div>
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Anomaly Alerts
					</p>
					<p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
						Real-time suspicious transaction detector.
					</p>
				</div>
				<p className="font-heading text-4xl" style={{ color: "var(--accent-2)" }}>
					{anomalyCount}
				</p>
			</article>

			<div className="grid gap-4 lg:grid-cols-2">
				<SpendingPieChart data={spendingMix} />
				<MonthlyExpenseTrend data={expenseTrend} />
				<SavingsGrowthChart data={savingsSeries} />
				<FinancialHealthScoreGauge score={score} />
			</div>

			<div className="grid gap-4">
				<AnomalyAlertsPanel
					data={
						anomalyScores.length > 0
							? anomalyScores
							: [
									{ label: "TX-1", score: -0.12 },
									{ label: "TX-2", score: 0.09 },
									{ label: "TX-3", score: -0.27 },
								]
					}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel">
					<div className="flex items-center justify-between gap-2">
						<h3 className="section-title">Dashboard Goals</h3>
						<span className="text-xs" style={{ color: "var(--text-muted)" }}>Sample progress snapshots</span>
					</div>
					<div className="mt-3 space-y-3">
						{goals.map((goal) => (
							<div key={goal.title} className="space-y-1">
								<div className="flex items-center justify-between text-sm" style={{ color: "var(--text)" }}>
									<span>{goal.title}</span>
									<span>{goal.progress}% • Target {goal.target}</span>
								</div>
								<div className="h-2 rounded-full" style={{ background: "color-mix(in srgb, var(--text-muted) 20%, transparent 80%)" }}>
									<div
										className="h-2 rounded-full"
										style={{ width: `${goal.progress}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
									/>
								</div>
							</div>
						))}
					</div>
				</article>

				<article className="panel">
					<div className="flex items-center justify-between gap-2">
						<h3 className="section-title">Financial Calendar</h3>
						{calendarError ? <span className="text-xs" style={{ color: "var(--accent-2)" }}>{calendarError}</span> : null}
					</div>
					<div className="mt-3 grid grid-cols-7 gap-2 text-xs" style={{ color: "var(--text)" }}>
						{calendarDays.map((item) => {
							const hasEvent = item.events.length > 0;
							return (
								<div
									key={`day-${item.day}`}
									className="rounded-md border p-2 text-center"
									style={{
										borderColor: hasEvent ? "var(--accent)" : "var(--border)",
										background: hasEvent ? "color-mix(in srgb, var(--accent) 12%, transparent 88%)" : "transparent",
									}}
								>
									<div className="font-semibold">{item.day}</div>
									{hasEvent ? <div className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>{item.events.length} event(s)</div> : null}
								</div>
							);
						})}
					</div>
					<div className="mt-4 space-y-2 text-sm" style={{ color: "var(--text)" }}>
						{calendarEvents.map((event) => (
							<div key={event.id} className="flex items-center justify-between rounded-md border px-3 py-2" style={{ borderColor: "var(--border)" }}>
								<div>
									<p className="font-semibold">{event.title}</p>
									<p className="text-xs" style={{ color: "var(--text-muted)" }}>
										{new Date(event.due_date).toLocaleDateString()} • {event.event_type.replace(/_/g, " ")}
									</p>
								</div>
								<div className="text-right text-sm">
									{event.amount ? `$${event.amount.toLocaleString()}` : "—"}
									<p className="text-xs" style={{ color: "var(--text-muted)" }}>{event.status}</p>
								</div>
							</div>
						))}
					</div>
				</article>

				<article className="panel">
					<div className="flex items-center justify-between gap-2">
						<h3 className="section-title">AI Alerts</h3>
						<span className="text-xs" style={{ color: "var(--text-muted)" }}>Automated signals</span>
					</div>
					<div className="mt-3 space-y-2 text-sm" style={{ color: "var(--text)" }}>
						{alerts.map((alert, idx) => (
							<div
								key={`${alert.title}-${idx}`}
								className="rounded-md border px-3 py-2"
								style={{
									borderColor: alert.tone === "danger" ? "var(--accent-2)" : alert.tone === "warning" ? "var(--accent)" : "var(--border)",
									background: alert.tone === "danger"
										? "color-mix(in srgb, var(--accent-2) 18%, transparent 82%)"
										: alert.tone === "warning"
										? "color-mix(in srgb, var(--accent) 14%, transparent 86%)"
										: "color-mix(in srgb, var(--text-muted) 6%, transparent 94%)",
								}}
							>
								<p className="font-semibold">{alert.title}</p>
								<p className="text-xs" style={{ color: "var(--text-muted)" }}>{alert.detail}</p>
							</div>
						))}
					</div>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel">
					<h3 className="section-title">Spending Intelligence</h3>
					<ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--text)" }}>
						{spendingInsights.map((insight, idx) => (
							<li key={`insight-${idx}`} className="rounded-md border px-3 py-2" style={{ borderColor: "var(--border)" }}>
								{insight}
							</li>
						))}
					</ul>
				</article>
				<article className="panel">
					<h3 className="section-title">AI Alerts Feed</h3>
					<div className="mt-3 space-y-2 text-sm" style={{ color: "var(--text)" }}>
						{alerts.map((alert, idx) => (
							<div key={`alert-feed-${idx}`} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2" style={{ borderColor: "var(--border)" }}>
								<div>
									<p className="font-semibold">{alert.title}</p>
									<p className="text-xs" style={{ color: "var(--text-muted)" }}>{alert.detail}</p>
								</div>
								<span className="text-[11px] uppercase" style={{ color: "var(--text-muted)" }}>
									{alert.tone}
								</span>
							</div>
						))}
					</div>
				</article>
			</div>
		</section>
	);
}
