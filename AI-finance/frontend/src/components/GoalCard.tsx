interface GoalCardProps {
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export function GoalCard({ title, targetAmount, currentAmount, deadline }: GoalCardProps) {
  const progress = Math.min(100, Math.round((currentAmount / targetAmount) * 100));

  return (
    <article className="panel">
      <header className="flex items-center justify-between">
        <h3 className="font-heading text-base" style={{ color: "var(--text)" }}>{title}</h3>
        <span className="rounded-full px-2 py-1 text-xs" style={{ background: "color-mix(in srgb, var(--surface-strong) 70%, transparent 30%)", color: "var(--text-muted)" }}>
          {deadline}
        </span>
      </header>
      <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
        Saved <span className="font-semibold" style={{ color: "var(--text)" }}>${currentAmount.toLocaleString()}</span> of ${targetAmount.toLocaleString()}
      </p>
      <div className="mt-3 h-2 rounded-full" style={{ background: "color-mix(in srgb, var(--text-muted) 24%, transparent 76%)" }}>
        <div className="h-2 rounded-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--accent), var(--success))" }} />
      </div>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>{progress}% complete</p>
    </article>
  );
}
