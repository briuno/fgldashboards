import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { fmtSigned } from "@/lib/format";

type DeltaProps = {
  /** Variação (em % ou p.p.). null/undefined renderiza "—". */
  value: number | null | undefined;
  /** Texto após o número, ex.: "vs 2024". */
  suffix?: string;
  /** Unidade: "%" (padrão) ou "p.p.". */
  unit?: "%" | "p.p.";
  digits?: number;
  className?: string;
};

/** Variação colorida com seta (verde sobe / vermelho desce) — padrão do mockup FGL. */
export function Delta({ value, suffix, unit = "%", digits = 2, className }: DeltaProps) {
  if (value == null || !isFinite(value)) {
    return <span className={cn("text-muted-foreground text-xs", className)}>—</span>;
  }
  const up = value > 0;
  const flat = value === 0;
  return (
    <span
      className={cn(
        // nowrap: em card estreito o "+16,87 p.p. vs 2025" quebrava em 2 linhas
        // e desalinhava a fileira de KPIs.
        "inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap tabular-nums",
        flat ? "text-muted-foreground" : up ? "text-emerald-600" : "text-primary",
        className,
      )}
    >
      {fmtSigned(value, digits)}
      {unit === "p.p." ? " p.p." : "%"}
      {suffix && <span className="font-medium opacity-80">{suffix}</span>}
      {!flat && (up ? <ArrowUp className="size-3" strokeWidth={3} /> : <ArrowDown className="size-3" strokeWidth={3} />)}
    </span>
  );
}
