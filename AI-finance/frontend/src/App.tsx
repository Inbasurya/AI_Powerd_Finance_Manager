import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar } from "./components/Sidebar";
import { AIWealthAssistant } from "./pages/AIWealthAssistant";
import { AnomalyDetection } from "./pages/AnomalyDetection";
import { Dashboard } from "./pages/Dashboard";
import { FinancialScore } from "./pages/FinancialScore";
import { FamilyBudget } from "./pages/FamilyBudget";
import { FinancialTimeline } from "./pages/FinancialTimeline";
import { FinancialHealthEvolution } from "./pages/FinancialHealthEvolution";
import { PortfolioOptimizer } from "./pages/PortfolioOptimizer";
import { FinancialSimulation } from "./pages/FinancialSimulation";
import { ModelPerformance } from "./pages/ModelPerformance";
import { RiskAnalysis } from "./pages/RiskAnalysis";
import { SavingsGoals } from "./pages/SavingsGoals";
import { SmartPlanner } from "./pages/SmartPlanner";
import { Transactions } from "./pages/Transactions";
import { WealthPortfolio } from "./pages/WealthPortfolio";
import { DigitalTwin } from "./pages/DigitalTwin";

export default function App() {
	const [theme, setTheme] = useState<"dark" | "light">(() => {
		if (typeof window === "undefined") return "dark";
		const stored = window.localStorage.getItem("finmind-theme");
		return stored === "light" ? "light" : "dark";
	});
	const [mobileOpen, setMobileOpen] = useState(false);

	useEffect(() => {
		document.documentElement.classList.toggle("light", theme === "light");
		window.localStorage.setItem("finmind-theme", theme);
	}, [theme]);

	return (
		<ErrorBoundary>
			<div className="min-h-screen">
				<div className="app-shell page-enter">
					<Sidebar
						theme={theme}
						onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
						mobileOpen={mobileOpen}
						onCloseMobile={() => setMobileOpen(false)}
					/>
					<main className="app-main">
						<header className="mb-4 flex items-center justify-between md:hidden">
							<button
								type="button"
								onClick={() => setMobileOpen(true)}
								className="button-ghost"
							>
								Menu
							</button>
							<button
								type="button"
								onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
								className="button-ghost"
							>
								{theme === "dark" ? "Light" : "Dark"}
							</button>
						</header>
						<Routes>
							<Route path="/" element={<Navigate to="/dashboard" replace />} />
							<Route path="/dashboard" element={<Dashboard />} />
							<Route path="/transactions" element={<Transactions />} />
							<Route path="/anomaly-detection" element={<AnomalyDetection />} />
							<Route path="/savings-goals" element={<SavingsGoals />} />
							<Route path="/smart-planner" element={<SmartPlanner />} />
							<Route path="/financial-score" element={<FinancialScore />} />
							<Route path="/family-budget" element={<FamilyBudget />} />
							<Route path="/risk-analysis" element={<RiskAnalysis />} />
							<Route path="/ai-wealth-assistant" element={<AIWealthAssistant />} />
							<Route path="/ai-digital-twin" element={<DigitalTwin />} />
							<Route path="/wealth-portfolio" element={<WealthPortfolio />} />
							<Route path="/model-metrics" element={<ModelPerformance />} />
							<Route path="/financial-timeline" element={<FinancialTimeline />} />
							<Route path="/financial-health-evolution" element={<FinancialHealthEvolution />} />
							<Route path="/portfolio-optimizer" element={<PortfolioOptimizer />} />
							<Route path="/financial-simulation" element={<FinancialSimulation />} />
						</Routes>
					</main>
				</div>
			</div>
		</ErrorBoundary>
	);
}
