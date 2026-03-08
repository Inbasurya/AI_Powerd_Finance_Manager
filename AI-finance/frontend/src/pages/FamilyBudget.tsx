import { FormEvent, useEffect, useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar, XAxis, YAxis, RadialBarChart, RadialBar } from "recharts";

import { addFamilyMember, fetchFamilyMembers } from "../services/api";
import type { FamilyMember, FamilyResponse } from "../types";

const ROLE_PRESETS = ["Father", "Mother", "Son", "Daughter", "Guardian", "Grandparent", "Sibling"];
const PIE_COLORS = ["#0fa3b1", "#f26a4b", "#6fa86b", "#8be0e8", "#f1b24a", "#8da3ff", "#c77dff", "#f78fb3"];
const AXIS_COLOR = "#8fa4c7";
const GRID_COLOR = "rgba(143, 164, 199, 0.25)";

const demoMembers: FamilyMember[] = [
	{ id: -1, name: "Father", role: "Father", monthly_income: 80000, monthly_expense: 45000, savings: 35000, contribution: 40 },
	{ id: -2, name: "Mother", role: "Mother", monthly_income: 60000, monthly_expense: 30000, savings: 30000, contribution: 30 },
	{ id: -3, name: "Son", role: "Son", monthly_income: 40000, monthly_expense: 25000, savings: 15000, contribution: 15 },
	{ id: -4, name: "Daughter", role: "Daughter", monthly_income: 35000, monthly_expense: 20000, savings: 15000, contribution: 10 },
	{ id: -5, name: "Grandmother", role: "Grandmother", monthly_income: 20000, monthly_expense: 10000, savings: 10000, contribution: 5 },
];

function computeSummary(members: FamilyMember[]): FamilyResponse {
	const total_income = members.reduce((sum, m) => sum + (m.monthly_income || 0), 0);
	const total_expense = members.reduce((sum, m) => sum + (m.monthly_expense || 0), 0);
	const total_savings = members.reduce((sum, m) => sum + (m.savings || 0), 0);
	const savings_rate = total_income > 0 ? ((total_income - total_expense) / total_income) * 100 : 0;
	const highest_contributor = members.length
		? members
			.slice()
			.sort((a, b) => (b.contribution || 0) - (a.contribution || 0))
			.slice(0, 1)
			.map((m) => ({ name: m.name, role: m.role, contribution: m.contribution || 0 }))[0]
		: null;

	return {
		members,
		summary: {
			total_income,
			total_expense,
			total_savings,
			savings_rate,
			highest_contributor,
			member_count: members.length,
			income_breakdown: members.map((m) => ({ name: m.name, role: m.role, income: m.monthly_income || 0 })),
			expense_breakdown: members.map((m) => ({ name: m.name, role: m.role, expense: m.monthly_expense || 0 })),
		},
	};
}

const emptyResponse: FamilyResponse = computeSummary([]);

