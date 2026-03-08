import { FormEvent, useEffect, useMemo, useState } from "react";
import {
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { addAsset, deleteAsset, fetchPortfolio } from "../services/api";
import type { PortfolioResponse } from "../types";

const ASSET_OPTIONS = [
	"Gold",
	"Stocks",
	"Mutual Funds",
	"ETF",
	"Crypto",
	"Real Estate",
	"Bonds",
	"Cash",
	"Business",
];

const PIE_COLORS = ["#0fa3b1", "#f26a4b", "#6fa86b", "#8be0e8", "#f1b24a", "#8da3ff", "#c77dff", "#f78fb3"];
const AXIS_COLOR = "#8fa4c7";
const GRID_COLOR = "rgba(143, 164, 199, 0.25)";

const emptyPortfolio: PortfolioResponse = {
	assets: [],
	summary: {
		total_assets_value: 0,
		total_liabilities: 0,
		net_worth: 0,
		distribution: [],
		net_worth_history: [],
		diversification_score: 0,
		projected_net_worth_next_year: 0,
		appreciation_projection: [],
	},
};

const fallbackAllocation = [
	{ asset_type: "Stocks", value: 320000, percentage: 32 },
	{ asset_type: "Mutual Funds", value: 210000, percentage: 21 },
	{ asset_type: "ETF", value: 140000, percentage: 14 },
	{ asset_type: "Gold", value: 110000, percentage: 11 },
	{ asset_type: "Bonds", value: 90000, percentage: 9 },
	{ asset_type: "Cash", value: 60000, percentage: 6 },
	{ asset_type: "Business", value: 50000, percentage: 5 },
];

const fallbackNetWorthHistory = [
	{ label: "Jan", net_worth: 1020000 },
	{ label: "Feb", net_worth: 1045000 },
	{ label: "Mar", net_worth: 1082000 },
	{ label: "Apr", net_worth: 1124000 },
	{ label: "May", net_worth: 1160000 },
	{ label: "Jun", net_worth: 1195000 },
];

const demoAssets = [
	{
		id: -1,
		name: "Gold Jewelry",
		asset_type: "Gold",
		purchase_value: 180000,
		current_value: 220000,
		purchase_date: "2024-02-12",
		location: "Bank locker",
		notes: "22k ornaments for family events",
	},
	{
		id: -2,
		name: "Equity Portfolio",
		asset_type: "Stocks",
		purchase_value: 300000,
		current_value: 350000,
		purchase_date: "2024-01-05",
		location: "Brokerage account",
		notes: "Mix of large-cap and growth equities",
	},
	{
		id: -3,
		name: "Mutual Funds",
		asset_type: "Mutual Fund",
		purchase_value: 150000,
		current_value: 180000,
		purchase_date: "2023-11-18",
		location: "AMC platform",
		notes: "Balanced and index funds",
	},
	{
		id: -4,
		name: "Bank Savings",
		asset_type: "Savings",
		purchase_value: 150000,
		current_value: 150000,
		purchase_date: "2024-04-01",
		location: "HDFC Savings",
		notes: "Emergency fund (4 months of expenses)",
	},
	{
		id: -5,
		name: "Crypto Wallet",
		asset_type: "Crypto",
		purchase_value: 35000,
		current_value: 40000,
		purchase_date: "2024-03-10",
		location: "Hardware wallet",
		notes: "BTC and ETH split",
	},
	{
		id: -6,
		name: "Cash",
		asset_type: "Cash",
		purchase_value: 40000,
		current_value: 40000,
		purchase_date: "2024-06-01",
		location: "On-hand",
		notes: "Float for bills and contingencies",
	},
];

export function WealthPortfolio() {
	const [portfolio, setPortfolio] = useState<PortfolioResponse>(emptyPortfolio);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState({
		name: "",
		asset_type: ASSET_OPTIONS[0],
		purchase_value: "0",
		current_value: "0",
		purchase_date: new Date().toISOString().slice(0, 10),
		location: "",
		notes: "",
	});

	useEffect(() => {
		async function loadPortfolio() {
			setLoading(true);
			setError(null);
			try {
				const data = await fetchPortfolio();
				if (data.assets.length === 0) {
					setPortfolio({ ...emptyPortfolio, assets: demoAssets, summary: { ...emptyPortfolio.summary } });
				} else {
					setPortfolio(data);
				}
			} catch (err) {
				console.error(err);
				setError("Unable to load portfolio. Please try again.");
				setPortfolio({ ...emptyPortfolio, assets: demoAssets, summary: { ...emptyPortfolio.summary } });
			} finally {
				setLoading(false);
			}
		}

		loadPortfolio();
	}, []);

	const assetList = useMemo(() => (portfolio.assets.length ? portfolio.assets : demoAssets), [portfolio.assets]);

	const allocationData = useMemo(() => {
		if (portfolio.summary.distribution.length) {
			return portfolio.summary.distribution.map((item) => ({ name: item.asset_type, value: item.value, percentage: item.percentage }));
		}
		const total = assetList.reduce((sum, asset) => sum + (asset.current_value || 0), 0) || 1;
		return assetList.map((asset) => ({ name: asset.asset_type, value: asset.current_value || 0, percentage: ((asset.current_value || 0) / total) * 100 }));
	}, [assetList, portfolio.summary.distribution]);

	const derivedTotals = useMemo(() => {
		const totalAssets = assetList.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
		const totalLiabilities = portfolio.summary.total_liabilities || 0;
		const netWorth = portfolio.summary.net_worth || totalAssets - totalLiabilities;
		return {
			netWorth,
			totalAssets: portfolio.summary.total_assets_value || totalAssets,
			totalLiabilities,
			distributionCount: allocationData.length,
		};
	}, [allocationData.length, assetList, portfolio.summary.net_worth, portfolio.summary.total_assets_value, portfolio.summary.total_liabilities]);

	const derivedScores = useMemo(() => {
		const diversification = portfolio.summary.diversification_score || Math.min(95, 60 + allocationData.length * 4);
		const projectedNetWorth =
			portfolio.summary.projected_net_worth_next_year || Math.round(derivedTotals.netWorth * 1.08);
		const assetClassesTracked = new Set(assetList.map((a) => a.asset_type)).size;
		return { diversification, projectedNetWorth, assetClassesTracked };
	}, [allocationData.length, assetList, derivedTotals.netWorth, portfolio.summary.diversification_score, portfolio.summary.projected_net_worth_next_year]);

	const netWorthSeries = useMemo(() => {
		if (portfolio.summary.net_worth_history.length) return portfolio.summary.net_worth_history;
		return fallbackNetWorthHistory;
	}, [portfolio.summary.net_worth_history]);

	const appreciationData = useMemo(() => {
		if (portfolio.summary.appreciation_projection.length) {
			return portfolio.summary.appreciation_projection.map((item) => ({
				name: item.asset_type,
				projected_value: item.projected_value,
				growth: item.assumed_growth_rate * 100,
			}));
		}
		return assetList.map((asset) => ({
			name: asset.asset_type,
			projected_value: Math.round((asset.current_value || 0) * 1.08),
			growth: 8,
		}));
	}, [assetList, portfolio.summary.appreciation_projection]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const payload = {
				...form,
				purchase_value: Number(form.purchase_value) || 0,
				current_value: Number(form.current_value) || 0,
			};
			const data = await addAsset(payload);
			setPortfolio(data);
			setForm((prev) => ({ ...prev, name: "", purchase_value: "0", current_value: "0", notes: "" }));
		} catch (err) {
			console.error(err);
			setError("Could not add asset. Please verify details.");
		} finally {
			setLoading(false);
		}
	}

	async function handleDelete(id: number) {
		setError(null);
		setLoading(true);
		try {
			const data = await deleteAsset(id);
			setPortfolio(data);
		} catch (err) {
			console.error(err);
			setError("Failed to delete asset. Please retry.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<section className="space-y-6">
			<header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
						Personal Wealth Portfolio
					</h2>
					<p className="muted">Track hard assets, investments, and liquidity in one place.</p>
				</div>
				<div className="flex flex-col gap-1 text-sm" style={{ color: "var(--text-muted)" }}>
					{loading ? <span>Loading live AI financial twin...</span> : null}
					{error ? (
						<span className="text-sm" style={{ color: "var(--danger)" }}>
							{error}
						</span>
					) : null}
				</div>
			</header>

			<div className="grid gap-4 md:grid-cols-4">
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Total Net Worth
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent)" }}>
						₹{derivedTotals.netWorth.toLocaleString()}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Total Assets Value
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--text)" }}>
						₹{derivedTotals.totalAssets.toLocaleString()}
					</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Total Liabilities
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent-2)" }}>
						₹{derivedTotals.totalLiabilities.toLocaleString()}
					</p>
					<p className="muted mt-2">Liabilities tracking reserved for upcoming release.</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Asset Classes Tracked
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--text)" }}>
						{derivedScores.assetClassesTracked}
					</p>
					<p className="muted mt-2">Diversify across {ASSET_OPTIONS.length} categories.</p>
				</article>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Diversification Score
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--text)" }}>
						{derivedScores.diversification.toFixed(1)} / 100
					</p>
					<p className="muted mt-2">Higher is better; evenly spread allocations score near 100.</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Projected Net Worth (12m)
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--accent-2)" }}>
						₹{derivedScores.projectedNetWorth.toLocaleString()}
					</p>
					<p className="muted mt-2">Uses asset-class growth assumptions to forecast next year.</p>
				</article>
				<article className="kpi-card">
					<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
						Asset Class Universe
					</p>
					<p className="mt-2 font-heading text-4xl" style={{ color: "var(--text)" }}>
						{ASSET_OPTIONS.length}
					</p>
					<p className="muted mt-2">Real estate, metals, financial assets, savings, and other holdings.</p>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<article className="panel lg:col-span-1">
					<h3 className="section-title">Add Asset</h3>
					<form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
						<div className="grid gap-2 md:grid-cols-2 md:gap-3">
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
								<span>Type</span>
								<select
									value={form.asset_type}
									onChange={(e) => setForm((prev) => ({ ...prev, asset_type: e.target.value }))}
								>
									{ASSET_OPTIONS.map((option) => (
										<option key={option} value={option}>
											{option}
										</option>
									))}
								</select>
							</label>
						</div>

						<div className="grid gap-2 md:grid-cols-2 md:gap-3">
							<label className="field">
								<span>Purchase Value</span>
								<input
									required
									type="number"
									min="0"
									value={form.purchase_value}
									onChange={(e) => setForm((prev) => ({ ...prev, purchase_value: e.target.value }))}
								/>
							</label>
							<label className="field">
								<span>Current Value</span>
								<input
									required
									type="number"
									min="0"
									value={form.current_value}
									onChange={(e) => setForm((prev) => ({ ...prev, current_value: e.target.value }))}
								/>
							</label>
						</div>

						<div className="grid gap-2 md:grid-cols-2 md:gap-3">
							<label className="field">
								<span>Purchase Date</span>
								<input
									required
									type="date"
									value={form.purchase_date}
									onChange={(e) => setForm((prev) => ({ ...prev, purchase_date: e.target.value }))}
								/>
							</label>
							<label className="field">
								<span>Location</span>
								<input
									type="text"
									value={form.location}
									onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
								/>
							</label>
						</div>

						<label className="field">
							<span>Notes</span>
							<textarea
								rows={3}
								value={form.notes}
								onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
							/>
						</label>

						<div className="flex justify-end">
							<button type="submit" className="button-primary" disabled={loading}>
								{loading ? "Saving..." : "Add Asset"}
							</button>
						</div>
					</form>
				</article>

				<article className="panel lg:col-span-2">
					<h3 className="section-title">Asset Register</h3>
					<div className="mt-4 overflow-x-auto">
						<table className="w-full text-sm">
							<thead style={{ color: "var(--text-muted)" }}>
								<tr>
									<th className="py-2 text-left">Name</th>
									<th className="text-left">Type</th>
									<th className="text-right">Current</th>
									<th className="text-right">Purchase</th>
									<th className="text-left">Date</th>
									<th className="text-left">Location</th>
									<th className="text-left">Notes</th>
									<th className="text-right">Action</th>
								</tr>
							</thead>
							<tbody style={{ color: "var(--text)" }}>
								{assetList.length === 0 ? (
									<tr>
										<td className="py-3" colSpan={8} style={{ color: "var(--text-muted)" }}>
											No assets recorded yet. Start by adding your first holding.
										</td>
									</tr>
								) : (
									assetList.map((asset) => {
										const isDemo = !portfolio.assets.length;
										return (
											<tr key={asset.id} className="border-t" style={{ borderColor: "var(--border)" }}>
												<td className="py-3 font-semibold">{asset.name}</td>
												<td>{asset.asset_type}</td>
												<td className="text-right">₹{asset.current_value.toLocaleString()}</td>
												<td className="text-right">₹{asset.purchase_value.toLocaleString()}</td>
												<td>{new Date(asset.purchase_date).toLocaleDateString()}</td>
												<td>{asset.location || "—"}</td>
												<td className="max-w-xs truncate" title={asset.notes || ""}>{asset.notes || "—"}</td>
												<td className="text-right">
													<button
														type="button"
														className="button-ghost text-xs"
														onClick={() => handleDelete(asset.id)}
														disabled={loading || isDemo}
													>
														Delete
													</button>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</article>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<article className="panel h-96">
					<h3 className="section-title">Asset Allocation (Donut)</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<PieChart>
								<Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
									{allocationData.map((entry, idx) => (
										<Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
									))}
								</Pie>
								<Tooltip formatter={(value: number, _name, payload) => [`₹${value.toLocaleString()}`, payload?.payload?.name]} />
								<Legend />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</article>

				<article className="panel h-96">
					<h3 className="section-title">Net Worth Growth</h3>
					<div className="mt-3 h-80">
						<ResponsiveContainer>
							<LineChart data={netWorthSeries}>
								<CartesianGrid stroke={GRID_COLOR} vertical={false} />
								<XAxis dataKey="label" stroke={AXIS_COLOR} />
								<YAxis stroke={AXIS_COLOR} />
								<Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, "Net Worth"]} />
								<Legend />
								<Line type="monotone" dataKey="net_worth" stroke="#0fa3b1" strokeWidth={3} dot={{ r: 3 }} />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</article>
			</div>

			<article className="panel h-96">
				<h3 className="section-title">Asset Appreciation Projection (12 months)</h3>
				<div className="mt-3 h-80">
					<ResponsiveContainer>
						<LineChart data={appreciationData}>
							<CartesianGrid stroke={GRID_COLOR} vertical={false} />
							<XAxis dataKey="name" stroke={AXIS_COLOR} />
							<YAxis stroke={AXIS_COLOR} />
							<YAxis yAxisId={1} orientation="right" stroke={AXIS_COLOR} tickFormatter={(v) => `${v.toFixed(1)}%`} />
								<Tooltip formatter={(value: number, _name, payload) => [`₹${Number(value).toLocaleString()}`, payload?.payload?.name]} />
							<Legend />
							<Line type="monotone" dataKey="projected_value" stroke="#6fa86b" strokeWidth={3} dot={{ r: 3 }} />
							<Line type="monotone" dataKey="growth" stroke="#f1b24a" strokeWidth={2} strokeDasharray="6 6" name="Growth %" yAxisId={1} />
						</LineChart>
					</ResponsiveContainer>
				</div>
			</article>
		</section>
	);
}
