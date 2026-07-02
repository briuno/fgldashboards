import { Inbox, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
};

/** Estado vazio padrão para gráficos, listas e tabelas. */
export function EmptyState({
  title = "Sem dados",
  description = "Nenhum registro para o período selecionado.",
  icon: Icon = Inbox,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex h-[200px] flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-center",
        className
      )}
    >
      <Icon className="size-5 opacity-60" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs">{description}</p>
    </div>
  );
}
