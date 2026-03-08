import { ChangeEvent, useMemo } from "react";

interface FormattedNumberInputProps {
	label: string;
	value: number;
	onValueChange: (value: number) => void;
	prefix?: string;
	helperText?: string;
	min?: number;
}

const formatter = new Intl.NumberFormat("en-IN");

export function FormattedNumberInput({ label, value, onValueChange, prefix = "", helperText, min = 0 }: FormattedNumberInputProps) {
	const displayValue = useMemo(() => (Number.isFinite(value) ? formatter.format(value) : ""), [value]);

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value.replace(/[^0-9.-]/g, "");
		const parsed = Number(raw);
		onValueChange(Number.isFinite(parsed) ? Math.max(parsed, min) : min);
	};

	return (
		<label className="field">
			<span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>
				{label}
			</span>
			<div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface-strong) 82%, transparent 18%)" }}>
				{prefix ? <span className="text-sm" style={{ color: "var(--text-muted)" }}>{prefix}</span> : null}
				<input
					type="text"
					inputMode="decimal"
					value={displayValue}
					onChange={handleChange}
					className="w-full bg-transparent text-base outline-none"
					style={{ color: "var(--text)" }}
				/>
			</div>
			{helperText ? (
				<span className="text-xs" style={{ color: "var(--text-muted)" }}>
					{helperText}
				</span>
			) : null}
		</label>
	);
}
