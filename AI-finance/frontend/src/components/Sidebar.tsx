import { NavLink } from "react-router-dom";

type ThemeMode = "dark" | "light";

type IconName = "wallet" | "chart" | "shield" | "robot" | "target" | "calendar" | "stack" | "spark";

type NavItem = { label: string; to: string; icon: IconName };

const navGroups: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: "wallet" },
      { label: "Transactions", to: "/transactions", icon: "stack" },
    ],
  },
  {
    heading: "AI Insights",
    items: [
      { label: "Anomaly Detection", to: "/anomaly-detection", icon: "shield" },
      { label: "Financial Score", to: "/financial-score", icon: "chart" },
      { label: "Risk Analysis", to: "/risk-analysis", icon: "target" },
      { label: "AI Wealth Assistant", to: "/ai-wealth-assistant", icon: "robot" },
      { label: "AI Digital Twin", to: "/ai-digital-twin", icon: "spark" },
    ],
  },
  {
    heading: "Planning",
    items: [
      { label: "Smart Planner", to: "/smart-planner", icon: "calendar" },
      { label: "Savings Goals", to: "/savings-goals", icon: "target" },
      { label: "Financial Timeline", to: "/financial-timeline", icon: "calendar" },
      { label: "Financial Simulation", to: "/financial-simulation", icon: "chart" },
    ],
  },
  {
    heading: "Portfolio",
    items: [
      { label: "Wealth Portfolio", to: "/wealth-portfolio", icon: "wallet" },
      { label: "AI Portfolio Optimizer", to: "/portfolio-optimizer", icon: "chart" },
      { label: "Family Budget", to: "/family-budget", icon: "stack" },
    ],
  },
  {
    heading: "AI Models",
    items: [
      { label: "AI Model Metrics", to: "/model-metrics", icon: "chart" },
      { label: "Financial Health Evolution", to: "/financial-health-evolution", icon: "spark" },
    ],
  },
];

const icons: Record<IconName, JSX.Element> = {
  wallet: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z" />
      <path d="M17 12h4" />
      <circle cx="15.5" cy="12" r="1.25" />
    </svg>
  ),
  chart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15l3-5 3 3 4-7" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6Z" />
      <path d="M9.5 12l2 2 3-3" />
    </svg>
  ),
  robot: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="7" width="16" height="10" rx="2" />
      <path d="M12 7V4" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M8 16h8" />
    </svg>
  ),
  target: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16" />
      <path d="M9 3v4" />
      <path d="M15 3v4" />
    </svg>
  ),
  stack: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 9 4.5-9 4.5-9-4.5Z" />
      <path d="m3 12 9 4.5 9-4.5" />
      <path d="m3 16.5 9 4.5 9-4.5" />
    </svg>
  ),
  spark: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="m5.5 5.5 2.5 2.5" />
      <path d="m16 16 2.5 2.5" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m5.5 18.5 2.5-2.5" />
      <path d="m16 8 2.5-2.5" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  ),
};

interface SidebarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function IconBadge({ name }: { name: IconName }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent 90%)", color: "var(--text)" }}>
      {icons[name]}
    </span>
  );
}

export function Sidebar({ theme, onToggleTheme, mobileOpen, onCloseMobile }: SidebarProps) {
  const brandBlock = (
    <div>
      <h1 className="font-heading text-2xl" style={{ color: "var(--text)" }}>
        FinMind AI Pro
      </h1>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        Research-grade Personal Finance Intelligence
      </p>
    </div>
  );

  const linksBlock = (
    <nav className="mt-6 space-y-4">
      {navGroups.map((group) => (
        <div key={group.heading} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
            {group.heading}
          </p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  [
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all",
                    isActive ? "font-semibold" : "hover:translate-x-1 hover:shadow-sm",
                  ].join(" ")
                }
                style={({ isActive }) => ({
                  border: `1px solid ${isActive ? "color-mix(in srgb, var(--accent) 45%, white 55%)" : "var(--border)"}`,
                  background: isActive
                    ? "color-mix(in srgb, var(--accent) 20%, transparent 80%)"
                    : "color-mix(in srgb, var(--surface-strong) 60%, transparent 40%)",
                  color: isActive ? "var(--text)" : "var(--text-muted)",
                })}
              >
                <IconBadge name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const footerBlock = (
    <div className="mt-6 space-y-3">
      <button type="button" onClick={onToggleTheme} className="button-ghost w-full text-left">
        {theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
      </button>
      <div className="rounded-2xl p-3 text-xs" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
        IEEE Demo Build
      </div>
    </div>
  );

  return (
    <>
      <aside
        className="sticky top-5 hidden h-[calc(100vh-40px)] w-72 shrink-0 rounded-[1.75rem] p-5 md:flex md:flex-col overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <div className="sidebar-scroll flex-1 overflow-y-auto pr-1">
          <div className="flex h-full flex-col">
            {brandBlock}
            {linksBlock}
            <div className="mt-auto">{footerBlock}</div>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={onCloseMobile}
          />
          <aside
            className="relative z-10 flex h-full w-[84%] max-w-[340px] flex-col overflow-hidden p-5"
            style={{ borderRight: "1px solid var(--border)", background: "var(--surface-strong)" }}
          >
            <div className="sidebar-scroll flex-1 overflow-y-auto pr-1">
              <div className="flex h-full flex-col">
                {brandBlock}
                {linksBlock}
                <div className="mt-auto">{footerBlock}</div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
