import { useEffect, useMemo, useState } from "react";

import { fetchDigitalTwin } from "../services/api";
import type { DigitalTwinResponse } from "../types";

const sampleTwin: DigitalTwinResponse = {
	behavior_profile: "Adaptive Saver",
	savings_discipline: "steady",
	debt_risk_level: "moderate",
	investment_diversification_score: 72,
	financial_health_score: 78,
	predicted_net_worth_12_months: 164000,
	predicted_expense_next_month: 3350,
	predicted_risk_trend: "stable",
	financial_behavior_score: 82,
	spending_volatility: 0.18,
	savings_ratio: 0.22,
	debt_to_income_ratio: 0.28,
	anomaly_frequency: 0.06,
	recommended_actions: [
		"Increase automated savings from 18% to 22% for 12 months.",
		"Shift $500/month from cash to a diversified ETF basket.",
		"Refinance high-interest debt to reduce DTI below 25%.",
		"Schedule quarterly expense reviews to keep volatility under control.",
	],
	shap_explanations: [
		{ factor: "Savings discipline", impact: 0.24 },
		{ factor: "Debt-to-income ratio", impact: -0.18 },
		{ factor: "Spending volatility", impact: -0.12 },
		{ factor: "Investment diversification", impact: 0.15 },
		{ factor: "Anomaly frequency", impact: -0.08 },
	],
};

export function DigitalTwin() {
	const [twin, setTwin] = useState<DigitalTwinResponse>(sampleTwin);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(false);

	useEffect(() => {
		async function loadTwin() {
			setLoading(true);
			try {
				const data = await fetchDigitalTwin();
				setTwin(data);
				setError(null);
			} catch (err) {
				console.error("Digital twin load failed", err);
				setError("Demo data shown while live twin loads.");
			} finally {
				setLoading(false);
			}
		}

		loadTwin();
	}, []);

	const shapOrdered = useMemo(() => {
		const list = [...twin.shap_explanations];
		return list.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
	}, [twin.shap_explanations]);

	const shapMax = useMemo(() => {
		const maxVal = Math.max(...shapOrdered.map((item) => Math.abs(item.impact)), 0.01);
		return maxVal;
	}, [shapOrdered]);

	return (
		<section className="space-y-5">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
						AI Financial Digital Twin
					</h2>
					<p className="muted">Behavior insights, forward-looking risk, and explainability.</p>
				</div>
				{loading ? (
					<span className="text-xs" style={{ color: "var(--text-muted)" }}>Refreshing…</span>
				) : error ? (
					<span className="text-xs" style={{ color: "var(--accent-2)" }}>{error}</span>
				) : null}
			</header>

			<div className="grid gap-4 md:grid-cols-3">
				<article className="panel space-y-2">
					<h3 className="section-title">Behavior Profile</h3>
					<p className="text-sm" style={{ color: "var(--text)" }}>{twin.behavior_profile}</p>
					<div className="text-sm" style={{ color: "var(--text-muted)" }}>
						Savings discipline: <span style={{ color: "var(--text)" }}>{twin.savings_discipline}</span>
					</div>
					<div className="text-sm" style={{ color: "var(--text-muted)" }}>
						Debt risk: <span style={{ color: "var(--text)" }}>{twin.debt_risk_level}</span>
					</div>
				</article>

				<article className="panel space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="section-title">Financial Health</h3>
						<span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{twin.financial_health_score}</span>
					</div>
					<div className="h-2 rounded-full" style={{ background: "color-mix(in srgb, var(--text-muted) 20%, transparent 80%)" }}>
						<div
							className="h-2 rounded-full"
							style={{ width: `${Math.min(100, twin.financial_health_score)}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
						/>
					</div>
					<p className="text-sm" style={{ color: "var(--text-muted)" }}>
						Savings ratio {(twin.savings_ratio * 100).toFixed(1)}% • Spending volatility {(twin.spending_volatility * 100).toFixed(1)}%
					</p>
				</article>

				<article className="panel space-y-2">
					<div className="flex items-center justify-between">
						<h3 className="section-title">Forward View</h3>
						<span className="text-sm uppercase" style={{ color: "var(--text-muted)" }}>{twin.predicted_risk_trend}</span>
					</div>
					<p className="text-3xl font-heading" style={{ color: "var(--text)" }}>
						${twin.predicted_net_worth_12_months.toLocaleString()}
					</p>
					<p className="text-sm" style={{ color: "var(--text-muted)" }}>
						Next month expense forecast: ${twin.predicted_expense_next_month.toLocaleString()}
					</p>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<article className="panel lg:col-span-2">
					<div className="flex items-center justify-between gap-2">
						<h3 className="section-title">Recommended Actions</h3>
						<span className="text-xs" style={{ color: "var(--text-muted)" }}>AI prioritized</span>
					</div>
					<ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--text)" }}>
						{twin.recommended_actions.map((item, idx) => (
							<li key={`action-${idx}`} className="rounded-md border px-3 py-2" style={{ borderColor: "var(--border)" }}>
								{item}
							</li>
						))}
					</ul>
				</article>

				<article className="panel space-y-2">
					<h3 className="section-title">Risk + Ratios</h3>
					<div className="space-y-2 text-sm" style={{ color: "var(--text)" }}>
						<div className="flex items-center justify-between">
							<span>Debt-to-income</span>
							<span>{(twin.debt_to_income_ratio * 100).toFixed(1)}%</span>
						</div>
						<div className="flex items-center justify-between">
							<span>Savings ratio</span>
							<span>{(twin.savings_ratio * 100).toFixed(1)}%</span>
						</div>
						<div className="flex items-center justify-between">
							<span>Spending volatility</span>
							<span>{(twin.spending_volatility * 100).toFixed(1)}%</span>
						</div>
						<div className="flex items-center justify-between">
							<span>Anomaly frequency</span>
							<span>{(twin.anomaly_frequency * 100).toFixed(1)}%</span>
						</div>
						<div className="flex items-center justify-between">
							<span>Diversification score</span>
							<span>{twin.investment_diversification_score}</span>
						</div>
					</div>
				</article>
			</div>

			<article className="panel">
				<div className="flex items-center justify-between gap-2">
					<h3 className="section-title">Explainability (SHAP-style)</h3>
					<span className="text-xs" style={{ color: "var(--text-muted)" }}>Normalized impacts</span>
				</div>
				<div className="mt-3 space-y-3">
					{shapOrdered.map((item, idx) => {
						const width = Math.min(100, (Math.abs(item.impact) / shapMax) * 100);
						const positive = item.impact >= 0;
						return (
							<div key={`${item.factor}-${idx}`}>
								<div className="flex items-center justify-between text-sm" style={{ color: "var(--text)" }}>
									<span>{item.factor}</span>
									<span style={{ color: positive ? "var(--success)" : "var(--accent-2)" }}>
										{positive ? "+" : "-"}
										{(Math.abs(item.impact) * 100).toFixed(1)}%
									</span>
								</div>
								<div className="mt-2 h-2 rounded-full" style={{ background: "color-mix(in srgb, var(--text-muted) 20%, transparent 80%)" }}>
									<div
										className="h-2 rounded-full"
										style={{
											width: `${width}%`,
											background: positive ? "linear-gradient(90deg, var(--success), var(--accent))" : "linear-gradient(90deg, var(--accent-2), var(--accent))",
										}}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</article>
		</section>
	);
}
