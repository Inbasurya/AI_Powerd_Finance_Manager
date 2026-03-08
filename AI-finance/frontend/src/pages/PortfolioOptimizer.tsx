import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis, Line, LineChart, Scatter, ScatterChart, ZAxis } from "recharts";

import { FormattedNumberInput } from "../components/FormattedNumberInput";
import { fetchFamilySummary, fetchPortfolio, optimizePortfolio } from "../services/api";
import type { FamilySummary, PortfolioOptimizationResponse, PortfolioResponse } from "../types";

const PIE_COLORS = ["#0fa3b1", "#6fa86b", "#f1b24a", "#8fa4c7", "#c084fc", "#f97316", "#f43f5e"];
const GRID_COLOR = "rgba(143, 164, 199, 0.25)";
const AXIS_COLOR = "#8fa4c7";
const ASSET_CLASSES = ["stocks", "mutual_funds", "etf", "gold", "real_estate", "bonds", "cash", "crypto", "business"];

const defaultInputs = {
	monthly_income: 95000,
	monthly_expense: 62000,
	current_savings: 400000,
	risk_tolerance: "medium",
	investment_horizon: 7,
	investment_amount: 500000,
};

export function PortfolioOptimizer() {
	const [inputs, setInputs] = useState(defaultInputs);
	const [selectedAssets, setSelectedAssets] = useState<string[]>(ASSET_CLASSES.slice(0, 6));
	const [existingAssets, setExistingAssets] = useState<Record<string, number>>({});
	const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
	const [family, setFamily] = useState<FamilySummary | null>(null);
	const [result, setResult] = useState<PortfolioOptimizationResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function bootstrap() {
			try {
				const [pf, fam] = await Promise.allSettled([fetchPortfolio(), fetchFamilySummary()]);
				if (pf.status === "fulfilled") {
					setPortfolio(pf.value);
					const dist: Record<string, number> = {};
					pf.value.summary.distribution.forEach((item) => {
						dist[item.asset_type.toLowerCase()] = item.value;
					});
					setExistingAssets(dist);
				}
				if (fam.status === "fulfilled") setFamily(fam.value);
			} catch (err) {
				console.error(err);
			}
		}
		bootstrap();
	}, []);

	async function runOptimization() {
		setLoading(true);
		setError(null);
		try {
			const payload = { ...inputs, existing_assets: existingAssets, asset_classes: selectedAssets, investment_amount: inputs.investment_amount };
			const data = await optimizePortfolio(payload);
			setResult(data);
		} catch (err) {
			console.error(err);
			setError("Unable to optimize portfolio. Check API status.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		runOptimization();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const allocationEntries = useMemo(() => {
		if (!result?.recommended_allocation) return [] as Array<{ name: string; value: number }>;
		return Object.entries(result.recommended_allocation).map(([name, value]) => ({ name, value }));
	}, [result?.recommended_allocation]);

	const growthForecast = useMemo(() => {
		if (result?.growth_forecast?.length) return result.growth_forecast;
		return [
			{ year: 1, value: 520000 },
			{ year: 2, value: 585000 },
			{ year: 3, value: 654000 },
			{ year: 4, value: 731000 },
		];
	}, [result?.growth_forecast]);

	const efficientFrontier = useMemo(() => {
		if (result?.risk_return_points?.length) return result.risk_return_points;
		return [
			{ label: "Baseline", expected_return: 9.5, risk: 8.1 },
			{ label: "Balanced", expected_return: 10.2, risk: 9.4 },
			{ label: "Aggressive", expected_return: 12.1, risk: 11.8 },
		];
	}, [result?.risk_return_points]);

	return (
		<section className="space-y-5">
			<header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
						AI Portfolio Optimizer
					</h2>
					<p className="muted">MPT-inspired allocation with AI insights, Sharpe optimization, and integrated family/assets context.</p>
				</div>
				<div className="text-sm" style={{ color: "var(--text-muted)" }}>
					{loading ? <p>Loading live AI financial twin...</p> : null}
					{error ? <p style={{ color: "var(--accent-2)" }}>{error}</p> : null}
				</div>
			</header>

			<article className="panel">
				<h3 className="section-title">Inputs</h3>
				<div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
					<FormattedNumberInput label="Monthly Income" prefix="₹" value={inputs.monthly_income} onValueChange={(value) => setInputs((prev) => ({ ...prev, monthly_income: value }))} />
					<FormattedNumberInput label="Monthly Expense" prefix="₹" value={inputs.monthly_expense} onValueChange={(value) => setInputs((prev) => ({ ...prev, monthly_expense: value }))} />
					<FormattedNumberInput label="Current Savings" prefix="₹" value={inputs.current_savings} onValueChange={(value) => setInputs((prev) => ({ ...prev, current_savings: value }))} />
					<FormattedNumberInput label="Investment Amount" prefix="₹" value={inputs.investment_amount} onValueChange={(value) => setInputs((prev) => ({ ...prev, investment_amount: value }))} />
					<label className="field">
						<span>Risk tolerance</span>
						<select value={inputs.risk_tolerance} onChange={(e) => setInputs((prev) => ({ ...prev, risk_tolerance: e.target.value }))}>
							<option value="low">low</option>
							<option value="medium">medium</option>
							<option value="high">high</option>
						</select>
					</label>
					<label className="field">
						<span>Investment horizon (years)</span>
						<input type="number" value={inputs.investment_horizon} min={1} onChange={(e) => setInputs((prev) => ({ ...prev, investment_horizon: Number(e.target.value) }))} />
					</label>
				</div>
				<div className="mt-3 space-y-2">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Asset classes</p>
					<div className="flex flex-wrap gap-2">
						{ASSET_CLASSES.map((asset) => {
							const active = selectedAssets.includes(asset);
							return (
								<button
									key={asset}
									type="button"
									onClick={() =>
										setSelectedAssets((prev) =>
											prev.includes(asset)
												? prev.filter((item) => item !== asset)
												: [...prev, asset]
										)
									}
									className="rounded-full px-3 py-1 text-xs font-semibold transition-all"
									style={{
										border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
										background: active ? "color-mix(in srgb, var(--accent) 16%, transparent 84%)" : "transparent",
										color: active ? "var(--text)" : "var(--text-muted)",
									}}
								>
									{asset.replace(/_/g, " ")}
								</button>
							);
						})}
					</div>
				</div>
				<div className="mt-3 flex justify-between gap-3">
					<div className="text-sm" style={{ color: "var(--text-muted)" }}>
						{family ? (
							<span>
								Household income ₹{family.total_income.toLocaleString()} • Expenses ₹{family.total_expense.toLocaleString()} • Savings rate {family.savings_rate.toFixed(2)}%
							</span>
						) : null}
					</div>
					<button type="button" className="button-primary" onClick={runOptimization} disabled={loading}>
						{loading ? "Optimizing..." : "Run Optimizer"}
					</button>
				</div>
			</article>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Expected Return</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent)" }}>
						{result ? `${result.expected_return.toFixed(2)}%` : "-"}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Portfolio Risk</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--text)" }}>
						{result ? `${result.portfolio_risk.toFixed(2)}%` : "-"}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Sharpe Ratio</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent-2)" }}>
						{result ? result.sharpe_ratio.toFixed(2) : "-"}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Investable Monthly</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--text)" }}>
						₹{Math.max(inputs.monthly_income - inputs.monthly_expense, 0).toLocaleString()}
					</p>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel h-96">
					<h3 className="section-title">Portfolio Allocation</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<PieChart>
								<Pie data={allocationEntries} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
									{allocationEntries.map((entry, index) => (
										<Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
									))}
								</Pie>
								<Tooltip formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name.replace(/_/g, " ")]} />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</article>

				<article className="panel h-96">
					<h3 className="section-title">Efficient Frontier</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<ScatterChart>
								<CartesianGrid stroke={GRID_COLOR} />
								<XAxis type="number" dataKey="risk" name="Risk" unit="%" stroke={AXIS_COLOR} />
								<YAxis type="number" dataKey="expected_return" name="Return" unit="%" stroke={AXIS_COLOR} />
								<ZAxis type="number" range={[60, 180]} dataKey="risk" />
								<Tooltip formatter={(value: number, name: string) => [`${Number(value).toFixed(2)}%`, name.replace("_", " ")]} />
								<Scatter name="Strategies" data={efficientFrontier} fill="#0fa3b1" />
							</ScatterChart>
						</ResponsiveContainer>
					</div>
				</article>
			</div>

			<article className="panel h-96">
				<h3 className="section-title">Investment Growth Forecast</h3>
				<div className="mt-3 h-80">
					<ResponsiveContainer>
						<LineChart data={growthForecast}>
							<CartesianGrid stroke={GRID_COLOR} vertical={false} />
							<XAxis dataKey="year" stroke={AXIS_COLOR} />
							<YAxis stroke={AXIS_COLOR} />
							<Tooltip formatter={(value: number) => [`₹${Math.round(value).toLocaleString()}`, "Value"]} />
							<Line type="monotone" dataKey="value" stroke="#6fa86b" strokeWidth={3} dot={{ r: 3 }} />
						</LineChart>
					</ResponsiveContainer>
				</div>
			</article>

			<article className="panel">
				<h3 className="section-title">Wealth Advisor AI Insights</h3>
				<div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
					{result?.explanation.map((tip, idx) => (
						<div key={idx} className="kpi-card">
							<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Insight</p>
							<p className="mt-2 text-sm" style={{ color: "var(--text)" }}>
								{tip}
							</p>
						</div>
					))}
				</div>
				{portfolio ? (
					<p className="muted mt-3 text-sm">Current tracked net worth ₹{portfolio.summary.net_worth.toLocaleString()} — allocations consider existing asset mix.</p>
				) : null}
			</article>
		</section>
	);
}
