import { useEffect, useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Cell,
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { fetchModelMetrics } from "../services/api";
import type { ModelMetric, ModelMetricsResponse } from "../types";

const AXIS_COLOR = "#8fa4c7";
const GRID_COLOR = "rgba(143, 164, 199, 0.25)";
const BAR_COLORS = ["#0fa3b1", "#f26a4b", "#6fa86b", "#8da3ff", "#f1b24a"];

const DEMO_METRICS: ModelMetricsResponse = {
	transaction_classifier: { accuracy: 0.93, precision: 0.91, recall: 0.89, f1_score: 0.9, roc_auc: 0.94 },
	anomaly_detector: { accuracy: 0.95, precision: 0.92, recall: 0.94, f1_score: 0.93, roc_auc: 0.96 },
	expense_predictor: { accuracy: 0.9, precision: 0.88, recall: 0.87, f1_score: 0.88, roc_auc: 0.0 },
	risk_model: { accuracy: 0.88, precision: 0.86, recall: 0.84, f1_score: 0.85, roc_auc: 0.9 },
	generated_at: "demo",
};

const MODEL_ORDER = [
	{ key: "transaction_classifier", label: "Transaction Classifier", color: BAR_COLORS[0] },
	{ key: "anomaly_detector", label: "Anomaly Detection", color: BAR_COLORS[1] },
	{ key: "expense_predictor", label: "Expense Predictor", color: BAR_COLORS[2] },
	{ key: "risk_model", label: "Risk Model", color: BAR_COLORS[3] },
];

function MetricCard({ title, metric }: { title: string; metric: ModelMetric }) {
	return (
		<article className="kpi-card">
			<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
				{title}
			</p>
			<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent)" }}>
				{metric.accuracy?.toFixed(2) ?? "-"}
			</p>
			<p className="muted text-xs">Accuracy</p>
			<div className="mt-3 grid grid-cols-3 gap-2 text-xs" style={{ color: "var(--text)" }}>
				<div>
					<p className="muted">Precision</p>
					<p className="font-semibold">{metric.precision?.toFixed(2) ?? "-"}</p>
				</div>
				<div>
					<p className="muted">Recall</p>
					<p className="font-semibold">{metric.recall?.toFixed(2) ?? "-"}</p>
				</div>
				<div>
					<p className="muted">F1</p>
					<p className="font-semibold">{metric.f1_score?.toFixed(2) ?? "-"}</p>
				</div>
			</div>
		</article>
	);
}

