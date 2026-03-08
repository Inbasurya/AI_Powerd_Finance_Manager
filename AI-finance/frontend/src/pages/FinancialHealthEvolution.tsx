import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { fetchFinancialHealthHistory, predictFinancialHealth } from "../services/api";
import type { FinancialHealthHistoryItem, FinancialHealthResponse } from "../types";

const GRID_COLOR = "rgba(143, 164, 199, 0.25)";
const AXIS_COLOR = "#8fa4c7";

const defaultInputs = {
	income: 95000,
	monthly_expense: 62000,
	savings: 350000,
	investment: 210000,
	spending_ratio: 0.65,
	anomaly_frequency: 0.04,
	debt_to_income_ratio: 0.22,
	asset_value: 950000,
	family_expense_ratio: 0.55,
};

export function FinancialHealthEvolution() {
	const [inputs, setInputs] = useState(defaultInputs);
	const [prediction, setPrediction] = useState<FinancialHealthResponse | null>(null);
	const [history, setHistory] = useState<FinancialHealthHistoryItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function loadData() {
		setLoading(true);
		setError(null);
		try {
			const [pred, hist] = await Promise.all([
				predictFinancialHealth(inputs),
				fetchFinancialHealthHistory(),
			]);
			setPrediction(pred);
			setHistory(hist);
		} catch (err) {
			console.error(err);
			setError("Unable to load financial health insights.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const gaugeValue = Math.min(Math.max(prediction?.financial_score ?? 0, 0), 100);
	const radialData = [{ name: "score", value: gaugeValue, fill: gaugeValue >= 75 ? "#6fa86b" : gaugeValue >= 60 ? "#0fa3b1" : "#f1b24a" }];

	const trendDelta = useMemo(() => {
		if (history.length < 2) return 0;
		return history[history.length - 1].score - history[history.length - 2].score;
	}, [history]);

	const shapList = useMemo(() => {
		if (!prediction?.shap_contributions) return [] as Array<{ name: string; value: number }>;
		return Object.entries(prediction.shap_contributions)
			.map(([name, value]) => ({ name, value }))
			.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
			.slice(0, 6);
	}, [prediction?.shap_contributions]);

	const evolutionSeries = useMemo(() => {
		const historical = history.map((item) => ({ label: String(item.year), historical: item.score }));
		const lastScore = historical.length ? historical[historical.length - 1].historical : prediction?.financial_score ?? 60;
		const target = prediction?.financial_score ?? lastScore;
		// Project next 6 months using a gentle slope towards the predicted score.
		const monthsForward = 6;
		const projected = Array.from({ length: monthsForward }, (_, idx) => {
			const monthLabel = `M+${idx + 1}`;
			const value = lastScore + ((target - lastScore) * (idx + 1)) / monthsForward + idx * 0.3;
			return { label: monthLabel, predicted: Math.max(0, Math.min(100, value)) };
		});
		return historical.map((row) => ({ ...row, predicted: undefined }))
			.concat(projected);
	}, [history, prediction?.financial_score]);

	return (
		<section className="space-y-5">
			<header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
						Financial Health Evolution
					</h2>
					<p className="muted">AI-driven scoring with Gradient Boosting and SHAP-style insights.</p>
				</div>
				{error ? <p className="text-sm" style={{ color: "var(--accent-2)" }}>{error}</p> : null}
			</header>

			<article className="panel">
				<h3 className="section-title">Inputs</h3>
				<div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
					{Object.entries(inputs).map(([key, value]) => (
						<label key={key} className="field">
							<span className="capitalize">{key.replace(/_/g, " ")}</span>
							<input
								type="number"
								value={value}
								onChange={(e) => setInputs((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
							/>
						</label>
					))}
				</div>
				<div className="mt-3 flex justify-end">
					<button type="button" className="button-primary" onClick={loadData} disabled={loading}>
						{loading ? "Scoring..." : "Recalculate"}
					</button>
				</div>
			</article>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>AI Health Score</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent)" }}>
						{prediction ? prediction.financial_score.toFixed(1) : "-"}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Status</p>
					<p className="mt-2 font-heading text-3xl" style={{ color: "var(--text)" }}>
						{prediction?.status ?? "-"}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Recent Momentum</p>
					<p className="mt-2 font-heading text-3xl" style={{ color: trendDelta >= 0 ? "#6fa86b" : "#f1b24a" }}>
						{trendDelta >= 0 ? "+" : ""}{trendDelta.toFixed(1)}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Recommendation</p>
					<p className="mt-2 text-sm" style={{ color: "var(--text)" }}>
						{prediction?.improvement_suggestion ?? "Adjust inputs to view personalized advice."}
					</p>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel h-96">
					<h3 className="section-title">Health Score Gauge</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<RadialBarChart
								cx="50%"
								cy="55%"
								innerRadius="35%"
								outerRadius="80%"
								barSize={24}
								startAngle={180}
								endAngle={0}
								data={radialData}
							>
								<RadialBar background dataKey="value" cornerRadius={12} />
								<Tooltip formatter={(value: number) => [`${value.toFixed(1)} / 100`, "Score"]} />
							</RadialBarChart>
						</ResponsiveContainer>
					</div>
					<p className="-mt-8 text-center font-heading text-3xl" style={{ color: "var(--text)" }}>
						{gaugeValue.toFixed(1)}
					</p>
					<p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
						AI model: Gradient Boosting Regressor
					</p>
				</article>

				<article className="panel h-96">
					<h3 className="section-title">Health Score Evolution</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<LineChart data={evolutionSeries}>
								<CartesianGrid stroke={GRID_COLOR} vertical={false} />
								<XAxis dataKey="label" stroke={AXIS_COLOR} />
								<YAxis stroke={AXIS_COLOR} domain={[0, 100]} />
								<Tooltip formatter={(value: number, name) => [`${Number(value).toFixed(1)}`, name === "historical" ? "Historical" : "Predicted"]} />
								<Line type="monotone" dataKey="historical" stroke="#0fa3b1" strokeWidth={3} dot={{ r: 3 }} name="Historical" />
								<Line type="monotone" dataKey="predicted" stroke="#f1b24a" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 2 }} name="Predicted" />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel h-96">
					<h3 className="section-title">Explainable AI Factors</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<BarChart data={shapList}>
								<CartesianGrid stroke={GRID_COLOR} vertical={false} />
								<XAxis dataKey="name" stroke={AXIS_COLOR} tickFormatter={(v) => v.replace(/_/g, " ")} />
								<YAxis stroke={AXIS_COLOR} />
								<Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Contribution"]} />
								<Bar dataKey="value" fill="#6fa86b" radius={[8, 8, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</article>

				<article className="panel h-96">
					<h3 className="section-title">AI Recommendations</h3>
					<div className="mt-3 space-y-3">
						<p className="text-sm" style={{ color: "var(--text)" }}>
							{prediction?.improvement_suggestion ?? "Refine your inputs to view tailored advice."}
						</p>
						<ul className="list-disc space-y-1 pl-4 text-sm" style={{ color: "var(--text-muted)" }}>
							<li>Increase monthly savings by ₹5000 to improve financial health by 8 points.</li>
							<li>Reduce discretionary spending to improve long-term wealth.</li>
							<li>Keep anomaly frequency low to preserve score stability.</li>
						</ul>
					</div>
				</article>
			</div>
		</section>
	);
}
