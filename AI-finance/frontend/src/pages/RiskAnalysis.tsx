import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { predictRisk } from "../services/api";
import type { RiskPredictResponse } from "../types";

type RiskForm = {
  income: number;
  monthly_expense: number;
  savings: number;
  loan_amount: number;
  credit_card_usage: number;
  investment: number;
  spending_ratio: number;
  anomaly_frequency: number;
};

const defaultForm: RiskForm = {
  income: 90000,
  monthly_expense: 76000,
  savings: 30000,
  loan_amount: 280000,
  credit_card_usage: 0.82,
  investment: 25000,
  spending_ratio: 0.84,
  anomaly_frequency: 0.22,
};

const meterColor = (riskLevel: string) => {
  if (riskLevel === "HIGH") return "#f26a4b";
  if (riskLevel === "MEDIUM") return "#f1b24a";
  return "#6fa86b";
};

export function RiskAnalysis() {
  const [form, setForm] = useState<RiskForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskPredictResponse | null>(null);
  const [error, setError] = useState("");

  const financialRiskScore = useMemo(() => {
    if (!result) return 0;
    return Math.round(result.risk_score);
  }, [result]);

  const shapData = useMemo(() => {
    if (!result) return [] as Array<{ feature: string; contribution: number }>;
    return (Object.entries(result.shap_explanation) as Array<[string, number]>)
      .map(([feature, contribution]) => ({ feature, contribution }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 8);
  }, [result]);

  const factorsData = useMemo(() => {
    if (!result) return [] as Array<{ factor: string; value: number }>;
    return (Object.entries(result.shap_explanation) as Array<[string, number]>).map(([factor, value]) => ({
      factor: factor.replace(/_/g, " "),
      value: Math.abs(value),
    }));
  }, [result]);

  const onNumberChange = (key: keyof RiskForm) => (e: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(e.target.value);
    setForm((prev: RiskForm) => ({
      ...prev,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const debtProbabilitySeries = useMemo(() => {
    const p = result?.debt_probability ?? 0.28;
    return [
      { month: "Month 1", probability: Math.max(0, Math.min(1, p * 0.85)) },
      { month: "Month 2", probability: Math.max(0, Math.min(1, p * 0.95)) },
      { month: "Month 3", probability: Math.max(0, Math.min(1, p)) },
    ];
  }, [result]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await predictRisk(form);
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({
        risk_score: 68,
        debt_probability: 0.32,
        risk_level: "MEDIUM",
        shap_explanation: {
          debt_ratio: 0.42,
          spending_pressure: 0.36,
          anomaly_frequency: 0.12,
          credit_usage: 0.48,
        },
      });
      setError("Unable to fetch risk prediction. Check backend and endpoint availability.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-5">
      <header>
        <h2 className="font-heading text-3xl" style={{ color: "var(--text)" }}>
          Risk Analysis
        </h2>
        <p className="muted">AI-powered debt risk monitoring for the next 3 months.</p>
      </header>

      <form onSubmit={onSubmit} className="panel grid gap-3 md:grid-cols-4">
        {(Object.keys(form) as Array<keyof RiskForm>).map((key) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {String(key).replace(/_/g, " ")}
            </span>
            <input
              type="number"
              step="0.01"
              value={form[key]}
              onChange={onNumberChange(key)}
              className="field-input"
            />
          </label>
        ))}
        <div className="md:col-span-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="button-primary"
          >
            {loading ? "Predicting..." : "Run Risk Prediction"}
          </button>
          {error ? <p className="text-sm" style={{ color: "var(--accent-2)" }}>{error}</p> : null}
        </div>
      </form>

      {result ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="panel h-72">
              <h3 className="section-title">Risk Probability Meter</h3>
              <div className="mt-4 h-52">
                <ResponsiveContainer>
                  <RadialBarChart
                    data={[{ name: "risk", value: result.debt_probability * 100 }]}
                    startAngle={180}
                    endAngle={0}
                    innerRadius="35%"
                    outerRadius="85%"
                    barSize={22}
                    cx="50%"
                    cy="70%"
                  >
                    <RadialBar dataKey="value" background clockWise fill={meterColor(result.risk_level)} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <p className="-mt-5 text-center font-heading text-3xl" style={{ color: "var(--text)" }}>
                {(result.debt_probability * 100).toFixed(1)}%
              </p>
              <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>{result.risk_level} debt risk</p>
            </article>

            <article className="panel h-72">
              <h3 className="section-title">Financial Risk Score</h3>
              <div className="mt-8 flex h-44 items-center justify-center">
                <div className="text-center">
                  <p className="font-heading text-6xl" style={{ color: "var(--text)" }}>{financialRiskScore}</p>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>Healthier if closer to 100</p>
                </div>
              </div>
            </article>

            <article className="panel h-72">
              <h3 className="section-title">Future Debt Probability</h3>
              <div className="mt-3 h-56">
                <ResponsiveContainer>
                  <LineChart data={debtProbabilitySeries}>
                    <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="month" stroke="#a9b5cc" />
                    <YAxis domain={[0, 1]} stroke="#a9b5cc" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                    <Line type="monotone" dataKey="probability" stroke="#f26a4b" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="panel h-80">
              <h3 className="section-title">SHAP Explanation Chart</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer>
                  <BarChart data={shapData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" stroke="#a9b5cc" />
                    <YAxis type="category" dataKey="feature" width={120} stroke="#a9b5cc" />
                    <Tooltip formatter={(v: number) => v.toFixed(4)} />
                    <Bar dataKey="contribution" radius={[0, 6, 6, 0]}>
                      {shapData.map((item) => (
                        <Cell key={item.feature} fill={item.contribution >= 0 ? "#f26a4b" : "#6fa86b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel h-80">
              <h3 className="section-title">Spending Risk Factors</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer>
                  <RadarChart data={factorsData}>
                    <PolarGrid stroke="rgba(255,255,255,0.18)" />
                    <PolarAngleAxis dataKey="factor" tick={{ fill: "#c7d0e0", fontSize: 11 }} />
                    <Radar dataKey="value" stroke="#0fa3b1" fill="#0fa3b1" fillOpacity={0.5} />
                    <Legend />
                    <Tooltip formatter={(v: number) => v.toFixed(4)} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </>
      ) : (
        <article className="panel">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Submit the form to visualize risk probability, financial risk score, SHAP explanations, spending factors,
            and future debt probability trend.
          </p>
        </article>
      )}
    </section>
  );
}
