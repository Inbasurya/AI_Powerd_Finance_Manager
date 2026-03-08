import { useMemo, useState } from "react";

import { CategoryChart } from "../components/Charts";
import type { Transaction } from "../types";

const transactionsSeed: Transaction[] = [
	{ id: "1", date: "2026-03-01", description: "Metro card", category: "Travel", amount: 75, account_balance: 5120, merchant_risk: 0.1 },
	{ id: "2", date: "2026-03-02", description: "Clinic", category: "Healthcare", amount: 220, account_balance: 4900, merchant_risk: 0.2 },
	{ id: "3", date: "2026-03-03", description: "Electricity", category: "Bills", amount: 180, account_balance: 4700, merchant_risk: 0.1 },
	{ id: "4", date: "2026-03-04", description: "E-commerce", category: "Shopping", amount: 640, account_balance: 4010, merchant_risk: 0.8 },
	{ id: "5", date: "2026-03-05", description: "ETF top-up", category: "Investment", amount: 400, account_balance: 3610, merchant_risk: 0.05 },
	{ id: "6", date: "2026-03-06", description: "Cafe", category: "Food", amount: 45, account_balance: 3560, merchant_risk: 0.1 },
];

export function Transactions() {
	const [query, setQuery] = useState("");
	const filtered = transactionsSeed.filter((tx) =>
		`${tx.description} ${tx.category}`.toLowerCase().includes(query.toLowerCase())
	);

	const categoryData = useMemo(() => {
		const map = new Map<string, number>();
		filtered.forEach((tx) => map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount));
		return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
	}, [filtered]);

	return (
		<section className="space-y-5">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
						Transactions
					</h2>
					<p className="muted">Track and audit every spend event.</p>
				</div>
				<input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search description/category"
					className="field-input w-72"
				/>
			</header>

			<div className="grid gap-4 lg:grid-cols-2">
				<div className="panel overflow-x-auto">
					<h3 className="section-title">Transaction List</h3>
					<table className="mt-3 min-w-full text-left text-sm">
						<thead style={{ color: "var(--text-muted)" }}>
							<tr>
								<th className="py-2">Date</th>
								<th className="py-2">Description</th>
								<th className="py-2">Category</th>
								<th className="py-2 text-right">Amount</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((tx) => (
								<tr key={tx.id} className="border-t" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
									<td className="py-2">{tx.date}</td>
									<td className="py-2">{tx.description}</td>
									<td className="py-2">{tx.category}</td>
									<td className="py-2 text-right">${tx.amount.toFixed(2)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<CategoryChart data={categoryData} />
			</div>
		</section>
	);
}
