import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { FormattedNumberInput } from "../components/FormattedNumberInput";
import { explainModel, fetchFinancialScoreHistory, getFinancialScore } from "../services/api";
import type { ExplainModelResponse, FinancialScoreHistoryItem, FinancialScoreResponse } from "../types";

type ScoreForm = {
	income: number;
	spending: number;
	savings: number;
	investments: number;
	anomalies: number;
	liquid_assets: number;
};

const initialForm: ScoreForm = {
	income: 95000,
	spending: 62000,
	savings: 22000,
	investments: 12000,
	anomalies: 1,
	liquid_assets: 18000,
};

const formatter = new Intl.NumberFormat("en-IN");
const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function FinancialScore() {
	const [form, setForm] = useState<ScoreForm>(initialForm);
	const [loading, setLoading] = useState(false);
	const [historyLoading, setHistoryLoading] = useState(true);
	const [error, setError] = useState("");
	const [scoreResult, setScoreResult] = useState<FinancialScoreResponse | null>(null);
	const [scoreHistory, setScoreHistory] = useState<FinancialScoreHistoryItem[]>([]);
	const [explainResult, setExplainResult] = useState<ExplainModelResponse | null>(null);

	useEffect(() => {
		async function loadHistory() {
			setHistoryLoading(true);
			try {
				const history = await fetchFinancialScoreHistory();
				setScoreHistory(history);
			} catch (historyError) {
				console.warn("Score history fallback", historyError);
				setScoreHistory([
					{ month: "Jan", score: 68 },
					{ month: "Feb", score: 71 },
					{ month: "Mar", score: 75 },
				]);
			} finally {
				setHistoryLoading(false);
			}
		}

		loadHistory();
	}, []);

	const factorData = useMemo(() => {
		if (!scoreResult) return [] as Array<{ factor: string; value: number }>;
		return Object.entries(scoreResult.factors).map(([factor, value]) => ({
			factor: factor.replace(/_/g, " "),
			value,
		}));
	}, [scoreResult]);

	const shapData = useMemo(() => {
		if (!scoreResult?.shap_explanation) return [] as Array<{ feature: string; value: number }>;
		return Object.entries(scoreResult.shap_explanation)
			.map(([feature, value]) => ({ feature: feature.replace(/_/g, " "), value }))
			.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
	}, [scoreResult?.shap_explanation]);

	const liquidityPercent = useMemo(() => {
		if (!scoreResult?.factors) return 0;
		const raw = scoreResult.factors.liquidity_score ?? 0;
		return Math.max(0, Math.min(1, raw)) * 100;
	}, [scoreResult?.factors]);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setLoading(true);
		setError("");

		try {
			const scoreResponse = await getFinancialScore(form);
			setScoreResult(scoreResponse);
			setScoreHistory((previous) => {
				const monthLabel = new Date().toLocaleString("default", { month: "short" });
				const updated = [...previous.filter((item) => item.month !== monthLabel), { month: monthLabel, score: scoreResponse.score }];
				return updated.sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));
			});

			const savingsRate = form.income > 0 ? Math.max(0, Math.min(1, form.savings / form.income)) : 0;
			const investmentRatio = form.income > 0 ? Math.max(0, Math.min(1, form.investments / form.income)) : 0;

			const explainResponse = await explainModel({
				model_type: "financial_score",
				income: form.income,
				spending: form.spending,
				savings_rate: savingsRate,
				anomalies: form.anomalies,
				investment_ratio: investmentRatio,
			});
			setExplainResult(explainResponse);
		} catch (submissionError) {
			console.error(submissionError);
			setError("Unable to compute financial score. Check backend endpoints.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="space-y-5">
			<header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
						Financial Score
					</h2>
					<p className="muted">Evaluate your overall health score with transparent, weighted factors.</p>
				</div>
				{loading || historyLoading ? (
					<span className="text-sm" style={{ color: "var(--text-muted)" }}>
						Loading live AI financial twin...
					</span>
				) : null}
			</header>

			<form className="panel grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
				<FormattedNumberInput label="Income" value={form.income} prefix="₹" onValueChange={(value) => setForm((prev) => ({ ...prev, income: value }))} />
				<FormattedNumberInput label="Spending" value={form.spending} prefix="₹" onValueChange={(value) => setForm((prev) => ({ ...prev, spending: value }))} />
				<FormattedNumberInput label="Savings" value={form.savings} prefix="₹" onValueChange={(value) => setForm((prev) => ({ ...prev, savings: value }))} />
				<FormattedNumberInput label="Investments" value={form.investments} prefix="₹" onValueChange={(value) => setForm((prev) => ({ ...prev, investments: value }))} />
				<FormattedNumberInput label="Liquid Assets" value={form.liquid_assets} prefix="₹" onValueChange={(value) => setForm((prev) => ({ ...prev, liquid_assets: value }))} />
				<FormattedNumberInput label="Anomalies" value={form.anomalies} onValueChange={(value) => setForm((prev) => ({ ...prev, anomalies: value }))} helperText="Flagged transactions" />
				<div className="md:col-span-3 flex flex-wrap items-center gap-3">
					<button type="submit" className="button-primary" disabled={loading}>
						{loading ? "Scoring..." : "Compute Score"}
					</button>
					{error ? <p className="text-sm" style={{ color: "var(--accent-2)" }}>{error}</p> : null}
				</div>
			</form>

			<div className="grid gap-4 lg:grid-cols-3">
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Current Score</p>
					<p className="mt-3 font-heading text-5xl" style={{ color: "var(--text)" }}>
						{scoreResult ? scoreResult.score.toFixed(1) : "--"}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Status</p>
					<p className="mt-3 font-heading text-4xl" style={{ color: "var(--accent)" }}>
						{scoreResult ? scoreResult.status : "Pending"}
					</p>
					<p className="muted mt-1 text-sm">Spending discipline + anomaly stability drive this status.</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Liquidity Buffer</p>
					<p className="mt-3 font-heading text-4xl" style={{ color: "var(--success)" }}>
						{scoreResult ? `${liquidityPercent.toFixed(0)}%` : "--"}
					</p>
					<p className="muted mt-1 text-sm">Cash + near-cash coverage of spending.</p>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel h-80">
					<h3 className="section-title">Financial Health Over Time</h3>
					{scoreHistory.length > 0 ? (
						<div className="mt-3 h-64">
							<ResponsiveContainer>
								<LineChart data={scoreHistory}>
									<CartesianGrid stroke="rgba(143, 164, 199, 0.25)" vertical={false} />
									<XAxis dataKey="month" stroke="#8fa4c7" />
									<YAxis stroke="#8fa4c7" domain={[0, 100]} />
									<Tooltip formatter={(value: number) => [`${Number(value).toFixed(1)}`, "Score"]} />
									<Line type="monotone" dataKey="score" stroke="#0fa3b1" strokeWidth={3} dot={{ r: 3 }} />
								</LineChart>
							</ResponsiveContainer>
						</div>
					) : (
						<p className="muted mt-4">History not available; run a score to seed the trend.</p>
					)}
				</article>

				<article className="panel h-80">
					<h3 className="section-title">Weighted Factor Mix</h3>
					{factorData.length > 0 ? (
						<div className="mt-3 h-64">
							<ResponsiveContainer>
								<BarChart data={factorData}>
									<CartesianGrid stroke="rgba(143, 164, 199, 0.25)" vertical={false} />
									<XAxis dataKey="factor" stroke="#8fa4c7" />
									<YAxis stroke="#8fa4c7" />
									<Tooltip formatter={(value: number) => [value.toFixed(3), "Score"]} />
									<Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0fa3b1" />
								</BarChart>
							</ResponsiveContainer>
						</div>
					) : (
						<p className="muted mt-4">Run score calculation to inspect factor distribution.</p>
					)}
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel h-80">
					<h3 className="section-title">Backend SHAP Explanation</h3>
					{shapData.length > 0 ? (
						<div className="mt-3 h-64">
							<ResponsiveContainer>
								<BarChart data={shapData} layout="vertical" margin={{ left: 20, right: 10 }}>
									<CartesianGrid stroke="rgba(143, 164, 199, 0.25)" />
									<XAxis type="number" stroke="#8fa4c7" />
									<YAxis type="category" width={120} dataKey="feature" stroke="#8fa4c7" />
									<Tooltip formatter={(value: number) => [`${value.toFixed(2)}`, "Impact"]} />
									<Bar dataKey="value" radius={[0, 6, 6, 0]}>
										{shapData.map((item) => (
											<Cell key={item.feature} fill={item.value >= 0 ? "#6fa86b" : "#f26a4b"} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					) : (
						<p className="muted mt-4">SHAP detail appears after scoring request completes.</p>
					)}
				</article>

				<article className="panel h-80">
					<h3 className="section-title">AI Explainer (Client)</h3>
					{explainResult ? (
						<div className="mt-3 space-y-2 text-sm" style={{ color: "var(--text)" }}>
							<p>Model baseline: <strong>{explainResult.base_value.toFixed(2)}</strong></p>
							<p>Predicted score: {explainResult.predicted_score?.toFixed(2) ?? "-"}</p>
							<p className="muted">Client-side SHAP completes after backend scoring.</p>
						</div>
					) : (
						<p className="muted mt-4">Run the score to view AI explainer context.</p>
					)}
				</article>
			</div>

			{scoreResult ? (
				<article className="panel">
					<h3 className="section-title">Quick Narrative</h3>
					<p className="text-sm" style={{ color: "var(--text)" }}>
						Savings and investments add ₹{formatter.format(form.savings + form.investments)} to resilience, while {form.anomalies} anomalies trimmed the score slightly. Keep spending below {Math.max(0, Math.round((form.spending / form.income) * 100))}% of income to lift status.
					</p>
				</article>
			) : null}
		</section>
	);
}