function RocBadge({ label, value }: { label: string; value: number }) {
	const width = Math.min(100, Math.max(0, value * 100));
	return (
		<div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
			<div className="flex items-center justify-between text-sm" style={{ color: "var(--text)" }}>
				<span>{label}</span>
				<span className="font-semibold" style={{ color: "var(--accent)" }}>{(value ?? 0).toFixed(2)}</span>
			</div>
			<div className="mt-2 h-2 rounded-full" style={{ background: "color-mix(in srgb, var(--text-muted) 20%, transparent 80%)" }}>
				<div className="h-2 rounded-full" style={{ width: `${width}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
			</div>
		</div>
	);
}

export function ModelPerformance() {
	const [metrics, setMetrics] = useState<ModelMetricsResponse>(DEMO_METRICS);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const data = await fetchModelMetrics();
				setMetrics({ ...DEMO_METRICS, ...data });
			} catch (err) {
				console.error(err);
				setError("Using demo metrics while live metrics load.");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	const metricFor = (key: keyof ModelMetricsResponse): ModelMetric => {
		const value = metrics[key];
		return (value as ModelMetric) ?? {};
	};

	const accuracyData = useMemo(
		() =>
			MODEL_ORDER.map((model) => ({
				name: model.label,
				Accuracy: metricFor(model.key as keyof ModelMetricsResponse)?.accuracy ?? 0,
			}))
	,
		[metrics]
	);

	const radarData = useMemo(() => {
		const precisionRow: Record<string, number | string> = { metric: "Precision" };
		const recallRow: Record<string, number | string> = { metric: "Recall" };
		const f1Row: Record<string, number | string> = { metric: "F1 Score" };

		MODEL_ORDER.forEach((model) => {
			const metric = metricFor(model.key as keyof ModelMetricsResponse);
			precisionRow[model.label] = metric?.precision ?? 0;
			recallRow[model.label] = metric?.recall ?? 0;
			f1Row[model.label] = metric?.f1_score ?? 0;
		});

		return [precisionRow, recallRow, f1Row];
	}, [metrics]);

	const f1Data = useMemo(
		() =>
			MODEL_ORDER.map((model) => ({
				name: model.label,
				F1: metricFor(model.key as keyof ModelMetricsResponse)?.f1_score ?? 0,
				color: model.color,
			}))
	,
		[metrics]
	);

	const rocIndicators = useMemo(
		() =>
			MODEL_ORDER.map((model) => ({
				label: model.label,
				value: metricFor(model.key as keyof ModelMetricsResponse)?.roc_auc ?? 0,
			}))
	,
		[metrics]
	);

	const leaderboard = useMemo(() => {
		return MODEL_ORDER.map((model) => {
			const metric = metricFor(model.key as keyof ModelMetricsResponse);
			return {
				label: model.label,
				f1: metric?.f1_score ?? 0,
				accuracy: metric?.accuracy ?? 0,
			};
		})
			.sort((a, b) => (b.f1 || 0) - (a.f1 || 0));
	}, [metrics]);

	return (
		<section className="space-y-6">
			<header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
						AI Model Performance
					</h2>
					<p className="muted">Operational metrics for classifiers and predictors (demo-safe).</p>
				</div>
				<div className="text-xs" style={{ color: error ? "var(--accent-2)" : "var(--text-muted)" }}>
					{error ?? `Metrics refreshed • ${metrics.generated_at ?? "demo"}`}
				</div>
			</header>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<MetricCard title="Transaction Classifier" metric={metrics.transaction_classifier} />
				<MetricCard title="Anomaly Detection" metric={metrics.anomaly_detector} />
				<MetricCard title="Expense Predictor" metric={metrics.expense_predictor} />
				<MetricCard title="Risk Model" metric={metrics.risk_model} />
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel h-96">
					<div className="flex items-center justify-between">
						<h3 className="section-title">Accuracy Comparison</h3>
						<span className="text-xs" style={{ color: "var(--text-muted)" }}>Bar chart</span>
					</div>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<BarChart data={accuracyData}>
								<CartesianGrid stroke={GRID_COLOR} vertical={false} />
								<XAxis dataKey="name" stroke={AXIS_COLOR} angle={-8} textAnchor="end" height={60} />
								<YAxis stroke={AXIS_COLOR} domain={[0, 1]} />
								<Tooltip formatter={(value: number) => [value.toFixed(2), "Accuracy"]} />
								<Legend />
								<Bar dataKey="Accuracy" fill={BAR_COLORS[0]} radius={[8, 8, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</article>

				<article className="panel h-96">
					<div className="flex items-center justify-between">
						<h3 className="section-title">Precision / Recall / F1</h3>
						<span className="text-xs" style={{ color: "var(--text-muted)" }}>Radar chart</span>
					</div>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
								<PolarGrid stroke={GRID_COLOR} />
								<PolarAngleAxis dataKey="metric" stroke={AXIS_COLOR} />
								<PolarRadiusAxis angle={30} stroke={AXIS_COLOR} domain={[0, 1]} />
								{MODEL_ORDER.map((model) => (
									<Radar key={model.key} name={model.label} dataKey={model.label} stroke={model.color} fill={model.color} fillOpacity={0.25} />
								))}
								<Legend />
							</RadarChart>
						</ResponsiveContainer>
					</div>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<article className="panel h-80 lg:col-span-2">
					<div className="flex items-center justify-between">
						<h3 className="section-title">F1 Score Bar Chart</h3>
						<span className="text-xs" style={{ color: "var(--text-muted)" }}>Higher is better</span>
					</div>
					<div className="mt-3 h-64">
						<ResponsiveContainer>
							<BarChart data={f1Data}>
								<CartesianGrid stroke={GRID_COLOR} vertical={false} />
								<XAxis dataKey="name" stroke={AXIS_COLOR} />
								<YAxis stroke={AXIS_COLOR} domain={[0, 1]} />
								<Tooltip formatter={(value: number) => [value.toFixed(2), "F1 Score"]} />
								<Bar dataKey="F1" radius={[8, 8, 0, 0]}>
									{f1Data.map((entry, idx) => (
										<Cell key={`cell-${idx}`} fill={entry.color} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</article>

				<article className="panel space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="section-title">ROC-AUC Indicators</h3>
						<span className="text-xs" style={{ color: "var(--text-muted)" }}>Stability signals</span>
					</div>
					<div className="space-y-2">
						{rocIndicators.map((item) => (
							<RocBadge key={item.label} label={item.label} value={item.value} />
						))}
					</div>
				</article>
			</div>

			<article className="panel">
				<div className="flex items-center justify-between">
					<h3 className="section-title">Model Leaderboard</h3>
					<span className="text-xs" style={{ color: "var(--text-muted)" }}>Sorted by F1</span>
				</div>
				<div className="mt-3 divide-y divide-[var(--border)]">
					{leaderboard.map((item, idx) => (
						<div key={item.label} className="flex items-center justify-between py-2">
							<div className="flex items-center gap-3">
								<span className="text-sm" style={{ color: "var(--text-muted)" }}>#{idx + 1}</span>
								<span className="font-semibold" style={{ color: "var(--text)" }}>{item.label}</span>
							</div>
							<div className="text-sm" style={{ color: "var(--text)" }}>
								<span className="mr-3">F1 {item.f1.toFixed(2)}</span>
								<span className="muted">Accuracy {item.accuracy.toFixed(2)}</span>
							</div>
						</div>
					))}
				</div>
			</article>

			{loading ? <p className="muted text-sm">Loading metrics...</p> : null}
		</section>
	);
}
