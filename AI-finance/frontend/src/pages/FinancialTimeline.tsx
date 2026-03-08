import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";

import {
	forecastEducation,
	forecastGoal,
	forecastHouse,
	forecastRetirement,
	forecastEmergency,
	forecastVehicle,
	fetchFamilySummary,
	fetchPortfolio,
} from "../services/api";
import type { ForecastResponse, FamilySummary, PortfolioResponse } from "../types";

const GRID_COLOR = "rgba(143, 164, 199, 0.25)";
const AXIS_COLOR = "#8fa4c7";

const defaultInputs = {
	current_age: 32,
	retirement_age: 60,
	monthly_income: 95000,
	monthly_expense: 62000,
	current_savings: 450000,
	investment_return_rate: 0.08,
	inflation_rate: 0.04,
	goal_amount: 15000000,
	goal_target_year: 15,
};

export function FinancialTimeline() {
	const [inputs, setInputs] = useState(defaultInputs);
	const [retirement, setRetirement] = useState<ForecastResponse | null>(null);
	const [house, setHouse] = useState<ForecastResponse | null>(null);
	const [education, setEducation] = useState<ForecastResponse | null>(null);
	const [emergency, setEmergency] = useState<ForecastResponse | null>(null);
	const [vehicle, setVehicle] = useState<ForecastResponse | null>(null);
	const [goal, setGoal] = useState<ForecastResponse | null>(null);
	const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
	const [family, setFamily] = useState<FamilySummary | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function bootstrap() {
			try {
				const [portfolioRes, familyRes] = await Promise.allSettled([fetchPortfolio(), fetchFamilySummary()]);
				if (portfolioRes.status === "fulfilled") setPortfolio(portfolioRes.value);
				if (familyRes.status === "fulfilled") setFamily(familyRes.value);
			} catch (err) {
				console.error(err);
			}
		}
		bootstrap();
	}, []);

	async function runForecasts() {
		setLoading(true);
		setError(null);
		try {
			const payload = { ...inputs } as Record<string, number>;
			const [ret, houseRes, edu, emerg, veh, general] = await Promise.all([
				forecastRetirement(payload),
				forecastHouse(payload),
				forecastEducation(payload),
				forecastEmergency(payload),
				forecastVehicle(payload),
				forecastGoal(payload),
			]);
			setRetirement(ret);
			setHouse(houseRes);
			setEducation(edu);
			setEmergency(emerg);
			setVehicle(veh);
			setGoal(general);
		} catch (err) {
			console.error(err);
			setError("Unable to generate forecasts. Check backend API.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		runForecasts();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const timelineSeries = useMemo(() => {
		const startAge = inputs.current_age;
		const endAge = inputs.retirement_age;
		const points = [] as Array<{ age: number; wealth: number }>;
		const totalYears = Math.max(endAge - startAge, 1);
		const projected = retirement?.projected_wealth ?? 0;
		for (let i = 0; i <= totalYears; i++) {
			const age = startAge + i;
			const wealth = inputs.current_savings + ((projected - inputs.current_savings) * i) / totalYears;
			points.push({ age, wealth });
		}
		return points;
	}, [inputs.current_age, inputs.current_savings, inputs.retirement_age, retirement?.projected_wealth]);

	const savingsGrowth = useMemo(() => {
		const years = Math.max(inputs.goal_target_year, 1);
		return new Array(years + 1).fill(null).map((_, idx) => {
			const year = idx;
			const factor = Math.pow(1 + inputs.investment_return_rate, year);
			return { year: `Y${year}`, savings: Math.round(inputs.current_savings * factor + inputs.monthly_income * 12 * 0.2 * idx) };
		});
	}, [inputs]);

	const contributionData = useMemo(() => {
		const investable = Math.max(inputs.monthly_income - inputs.monthly_expense, 0);
		return [
			{ name: "Investable", value: investable },
			{ name: "Expenses", value: inputs.monthly_expense },
			{ name: "Savings", value: inputs.current_savings / 12 },
		];
	}, [inputs.current_savings, inputs.monthly_expense, inputs.monthly_income]);

	const probability = goal?.goal_probability ?? 0;
	const radialData = [
		{ name: "prob", value: Math.min(Math.max(probability * 100, 0), 100), fill: probability >= 0.8 ? "#6fa86b" : probability >= 0.6 ? "#0fa3b1" : "#f1b24a" },
	];

	return (
		<section className="space-y-5">
			<header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
						Financial Timeline & Goal Forecasting
					</h2>
					<p className="muted">Simulate your life plan across retirement, home, education, and safety goals.</p>
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
					<button type="button" className="button-primary" onClick={runForecasts} disabled={loading}>
						{loading ? "Simulating..." : "Run Forecasts"}
					</button>
				</div>
			</article>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Projected Wealth</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent)" }}>
						₹{(goal?.projected_wealth ?? 0).toLocaleString()}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Monthly Investment Required</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--text)" }}>
						₹{(goal?.monthly_investment_required ?? 0).toLocaleString()}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Goal Probability</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent-2)" }}>
						{((goal?.goal_probability ?? 0) * 100).toFixed(1)}%
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Financial Gap</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--text)" }}>
						₹{(goal?.financial_gap ?? 0).toLocaleString()}
					</p>
				</article>
			</div>

			<article className="panel">
				<h3 className="section-title">Goal Cards</h3>
				<div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{[
						{ title: "Retirement", data: retirement },
						{ title: "House Purchase", data: house },
						{ title: "Child Education", data: education },
						{ title: "Emergency Fund", data: emergency },
						{ title: "Vehicle Purchase", data: vehicle },
						{ title: "Custom Goal", data: goal },
					]
						.filter((item) => item.data)
						.map((item) => {
							const gap = item.data?.financial_gap ?? 0;
							const probabilityPct = ((item.data?.goal_probability ?? 0) * 100).toFixed(1);
							const gapTip = gap > 0 ? `Behind by ${(gap / Math.max(inputs.goal_amount, 1) * 100).toFixed(1)}%` : "On track";
							return (
								<div key={item.title} className="kpi-card">
									<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{item.title}</p>
									<p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{gapTip}</p>
									<p className="mt-2 font-heading text-2xl" style={{ color: "var(--accent)" }}>
										{probabilityPct}%
									</p>
									<p className="text-xs" style={{ color: "var(--text-muted)" }}>
										Monthly need ₹{(item.data?.monthly_investment_required ?? 0).toLocaleString()}
									</p>
									<p className="text-xs" style={{ color: "var(--text-muted)" }}>
										Gap ₹{gap.toLocaleString()}
									</p>
								</div>
							);
						})}
				</div>
			</article>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel h-96">
					<h3 className="section-title">Financial Timeline</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<LineChart data={timelineSeries}>
								<CartesianGrid stroke={GRID_COLOR} vertical={false} />
								<XAxis dataKey="age" stroke={AXIS_COLOR} />
								<YAxis stroke={AXIS_COLOR} />
								<Tooltip formatter={(value: number) => [`₹${Math.round(value).toLocaleString()}`, "Wealth"]} />
								<Line type="monotone" dataKey="wealth" stroke="#0fa3b1" strokeWidth={3} dot={{ r: 3 }} />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</article>

				<article className="panel h-96">
					<h3 className="section-title">Goal Probability</h3>
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
								<Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, "Probability"]} />
							</RadialBarChart>
						</ResponsiveContainer>
					</div>
					<p className="-mt-8 text-center font-heading text-3xl" style={{ color: "var(--text)" }}>
						{(probability * 100).toFixed(1)}%
					</p>
					<p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
						Goal completion likelihood
					</p>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel h-96">
					<h3 className="section-title">Savings Growth Forecast</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<AreaChart data={savingsGrowth}>
								<CartesianGrid stroke={GRID_COLOR} vertical={false} />
								<XAxis dataKey="year" stroke={AXIS_COLOR} />
								<YAxis stroke={AXIS_COLOR} />
								<Tooltip formatter={(value: number) => [`₹${Math.round(value).toLocaleString()}`, "Savings"]} />
								<Area type="monotone" dataKey="savings" stroke="#6fa86b" fill="#6fa86b" fillOpacity={0.25} />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</article>

				<article className="panel h-96">
					<h3 className="section-title">Investment Contribution</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<BarChart data={contributionData}>
								<CartesianGrid stroke={GRID_COLOR} vertical={false} />
								<XAxis dataKey="name" stroke={AXIS_COLOR} />
								<YAxis stroke={AXIS_COLOR} />
								<Tooltip formatter={(value: number) => [`₹${Math.round(value).toLocaleString()}`, "Amount"]} />
								<Legend />
								<Bar dataKey="value" fill="#0fa3b1" radius={[8, 8, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
					{family ? (
						<p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
							Household income ₹{family.total_income.toLocaleString()} • Expenses ₹{family.total_expense.toLocaleString()} • Savings rate {family.savings_rate.toFixed(2)}%
						</p>
					) : null}
					{portfolio ? (
						<p className="text-xs" style={{ color: "var(--text-muted)" }}>
							Net worth ₹{portfolio.summary.net_worth.toLocaleString()} • Assets tracked {portfolio.assets.length}
						</p>
					) : null}
				</article>
			</div>

			{goal?.shap_contributions ? (
				<article className="panel">
					<h3 className="section-title">What Drives Your Goal</h3>
					<div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
						{Object.entries(goal.shap_contributions)
							.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
							.slice(0, 6)
							.map(([factor, value]) => (
								<div key={factor} className="kpi-card">
									<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
										{factor.replace(/_/g, " ")}
									</p>
									<p className="mt-2 text-base font-semibold" style={{ color: "var(--text)" }}>
										{value >= 0 ? "+" : ""}{(value * 100).toFixed(2)}%
									</p>
								</div>
							))}
					</div>
					{goal.financial_gap > 0 ? (
						<p className="muted mt-2 text-sm">Tip: Increasing monthly investment by ₹{Math.round(goal.financial_gap / Math.max(inputs.goal_target_year, 1)).toLocaleString()} could close the gap faster.</p>
					) : null}
				</article>
			) : null}
		</section>
	);
}