export function FamilyBudget() {
	const [family, setFamily] = useState<FamilyResponse>(emptyResponse);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState({
		name: "",
		role: ROLE_PRESETS[0],
		monthly_income: "0",
		monthly_expense: "0",
		savings: "0",
		contribution: "0",
	});

	useEffect(() => {
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const data = await fetchFamilyMembers();
				if (data.members.length === 0) {
					setFamily(computeSummary(demoMembers));
				} else {
					setFamily(data);
				}
			} catch (err) {
				console.error(err);
				setError("Unable to load family members.");
				setFamily(computeSummary(demoMembers));
			} finally {
				setLoading(false);
			}
		}

		load();
	}, []);

	const contributionData = useMemo(
		() =>
			family.members.map((member) => ({
				name: `${member.name} (${member.role})`,
				value: member.contribution || 0,
			})),
		[family.members]
	);

	const expenseData = useMemo(
		() =>
			family.members.map((member) => ({
				name: member.name,
				role: member.role,
				expense: member.monthly_expense || 0,
			})),
		[family.members]
	);

	const incomeData = useMemo(
		() =>
			family.summary.income_breakdown.map((item) => ({
				name: `${item.name} (${item.role})`,
				income: item.income || 0,
			})),
		[family.summary.income_breakdown]
	);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const payload = {
				name: form.name,
				role: form.role,
				monthly_income: Number(form.monthly_income) || 0,
				monthly_expense: Number(form.monthly_expense) || 0,
				savings: Number(form.savings) || 0,
				contribution: Number(form.contribution) || 0,
			};

			const data = await addFamilyMember(payload);
			setFamily(data);
			setForm((prev) => ({ ...prev, name: "", monthly_income: "0", monthly_expense: "0", savings: "0", contribution: "0" }));
		} catch (err) {
			console.error(err);
			setError("Could not add member. Please verify inputs.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<section className="space-y-6">
			<header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
						Family Budget Management
					</h2>
					<p className="muted">Track household income, expenses, and contributions.</p>
				</div>
				{error ? (
					<span className="text-sm" style={{ color: "var(--danger)" }}>
						{error}
					</span>
				) : null}
			</header>

			<div className="grid gap-4 md:grid-cols-4">
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Total Family Income
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent)" }}>
						₹{family.summary.total_income.toLocaleString()}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Total Family Expenses
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent-2)" }}>
						₹{family.summary.total_expense.toLocaleString()}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Household Savings Rate
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--text)" }}>
						{family.summary.savings_rate.toFixed(2)}%
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Top Contributor
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--text)" }}>
						{family.summary.highest_contributor ? family.summary.highest_contributor.name : "—"}
					</p>
					<p className="muted mt-1">
						{family.summary.highest_contributor
							? `${family.summary.highest_contributor.role} • ${family.summary.highest_contributor.contribution.toFixed(1)}%`
							: "Awaiting first contribution"}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Total Family Savings
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--success)" }}>
						₹{family.summary.total_savings.toLocaleString()}
					</p>
					<p className="muted mt-1">Tracks combined savings across all members.</p>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<article className="panel lg:col-span-1">
					<h3 className="section-title">Add Family Member</h3>
					<form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
						<label className="field">
							<span>Name</span>
							<input
								required
								type="text"
								value={form.name}
								onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
							/>
						</label>
						<label className="field">
							<span>Role</span>
							<select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
								{ROLE_PRESETS.map((role) => (
									<option key={role} value={role}>
										{role}
									</option>
								))}
							</select>
						</label>

						<label className="field">
							<span>Monthly Income</span>
							<input
								required
								type="number"
								min="0"
								value={form.monthly_income}
								onChange={(e) => setForm((prev) => ({ ...prev, monthly_income: e.target.value }))}
							/>
						</label>
						<label className="field">
							<span>Monthly Expense</span>
							<input
								required
								type="number"
								min="0"
								value={form.monthly_expense}
								onChange={(e) => setForm((prev) => ({ ...prev, monthly_expense: e.target.value }))}
							/>
						</label>

						<label className="field">
							<span>Savings</span>
							<input
								required
								type="number"
								min="0"
								value={form.savings}
								onChange={(e) => setForm((prev) => ({ ...prev, savings: e.target.value }))}
							/>
						</label>
						<label className="field">
							<span>Contribution (%)</span>
							<input
								required
								type="number"
								min="0"
								value={form.contribution}
								onChange={(e) => setForm((prev) => ({ ...prev, contribution: e.target.value }))}
							/>
						</label>

						<div className="col-span-1 flex justify-end md:col-span-2">
							<button type="submit" className="button-primary" disabled={loading}>
								{loading ? "Saving..." : "Add Member"}
							</button>
						</div>
					</form>
				</article>

				<article className="panel lg:col-span-2">
					<h3 className="section-title">Household Roster</h3>
					<div className="mt-4 overflow-x-auto">
						<table className="w-full text-sm">
							<thead style={{ color: "var(--text-muted)" }}>
								<tr>
									<th className="py-2 text-left">Name</th>
									<th className="text-left">Role</th>
									<th className="text-right">Income</th>
									<th className="text-right">Expense</th>
									<th className="text-right">Savings</th>
									<th className="text-right">Contribution</th>
								</tr>
							</thead>
							<tbody style={{ color: "var(--text)" }}>
								{family.members.length === 0 ? (
									<tr>
										<td className="py-3" colSpan={6} style={{ color: "var(--text-muted)" }}>
											No family members yet. Start by adding someone above.
										</td>
									</tr>
								) : (
									family.members.map((member) => (
										<tr key={member.id} className="border-t" style={{ borderColor: "var(--border)" }}>
											<td className="py-3 font-semibold">{member.name}</td>
											<td>{member.role}</td>
											<td className="text-right">₹{member.monthly_income.toLocaleString()}</td>
											<td className="text-right">₹{member.monthly_expense.toLocaleString()}</td>
											<td className="text-right">₹{member.savings.toLocaleString()}</td>
											<td className="text-right">{member.contribution.toFixed(1)}%</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<article className="panel h-96">
					<h3 className="section-title">Family Contribution</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<PieChart>
								<Pie data={contributionData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
									{contributionData.map((entry, idx) => (
										<Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
									))}
								</Pie>
								<Tooltip formatter={(value: number, _name, payload) => [`${value.toFixed(1)}%`, payload?.payload?.name]} />
								<Legend />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</article>

				<article className="panel h-96">
					<h3 className="section-title">Household Expense Breakdown</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<BarChart data={expenseData}>
								<CartesianGrid stroke={GRID_COLOR} vertical={false} />
								<XAxis dataKey="name" stroke={AXIS_COLOR} />
								<YAxis stroke={AXIS_COLOR} />
								<Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, "Expense"]} />
								<Legend />
								<Bar dataKey="expense" fill="#f26a4b" radius={[8, 8, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</article>

				<article className="panel h-96">
					<h3 className="section-title">Income Distribution & Savings Rate</h3>
					<div className="mt-3 grid gap-4 md:grid-cols-2 h-80">
						<div className="h-80">
							<ResponsiveContainer>
								<BarChart data={incomeData}>
									<CartesianGrid stroke={GRID_COLOR} vertical={false} />
									<XAxis dataKey="name" stroke={AXIS_COLOR} hide />
									<YAxis stroke={AXIS_COLOR} />
									<Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, "Income"]} />
									<Bar dataKey="income" fill="#0fa3b1" radius={[8, 8, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
						<div className="flex items-center justify-center">
							<ResponsiveContainer width="100%" height="100%">
								<RadialBarChart
									cx="50%"
									cy="60%"
									innerRadius="40%"
									outerRadius="85%"
									barSize={18}
									startAngle={180}
									endAngle={0}
									data={[{ name: "Savings Rate", value: Math.max(0, Math.min(100, family.summary.savings_rate)) }]}
								>
									<RadialBar background dataKey="value" cornerRadius={8} fill="#6fa86b" />
									<Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, "Savings Rate"]} />
								</RadialBarChart>
							</ResponsiveContainer>
						</div>
					</div>
					<p className="mt-2 text-center text-sm" style={{ color: "var(--text-muted)" }}>
						Savings rate gauges monthly surplus after expenses.
					</p>
				</article>
			</div>
		</section>
	);
}
