import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Delta } from "@/components/dashboard/delta";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: string;
  icon?: LucideIcon;
  /** Cor do círculo do ícone (padrão alterna vermelho/preto nos mockups). */
  accent?: "red" | "dark" | "blue" | "muted";
  /** Variação numérica (%) + sufixo, ex.: { value: -44.17, suffix: "vs 2024" }. */
  delta?: { value: number | null; suffix?: string; unit?: "%" | "p.p." };
  /** Texto auxiliar quando não há variação. */
  hint?: string;
  className?: string;
};

const ACCENTS: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  red: "bg-primary text-primary-foreground",
  dark: "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
  blue: "bg-chart-2 text-white",
  muted: "bg-muted text-foreground",
};

/** Card de KPI no padrão FGL: ícone circular à esquerda, rótulo maiúsculo, valor e variação. */
export function KpiCard({ title, value, icon: Icon, accent = "red", delta, hint, className }: KpiCardProps) {
  return (
    <Card className={cn("py-5", className)}>
      <CardContent className="flex items-center gap-3 px-4 xl:gap-4 xl:px-5">
        {Icon && (
          // Entre lg e xl a fileira de 4 cards fica com ~172px cada: o círculo comeria
          // 68px e truncaria o próprio número. O ícone é decorativo — some até dar espaço.
          <div
            className={cn(
              "hidden size-13 shrink-0 items-center justify-center rounded-full xl:flex",
              ACCENTS[accent],
            )}
          >
            <Icon className="size-5.5" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="text-muted-foreground truncate text-[11px] font-semibold tracking-wide uppercase"
            title={title}
          >
            {title}
          </p>
          <p className="mt-0.5 truncate text-[26px] leading-tight font-bold tracking-tight tabular-nums">
            {value || "—"}
          </p>
          <div className="mt-0.5 flex min-h-4 items-center">
            {delta ? (
              <Delta value={delta.value} suffix={delta.suffix} unit={delta.unit} />
            ) : (
              hint && <span className="text-muted-foreground truncate text-xs">{hint}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
