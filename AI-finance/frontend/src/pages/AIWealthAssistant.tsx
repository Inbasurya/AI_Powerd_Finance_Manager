import { FormEvent, useState } from "react";

import api from "../services/api";

type AssistantResponse = {
	headline: string;
	question: string;
	intent: string;
	insights: string[];
	recommendations: string[];
	analytics_snapshot: Record<string, number | string>;
};

export function AIWealthAssistant() {
	const [question, setQuestion] = useState("How can I reduce debt risk while increasing my savings rate?");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState<AssistantResponse | null>(null);

	const suggestions = [
		"Analyze my financial health",
		"Suggest savings strategy",
		"Reduce monthly expenses",
		"Portfolio diversification advice",
		"Debt reduction plan",
		"Retirement planning",
		"Budget optimization",
		"Emergency fund calculation",
		"Investment allocation advice",
		"Financial risk analysis",
	];

	async function askAssistant(text: string) {
		if (!text.trim() || loading) return;
		setQuestion(text);
		setLoading(true);
		setError("");

		try {
			const response = await api.post<AssistantResponse>("/ai-assistant", {
				question: text,
				income: 92000,
				expenses: 65000,
				savings: 21000,
				investment: 14500,
				loan: 280000,
				anomalies: 2,
				transactions: 130,
				financial_score: 74,
				risk_probability: 0.41,
				risk_level: "MEDIUM",
			});
			setResult(response.data);
		} catch (requestError) {
			console.error(requestError);
			setError("Assistant response unavailable. Verify backend API and try again.");
		} finally {
			setLoading(false);
		}
	}

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		await askAssistant(question);
	};

	return (
		<section className="space-y-5">
			<header>
				<h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
					AI Wealth Assistant
				</h2>
				<p className="muted">Ask strategy questions and receive analytics-grounded recommendations.</p>
			</header>

			<div className="panel flex flex-wrap gap-2">
				{suggestions.map((item) => (
					<button
						key={item}
						type="button"
						onClick={() => askAssistant(item)}
						disabled={loading}
						className="button-ghost text-sm"
					>
						{item}
					</button>
				))}
			</div>

			<form className="panel space-y-3" onSubmit={onSubmit}>
				<label className="flex flex-col gap-2">
					<span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
						Your Question
					</span>
					<textarea
						value={question}
						onChange={(event) => setQuestion(event.target.value)}
						className="field-input min-h-28"
						placeholder="Ask about score, savings, debt risk, anomalies, or investment allocation."
					/>
				</label>
				<div className="flex items-center gap-3">
					<button type="submit" className="button-primary" disabled={loading || question.trim().length < 3}>
						{loading ? "Generating Insight..." : "Ask Assistant"}
					</button>
					{error ? <p className="text-sm" style={{ color: "var(--accent-2)" }}>{error}</p> : null}
				</div>
			</form>

			{result ? (
				<div className="grid gap-4 lg:grid-cols-2">
					<article className="panel space-y-3">
						<h3 className="section-title">Assistant Summary</h3>
						<p className="font-heading text-2xl" style={{ color: "var(--text)" }}>
							{result.headline}
						</p>
						<p className="muted">Intent: {result.intent}</p>
						<div>
							<p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Insights</p>
							<ul className="mt-2 space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
								{result.insights.map((item, index) => (
									<li key={`insight-${index}`}>- {item}</li>
								))}
							</ul>
						</div>
					</article>

					<article className="panel space-y-3">
						<h3 className="section-title">Action Recommendations</h3>
						<ul className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
							{result.recommendations.map((item, index) => (
								<li key={`rec-${index}`}>- {item}</li>
							))}
						</ul>
						<div className="grid gap-3 md:grid-cols-2">
							{Object.entries(result.analytics_snapshot).map(([key, value]) => (
								<div key={key} className="kpi-card">
									<p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
										{key.replace(/_/g, " ")}
									</p>
									<p className="mt-2 text-base font-semibold" style={{ color: "var(--text)" }}>
										{String(value)}
									</p>
								</div>
							))}
						</div>
					</article>
				</div>
			) : (
				<article className="panel">
					<p className="muted">Submit a question to receive AI-generated recommendations and your current analytics snapshot.</p>
				</article>
			)}
		</section>
	);
}
