interface PlannerStep {
  label: string;
  amount: number;
  month: string;
}

interface PlannerTimelineProps {
  steps: PlannerStep[];
}

export function PlannerTimeline({ steps }: PlannerTimelineProps) {
  return (
    <div className="panel">
      <h3 className="section-title">Savings Timeline</h3>
      <ul className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={`${step.month}-${index}`} className="relative pl-5">
            <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />
            <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface-strong) 78%, transparent 22%)" }}>
              <p className="text-sm" style={{ color: "var(--text)" }}>{step.month}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{step.label}</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: "var(--success)" }}>₹{step.amount.toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
