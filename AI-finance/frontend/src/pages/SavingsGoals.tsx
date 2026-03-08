import { useMemo } from "react";

import { SavingsChart } from "../components/Charts";
import { GoalCard } from "../components/GoalCard";

const goals = [
	{ title: "Emergency Fund", targetAmount: 120000, currentAmount: 84000, deadline: "Sep 2026" },
	{ title: "Europe Trip", targetAmount: 220000, currentAmount: 96000, deadline: "Dec 2026" },
	{ title: "Home Down Payment", targetAmount: 1500000, currentAmount: 420000, deadline: "Jun 2028" },
];

export function SavingsGoals() {
	const monthlyData = useMemo(
		() => [
			{ month: "Oct", savings: 18000 },
			{ month: "Nov", savings: 21000 },
			{ month: "Dec", savings: 19500 },
			{ month: "Jan", savings: 23500 },
			{ month: "Feb", savings: 24800 },
			{ month: "Mar", savings: 26100 },
		],
		[]
	);

	const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
	const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
	const portfolioProgress = Math.round((totalSaved / totalTarget) * 100);

	return (
		<section className="space-y-5">
			<header>
				<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
					Savings Goals
				</h2>
				<p className="muted">Plan milestones and keep every major purchase fully funded.</p>
			</header>

			<article className="panel">
				<div className="grid gap-4 md:grid-cols-3">
					<div className="kpi-card">
						<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
							Total Goal Value
						</p>
						<p className="mt-2 font-heading text-3xl" style={{ color: "var(--text)" }}>
							${totalTarget.toLocaleString()}
						</p>
					</div>
					<div className="kpi-card">
						<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
							Total Saved
						</p>
						<p className="mt-2 font-heading text-3xl" style={{ color: "var(--success)" }}>
							${totalSaved.toLocaleString()}
						</p>
					</div>
					<div className="kpi-card">
						<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
							Portfolio Progress
						</p>
						<p className="mt-2 font-heading text-3xl" style={{ color: "var(--accent)" }}>
							{portfolioProgress}%
						</p>
					</div>
				</div>
			</article>

			<div className="grid gap-4 lg:grid-cols-2">
				<div className="space-y-4">
					{goals.map((goal) => (
						<GoalCard key={goal.title} {...goal} />
					))}
				</div>
				<SavingsChart data={monthlyData} />
			</div>
		</section>
	);
}
