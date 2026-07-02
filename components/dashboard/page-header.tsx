import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  /** Ações à direita (seletores, botões de exportar etc.). */
  children?: React.ReactNode;
  className?: string;
};

/** Cabeçalho padrão de página: título + descrição à esquerda, ações à direita. */
export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

/** Cabeçalho de seção dentro de uma página (agrupa blocos de cards/gráficos). */
export function SectionHeader({
  title,
  description,
  kicker,
  children,
  className,
}: PageHeaderProps & { kicker?: string }) {
  return (
    <div className={cn("mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2", className)}>
      <div className="min-w-0">
        {kicker && (
          <p className="text-primary text-[11px] font-semibold tracking-widest uppercase">
            {kicker}
          </p>
        )}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
