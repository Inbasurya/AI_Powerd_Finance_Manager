import React, { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

import { detectAnomalies } from "../services/api";
import type { AnomalyResult, Transaction } from "../types";

const payload: Transaction[] = [
	{ id: "a1", date: "2026-03-01", description: "Coffee", category: "Food", amount: 6.5, account_balance: 4800, merchant_risk: 0.1 },
	{ id: "a2", date: "2026-03-02", description: "Luxury watch", category: "Shopping", amount: 4200, account_balance: 4100, merchant_risk: 0.95 },
	{ id: "a3", date: "2026-03-03", description: "Online transfer", category: "Bills", amount: 1700, account_balance: 1200, merchant_risk: 0.85 },
	{ id: "a4", date: "2026-03-04", description: "Fuel", category: "Travel", amount: 75, account_balance: 1120, merchant_risk: 0.2 },
];

const AXIS_COLOR = "#8fa4c7";
const GRID_COLOR = "rgba(143, 164, 199, 0.25)";

function severityLabel(score: number, isAnomaly: boolean) {
	if (!isAnomaly) return "Low";
	if (score <= -0.15) return "Critical";
	if (score <= -0.05) return "High";
	return "Medium";
}

export function AnomalyDetection() {
	const [rows, setRows] = useState<AnomalyResult[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const shapData = useMemo(() => {
		const totals = new Map<string, number>();
		rows.forEach((row) => {
			Object.entries(row.explanation_factors ?? {}).forEach(([feature, value]) => {
				totals.set(feature, (totals.get(feature) ?? 0) + Math.abs(value));
			});
		});
		return Array.from(totals.entries())
			.map(([feature, value]) => ({ feature, value }))
			.sort((a, b) => b.value - a.value)
			.slice(0, 8);
	}, [rows]);

	useEffect(() => {
		async function runDetection() {
			setLoading(true);
			setError(null);
			try {
				const response = await detectAnomalies(payload);
				if (response?.anomalies?.length) {
					setRows(response.anomalies);
				} else {
					setRows(
						payload.map((p, idx) => ({
							transaction_id: p.id,
							amount: p.amount,
							category: p.category,
							anomaly_score: -0.02 * (idx + 1),
							is_anomaly: idx % 2 === 1,
							risk_type: idx % 2 === 1 ? "fraud" : "normal",
							anomaly_label: idx % 2 === 1 ? "fraud" : "normal",
							fraud_probability: idx % 2 === 1 ? 0.42 + idx * 0.1 : 0.08,
							explanation_factors: { amount_spike: 0.2 + idx * 0.1, merchant_risk: p.merchant_risk },
						}))
					);
				}
			} catch (err) {
				console.error(err);
				setError("Failed to load anomalies.");
				setRows(
					payload.map((p, idx) => ({
						transaction_id: p.id,
						amount: p.amount,
						category: p.category,
						anomaly_score: -0.01 * (idx + 1),
						is_anomaly: idx % 2 === 0,
						risk_type: idx % 2 === 0 ? "fraud" : "normal",
						anomaly_label: idx % 2 === 0 ? "fraud" : "normal",
						fraud_probability: idx % 2 === 0 ? 0.35 : 0.07,
						explanation_factors: { amount_spike: 0.15 + idx * 0.05, merchant_risk: p.merchant_risk },
					}))
				);
			} finally {
				setLoading(false);
			}
		}

		runDetection();
	}, []);

	return (
		<section className="space-y-5">
			<header>
				<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
					Anomaly Detection
				</h2>
				<p className="muted">Flagging unusual, fraud-like, and abnormal spending patterns.</p>
				{error ? (
					<p className="text-sm" style={{ color: "var(--danger)" }}>
						{error}
					</p>
				) : null}
			</header>

			<article className="panel">
				<h3 className="section-title">Anomaly Table</h3>
				<div className="mt-3 overflow-x-auto">
					<table className="w-full text-sm">
						<thead style={{ color: "var(--text-muted)" }}>
							<tr>
								<th className="py-2 text-left">Transaction</th>
								<th className="text-left">Category</th>
								<th className="text-right">Amount</th>
								<th className="text-right">Score</th>
								<th className="text-left">Severity</th>
							</tr>
						</thead>
						<tbody style={{ color: "var(--text)" }}>
							{rows.length === 0 ? (
								<tr>
									<td className="py-3" colSpan={5} style={{ color: "var(--text-muted)" }}>
										{loading ? "Loading anomalies..." : "No anomalies detected."}
									</td>
								</tr>
							) : (
								rows.map((row) => {
									const severity = severityLabel(row.anomaly_score, row.is_anomaly);
									const highlight = row.is_anomaly;
									return (
										<tr key={row.transaction_id ?? row.category ?? row.anomaly_score} className="border-t" style={{
											borderColor: "var(--border)",
											background: highlight ? "color-mix(in srgb, var(--accent-2) 18%, transparent 82%)" : "transparent",
										}}>
											<td className="py-3 font-semibold">{row.transaction_id ?? "-"}</td>
											<td>{row.category ?? "Unknown"}</td>
											<td className="text-right">${row.amount.toLocaleString()}</td>
											<td className="text-right">{row.anomaly_score.toFixed(4)}</td>
											<td>
												<span
													className="rounded-full px-3 py-1 text-xs"
													style={{
														background: highlight
															? "color-mix(in srgb, var(--accent-2) 30%, transparent 70%)"
															: "color-mix(in srgb, var(--success) 24%, transparent 76%)",
														color: "var(--text)",
													}}
												>
													{severity}
												</span>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</article>

				<article className="panel">
					<h3 className="section-title">Explanations</h3>
					<div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
						{rows.slice(0, 6).map((row, idx) => (
							<div key={row.transaction_id ?? idx} className="kpi-card">
								<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
									{row.anomaly_label ?? "anomaly"}
								</p>
								<p className="mt-1 text-sm" style={{ color: "var(--text)" }}>
									Fraud probability {(row.fraud_probability ?? 0) * 100 >= 1 ? ((row.fraud_probability ?? 0) * 100).toFixed(1) : "<1"}%
								</p>
								<p className="text-xs" style={{ color: "var(--text-muted)" }}>
									Top factor: {Object.entries(row.explanation_factors ?? { merchant_risk: 0 }).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0]}
								</p>
							</div>
						))}
					</div>
				</article>

			<article className="panel h-96">
				<h3 className="section-title">Anomaly Score Distribution</h3>
				<div className="mt-3 h-80">
					<ResponsiveContainer>
						<BarChart data={rows.map((row, idx) => ({ name: row.transaction_id ?? `TX-${idx + 1}`, score: row.anomaly_score, isAnomaly: row.is_anomaly }))}>
							<CartesianGrid stroke={GRID_COLOR} vertical={false} />
							<XAxis dataKey="name" stroke={AXIS_COLOR} />
							<YAxis stroke={AXIS_COLOR} />
							<Tooltip formatter={(value: number, _n, payload) => [value.toFixed(4), payload?.payload?.isAnomaly ? "Suspicious" : "Normal"]} />
							<Bar dataKey="score" radius={[8, 8, 0, 0]} fill="#f26a4b" />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</article>

			<article className="panel h-96">
				<h3 className="section-title">Anomaly SHAP Explanations</h3>
				<div className="mt-3 h-80">
					<ResponsiveContainer>
						<BarChart data={shapData} layout="vertical" margin={{ left: 20, right: 20 }}>
							<CartesianGrid stroke={GRID_COLOR} />
							<XAxis type="number" stroke={AXIS_COLOR} />
							<YAxis type="category" dataKey="feature" width={120} stroke={AXIS_COLOR} tickFormatter={(v) => v.replace(/_/g, " ")} />
							<Tooltip formatter={(value: number) => [value.toFixed(3), "Importance"]} />
							<Bar dataKey="value" radius={[0, 6, 6, 0]}>
								{shapData.map((row) => (
									<Cell key={row.feature} fill="#0fa3b1" />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</article>

			{loading ? <p className="muted text-sm">Loading anomalies...</p> : null}
		</section>
	);
}
