import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";

import { compareSimulation, fetchFamilySummary, fetchPortfolio, runSimulation } from "../services/api";
import type { FamilySummary, PortfolioResponse, SimulationResponse } from "../types";

const GRID_COLOR = "rgba(143, 164, 199, 0.25)";
const AXIS_COLOR = "#8fa4c7";
const PIE_COLORS = ["#0fa3b1", "#6fa86b", "#f1b24a", "#8fa4c7", "#f97316", "#f43f5e", "#c084fc"];

const defaultInputs = {
	current_income: 95000,
	monthly_expense: 62000,
	current_savings: 450000,
	investment: 250000,
	assets: 600000,
	liabilities: 150000,
	inflation_rate: 0.04,
	salary_growth_rate: 0.06,
	simulation_years: 20,
};

export function FinancialSimulation() {
	const [inputs, setInputs] = useState(defaultInputs);
	const [result, setResult] = useState<SimulationResponse | null>(null);
	const [scenarios, setScenarios] = useState<Array<{ scenario: string; net_worth: number }>>([]);
	const [family, setFamily] = useState<FamilySummary | null>(null);
	const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function bootstrap() {
			try {
				const [fam, pf] = await Promise.allSettled([fetchFamilySummary(), fetchPortfolio()]);
				if (fam.status === "fulfilled") setFamily(fam.value);
				if (pf.status === "fulfilled") setPortfolio(pf.value);
			} catch (err) {
				console.error(err);
			}
		}
		bootstrap();
	}, []);

	async function runAll() {
		setLoading(true);
		setError(null);
		try {
			const [sim, comp] = await Promise.all([runSimulation(inputs), compareSimulation(inputs)]);
			setResult(sim as SimulationResponse);
			setScenarios(comp as Array<{ scenario: string; net_worth: number }>);
		} catch (err) {
			console.error(err);
			setError("Unable to run simulation. Check API status.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		runAll();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const trajectoryData = useMemo(() => {
		return (result?.wealth_trajectory ?? []).map((value, idx) => ({ year: idx + 1, value }));
	}, [result?.wealth_trajectory]);

	const radialValue = Math.min(Math.max((result?.retirement_success_probability ?? 0) * 100, 0), 100);
	const radialData = [{ name: "prob", value: radialValue, fill: radialValue >= 75 ? "#6fa86b" : radialValue >= 55 ? "#0fa3b1" : "#f1b24a" }];

	return (
		<section className="space-y-5">
			<header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
						Financial Simulation
					</h2>
					<p className="muted">Monte Carlo (500 iters) to stress-test savings, spending, and investments with AI insights.</p>
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
				<div className="mt-3 flex justify-between gap-3">
					<div className="text-sm" style={{ color: "var(--text-muted)" }}>
						{family ? (
							<span>Household income ₹{family.total_income.toLocaleString()} • Expenses ₹{family.total_expense.toLocaleString()} • Savings rate {family.savings_rate.toFixed(2)}%</span>
						) : null}
						{portfolio ? (
							<span className="block">Net worth ₹{portfolio.summary.net_worth.toLocaleString()} (used for context)</span>
						) : null}
					</div>
					<button type="button" className="button-primary" onClick={runAll} disabled={loading}>
						{loading ? "Simulating..." : "Run Simulation"}
					</button>
				</div>
			</article>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Projected Net Worth</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent)" }}>
						₹{(result?.projected_net_worth ?? 0).toLocaleString()}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Retirement Success Probability</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent-2)" }}>
						{((result?.retirement_success_probability ?? 0) * 100).toFixed(1)}%
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Years to FI</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--text)" }}>
						{result?.years_to_financial_independence ?? "-"}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Inflation vs Salary</p>
					<p className="mt-2 font-heading text-2xl" style={{ color: "var(--text)" }}>
						{(inputs.salary_growth_rate * 100).toFixed(1)}% vs {(inputs.inflation_rate * 100).toFixed(1)}%
					</p>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel h-96">
					<h3 className="section-title">Net Worth Projection</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<AreaChart data={trajectoryData}>
								<CartesianGrid stroke={GRID_COLOR} vertical={false} />
								<XAxis dataKey="year" stroke={AXIS_COLOR} />
								<YAxis stroke={AXIS_COLOR} />
								<Tooltip formatter={(value: number) => [`₹${Math.round(value).toLocaleString()}`, "Net Worth"]} />
								<Area type="monotone" dataKey="value" stroke="#0fa3b1" fill="#0fa3b1" fillOpacity={0.2} />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</article>

				<article className="panel h-96">
					<h3 className="section-title">Risk Probability</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<RadialBarChart
								cx="50%"
								cy="55%"
								innerRadius="35%"
								outerRadius="80%"
								barSize={22}
								startAngle={180}
								endAngle={0}
								data={radialData}
							>
								<RadialBar background dataKey="value" cornerRadius={12} />
								<Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, "Probability"]} />
							</RadialBarChart>
						</ResponsiveContainer>
					</div>
					<p className="-mt-8 text-center font-heading text-3xl" style={{ color: "var(--text)" }}>
						{radialValue.toFixed(1)}%
					</p>
					<p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
						Probability of reaching FI (4% rule)
					</p>
				</article>
			</div>

			<article className="panel h-96">
				<h3 className="section-title">Scenario Comparison</h3>
				<div className="mt-3 h-80">
					<ResponsiveContainer>
						<BarChart data={scenarios}>
							<CartesianGrid stroke={GRID_COLOR} vertical={false} />
							<XAxis dataKey="scenario" stroke={AXIS_COLOR} tickFormatter={(v) => v.replace(/_/g, " ")} />
							<YAxis stroke={AXIS_COLOR} />
							<Tooltip formatter={(value: number) => [`₹${Math.round(value).toLocaleString()}`, "Net Worth"]} />
							<Legend />
							<Bar dataKey="net_worth" fill="#6fa86b" radius={[8, 8, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</article>

			<article className="panel">
				<h3 className="section-title">AI Insights</h3>
				<div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
					<div className="kpi-card">
						<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Savings Boost</p>
						<p className="mt-2 text-sm" style={{ color: "var(--text)" }}>
							If you increase savings by ₹5000/month, retirement success probability could reach 92%.
						</p>
					</div>
					<div className="kpi-card">
						<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Equity Tilt</p>
						<p className="mt-2 text-sm" style={{ color: "var(--text)" }}>
							Investing 10% more in equities may improve long-term wealth by ~18% under current assumptions.
						</p>
					</div>
					<div className="kpi-card">
						<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Spending Discipline</p>
						<p className="mt-2 text-sm" style={{ color: "var(--text)" }}>
							Reducing discretionary spend by 10% strengthens cash flow and stabilizes FI trajectory.
						</p>
					</div>
				</div>
			</article>
		</section>
	);
}
