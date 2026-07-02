import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "default" | "positive" | "negative" | "warning";

const STYLES: Record<Variant, { box: string; icon: string; Icon: LucideIcon }> = {
  default: { box: "border-border", icon: "bg-primary/8 text-primary", Icon: Lightbulb },
  positive: {
    box: "border-emerald-200 dark:border-emerald-900/50",
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
    Icon: TrendingUp,
  },
  negative: {
    box: "border-red-200 dark:border-red-900/50",
    icon: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400",
    Icon: TrendingDown,
  },
  warning: {
    box: "border-amber-200 dark:border-amber-900/50",
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
    Icon: AlertTriangle,
  },
};

type InsightCardProps = {
  /** Rótulo curto acima do título (ex.: "Destaque", "Atenção", "Maior impacto"). */
  kicker: string;
  title: string;
  description?: string;
  variant?: Variant;
  icon?: LucideIcon;
  className?: string;
};

/**
 * Card de leitura executiva: destaca um fato já presente nos dados
 * (maior ofensor, destaque da semana, tendência) — sem inventar métricas.
 */
export function InsightCard({
  kicker,
  title,
  description,
  variant = "default",
  icon,
  className,
}: InsightCardProps) {
  const s = STYLES[variant];
  const Icon = icon ?? s.Icon;
  return (
    <div className={cn("bg-card flex items-start gap-3 rounded-xl border p-4 shadow-sm", s.box, className)}>
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", s.icon)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{kicker}</p>
        <p className="mt-0.5 text-sm font-semibold">{title}</p>
        {description && <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>}
      </div>
    </div>
  );
}
