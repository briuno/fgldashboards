import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  /** Variação vs período anterior. `direction` controla cor/seta; default deriva do sinal. */
  trend?: { label: string; direction?: "up" | "down" | "neutral" };
};

function trendStyle(direction: "up" | "down" | "neutral") {
  switch (direction) {
    case "up":
      return { className: "text-emerald-600 dark:text-emerald-400", Icon: ArrowUpRight };
    case "down":
      return { className: "text-red-600 dark:text-red-400", Icon: ArrowDownRight };
    default:
      return { className: "text-muted-foreground", Icon: Minus };
  }
}

export function KpiCard({ title, value, hint, icon: Icon, trend }: KpiCardProps) {
  const direction =
    trend?.direction ?? (trend?.label.trim().startsWith("-") ? "down" : "up");
  const t = trend ? trendStyle(direction) : null;

  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex items-start justify-between gap-3 px-5">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[13px] font-medium">{title}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight tabular-nums">
            {value || "—"}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            {trend && t && (
              <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", t.className)}>
                <t.Icon className="size-3.5" />
                {trend.label}
              </span>
            )}
            {hint && <span className="text-muted-foreground truncate text-xs">{hint}</span>}
          </div>
        </div>
        {Icon && (
          <div className="bg-primary/8 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
