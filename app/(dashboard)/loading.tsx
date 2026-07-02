import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton padrão exibido enquanto qualquer dashboard busca dados no servidor. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      {/* cabeçalho */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card space-y-3 rounded-xl border p-5 shadow-sm">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-40 max-w-full" />
          </div>
        ))}
      </div>

      {/* gráfico + ranking */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-card space-y-4 rounded-xl border p-6 shadow-sm lg:col-span-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-[240px] w-full" />
        </div>
        <div className="bg-card space-y-4 rounded-xl border p-6 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
