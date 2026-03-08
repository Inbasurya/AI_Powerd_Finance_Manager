import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

import { FormattedNumberInput } from "../components/FormattedNumberInput";
import { PlannerTimeline } from "../components/PlannerTimeline";
import { affordabilitySimulation, simulatePlanner } from "../services/api";
import type { AffordabilityResponse, PlannerSimulationResponse } from "../types";

type PlannerForm = {
	monthly_income: number;
	monthly_expenses: number;
	current_savings: number;
	future_cost: number;
	months_until_purchase: number;
};

const initialForm: PlannerForm = {
	monthly_income: 90000,
	monthly_expenses: 63000,
	current_savings: 240000,
	future_cost: 520000,
	months_until_purchase: 10,
};

export function SmartPlanner() {
	const [form, setForm] = useState<PlannerForm>(initialForm);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState<AffordabilityResponse | null>(null);
	const [plannerSim, setPlannerSim] = useState<PlannerSimulationResponse | null>(null);

	const onChange = (key: keyof PlannerForm) => (event: ChangeEvent<HTMLInputElement>) => {
		const value = Number(event.target.value);
		setForm((previous) => ({ ...previous, [key]: Number.isFinite(value) ? value : 0 }));
	};

	const timelineSteps = useMemo(() => {
		const monthlyCapacity = Math.max(0, form.monthly_income - form.monthly_expenses);
		if (plannerSim?.timeline?.length) {
			return plannerSim.timeline.map((t) => ({
				month: `Month ${t.month}`,
				label: t.month === 0 ? "Current reserve" : "Projected savings",
				amount: t.savings,
			}));
		}
		return [
			{ month: "Now", label: "Current reserve", amount: form.current_savings },
			{
				month: "Month 1",
				label: "Recommended monthly transfer",
				amount: result?.required_monthly_savings ?? monthlyCapacity,
			},
			{
				month: `Month ${form.months_until_purchase}`,
				label: "Projected savings",
				amount: result?.projected_savings ?? form.current_savings + monthlyCapacity * form.months_until_purchase,
			},
		];
	}, [form, result, plannerSim]);

	const projectionData = useMemo(() => {
		if (plannerSim?.timeline?.length) {
			return plannerSim.timeline.map((point) => ({ month: `Month ${point.month}`, savings: point.savings }));
		}
		const monthlyCapacity = Math.max(0, form.monthly_income - form.monthly_expenses);
		return Array.from({ length: Math.max(form.months_until_purchase, 2) }, (_, idx) => {
			const month = idx + 1;
			const savings = form.current_savings + monthlyCapacity * month;
			return { month: `Month ${month}`, savings };
		});
	}, [plannerSim, form]);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setLoading(true);
		setError("");
		try {
			const response = await affordabilitySimulation(form);
			setResult(response);
			const planner = await simulatePlanner(form);
			setPlannerSim(planner);
		} catch (submissionError) {
			console.error(submissionError);
			setError("Unable to run affordability simulation. Verify backend availability.");
				setPlannerSim({
					recommended_monthly_saving: Math.max(0, form.monthly_income - form.monthly_expenses) * 0.4,
					projected_savings: form.current_savings + Math.max(0, form.monthly_income - form.monthly_expenses) * form.months_until_purchase,
					goal_probability: 0.72,
					timeline: [
						{ month: 0, savings: form.current_savings },
						{ month: 1, savings: form.current_savings + 0.4 * Math.max(0, form.monthly_income - form.monthly_expenses) },
						{ month: form.months_until_purchase, savings: form.current_savings + Math.max(0, form.monthly_income - form.monthly_expenses) * form.months_until_purchase },
					],
				});
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="space-y-5">
			<header>
				<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
					Smart Planner
				</h2>
				<p className="muted">Run event budgeting simulations and build a realistic contribution schedule.</p>
				{loading ? (
					<p className="text-xs" style={{ color: "var(--text-muted)" }}>
						Loading live AI financial twin...
					</p>
				) : null}
			</header>

			<form className="panel grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
				<FormattedNumberInput label="Monthly Income" prefix="₹" value={form.monthly_income} onValueChange={(value) => setForm((prev) => ({ ...prev, monthly_income: value }))} />
				<FormattedNumberInput label="Monthly Expenses" prefix="₹" value={form.monthly_expenses} onValueChange={(value) => setForm((prev) => ({ ...prev, monthly_expenses: value }))} />
				<FormattedNumberInput label="Current Savings" prefix="₹" value={form.current_savings} onValueChange={(value) => setForm((prev) => ({ ...prev, current_savings: value }))} />
				<FormattedNumberInput label="Future Cost" prefix="₹" value={form.future_cost} onValueChange={(value) => setForm((prev) => ({ ...prev, future_cost: value }))} />
				<FormattedNumberInput label="Months Until Purchase" value={form.months_until_purchase} onValueChange={(value) => setForm((prev) => ({ ...prev, months_until_purchase: value }))} helperText="Projection window" />
				<div className="md:col-span-3 flex items-center gap-3">
					<button className="button-primary" type="submit" disabled={loading}>
						{loading ? "Planning..." : "Run Simulation"}
					</button>
					{error ? <p className="text-sm" style={{ color: "var(--accent-2)" }}>{error}</p> : null}
				</div>
			</form>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel h-80">
					<h3 className="section-title">Savings Projection Chart</h3>
					<div className="mt-3 h-64">
						<ResponsiveContainer>
							<LineChart data={projectionData}>
								<CartesianGrid stroke="rgba(143, 164, 199, 0.25)" vertical={false} />
								<XAxis dataKey="month" stroke="#8fa4c7" />
								<YAxis stroke="#8fa4c7" />
								<Tooltip formatter={(value: number) => [`₹${Math.round(value).toLocaleString()}`, "Savings"]} />
								<Line type="monotone" dataKey="savings" stroke="#0fa3b1" strokeWidth={3} dot={{ r: 3 }} />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</article>

				<PlannerTimeline steps={timelineSteps} />
			</div>

			<article className="panel space-y-3">
				<h3 className="section-title">Planner Output</h3>
				{result ? (
					<>
						<div className="grid gap-3 md:grid-cols-3">
							<div className="kpi-card">
								<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
									Purchase Feasibility
								</p>
								<p className="mt-2 font-heading text-3xl" style={{ color: result.can_afford ? "var(--success)" : "var(--accent-2)" }}>
									{result.can_afford ? "Affordable" : "Not Yet Affordable"}
								</p>
							</div>
							<div className="kpi-card">
								<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Monthly Required</p>
								<p className="mt-2 font-heading text-2xl" style={{ color: "var(--accent)" }}>
									₹{(result.required_monthly_savings ?? plannerSim?.recommended_monthly_saving ?? 0).toLocaleString()}
								</p>
							</div>
							<div className="kpi-card">
								<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Goal Probability</p>
								<p className="mt-2 font-heading text-2xl" style={{ color: "var(--accent)" }}>
									{((plannerSim?.goal_probability ?? 0.75) * 100).toFixed(0)}%
								</p>
								<p className="muted text-xs">Chance of reaching goal on schedule.</p>
							</div>
						</div>
						<div className="grid gap-3 md:grid-cols-2">
							<div className="kpi-card">
								<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Projected Savings</p>
								<p className="mt-2 font-heading text-2xl" style={{ color: "var(--text)" }}>
									₹{(result.projected_savings ?? plannerSim?.projected_savings ?? 0).toLocaleString()}
								</p>
							</div>
							<div className="kpi-card">
								<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Remaining Gap</p>
								<p className="mt-2 font-heading text-2xl" style={{ color: "var(--accent-2)" }}>
									₹{Math.max((result.shortfall ?? 0), 0).toLocaleString()}
								</p>
							</div>
						</div>
						<p className="muted">{result.recommendation}</p>
					</>
				) : (
					<p className="muted">Submit your numbers to generate a savings plan and affordability advice.</p>
				)}
			</article>
		</section>
	);
}
