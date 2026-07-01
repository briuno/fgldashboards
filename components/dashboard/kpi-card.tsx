import { type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  trend?: { label: string; positive: boolean };
};

export function KpiCard({ title, value, hint, icon: Icon, trend }: KpiCardProps) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend.positive ? "text-emerald-600" : "text-destructive"
              )}
            >
              {trend.label}
            </p>
          )}
          {hint && !trend && (
            <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
          )}
        </div>
        {Icon && (
          <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
