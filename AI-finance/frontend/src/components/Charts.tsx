import { useMemo, useState } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = ["#0fa3b1", "#f26a4b", "#6fa86b", "#8be0e8", "#f1b24a", "#8da3ff"];
const AXIS_COLOR = "#8fa4c7";
const GRID_COLOR = "rgba(143, 164, 199, 0.25)";

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--surface-strong) 88%, white 12%)",
  color: "var(--text)",
};

export function ExpenseChart({ data }: { data: Array<{ label: string; value: number }> }) {
  return (
    <div className="panel h-72">
      <h3 className="section-title">Expense Trend</h3>
      <div className="mt-3 h-56">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0fa3b1" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#0fa3b1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="label" stroke={AXIS_COLOR} />
            <YAxis stroke={AXIS_COLOR} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke="#0fa3b1" fill="url(#expenseGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryChart({ data }: { data: Array<{ category: string; amount: number }> }) {
  return (
    <div className="panel h-72">
      <h3 className="section-title">Category Spend Mix</h3>
      <div className="mt-3 h-56">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey="category" outerRadius={90}>
              {data.map((entry, index) => (
                <Cell key={entry.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SpendingPieChart({ data }: { data: Array<{ category: string; amount: number }> }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="panel h-80">
      <h3 className="section-title">Spending Mix</h3>
      <div className="mt-3 h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              outerRadius={95}
              innerRadius={42}
              onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.category}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                />
              ))}
            </Pie>
            <Legend />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value.toLocaleString()}`, "Spent"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MonthlyExpenseTrend({ data }: { data: Array<{ month: string; actual: number; predicted?: number }> }) {
  return (
    <div className="panel h-80">
      <h3 className="section-title">Monthly Expense Trend</h3>
      <div className="mt-3 h-64">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="month" stroke={AXIS_COLOR} />
            <YAxis stroke={AXIS_COLOR} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="actual" stroke="#0fa3b1" strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="predicted" stroke="#f26a4b" strokeWidth={2} strokeDasharray="6 6" dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SavingsChart({ data }: { data: Array<{ month: string; savings: number }> }) {
  return (
    <div className="panel h-72">
      <h3 className="section-title">Savings Momentum</h3>
      <div className="mt-3 h-56">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="month" stroke={AXIS_COLOR} />
            <YAxis stroke={AXIS_COLOR} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="savings" fill="#6fa86b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SavingsGrowthChart({ data }: { data: Array<{ month: string; savings: number }> }) {
  const cumulative = useMemo(() => {
    let running = 0;
    return data.map((item) => {
      running += item.savings;
      return { month: item.month, growth: running };
    });
  }, [data]);

  return (
    <div className="panel h-80">
      <h3 className="section-title">Savings Growth</h3>
      <div className="mt-3 h-64">
        <ResponsiveContainer>
          <AreaChart data={cumulative}>
            <defs>
              <linearGradient id="savingsGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6fa86b" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#6fa86b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="month" stroke={AXIS_COLOR} />
            <YAxis stroke={AXIS_COLOR} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value.toLocaleString()}`, "Cumulative"]} />
            <Area type="monotone" dataKey="growth" stroke="#6fa86b" fill="url(#savingsGrowthGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function FinancialHealthScoreGauge({ score }: { score: number }) {
  const gaugeData = [
    {
      name: "score",
      value: Math.max(0, Math.min(100, score)),
      fill: score >= 80 ? "#6fa86b" : score >= 60 ? "#0fa3b1" : score >= 40 ? "#f1b24a" : "#f26a4b",
    },
  ];

  return (
    <div className="panel h-80">
      <h3 className="section-title">Financial Health Gauge</h3>
      <div className="mt-3 h-64">
        <ResponsiveContainer>
          <RadialBarChart
            cx="50%"
            cy="60%"
            innerRadius="35%"
            outerRadius="80%"
            barSize={24}
            data={gaugeData}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar background dataKey="value" cornerRadius={12} />
            <Tooltip contentStyle={tooltipStyle} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <p className="-mt-8 text-center font-heading text-4xl" style={{ color: "var(--text)" }}>
        {score.toFixed(0)}
      </p>
      <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
        out of 100
      </p>
    </div>
  );
}

export function AnomalyAlertsPanel({ data }: { data: Array<{ label: string; score: number }> }) {
  return (
    <div className="panel h-80">
      <h3 className="section-title">Anomaly Alerts</h3>
      <div className="mt-3 h-52">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="label" stroke={AXIS_COLOR} />
            <YAxis stroke={AXIS_COLOR} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value.toFixed(4), "Risk score"]} />
            <Bar dataKey="score" radius={[8, 8, 0, 0]}>
              {data.map((row) => (
                <Cell key={row.label} fill={row.score > 0 ? "#6fa86b" : "#f26a4b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <p>High risk if score less than 0</p>
        <p className="text-right">Hover bars for details</p>
      </div>
    </div>
  );
}
