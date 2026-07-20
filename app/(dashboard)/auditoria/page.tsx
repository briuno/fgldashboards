import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  PackageX,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MonthlyBar, type MonthlyBarPoint } from "@/components/charts/monthly-bar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtDateTime, fmtRelative, int, num } from "@/lib/format";
import {
  classifySync,
  getDataFreshness,
  getRowsSyncedDaily,
  getSyncHealth,
  getSyncRuns,
  type SyncLevel,
} from "@/lib/queries/auditoria";

const BADGE_VARIANT = { ok: "success", warn: "warning", error: "destructive", none: "secondary" } as const;

const BANNER: Record<SyncLevel, { cls: string; Icon: React.ElementType }> = {
  ok: { cls: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200", Icon: CheckCircle2 },
  warn: { cls: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200", Icon: AlertTriangle },
  error: { cls: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200", Icon: XCircle },
  none: { cls: "border-border bg-muted/50 text-muted-foreground", Icon: Clock },
};

function RunStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "text-emerald-600",
    error: "text-primary",
    running: "text-amber-600",
  };
  const label: Record<string, string> = { success: "sucesso", error: "erro", running: "rodando" };
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${map[status] ?? "text-muted-foreground"}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {label[status] ?? status}
    </span>
  );
}

export default async function AuditoriaPage() {
  const [health, runs, daily, fresh] = await Promise.all([
    getSyncHealth(),
    getSyncRuns(30),
    getRowsSyncedDaily(),
    getDataFreshness(),
  ]);

  const { level, label } = classifySync(health);
  const banner = BANNER[level];

  const chart: MonthlyBarPoint[] = daily.map((d) => ({
    label: `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}`,
    value: Number(d.linhas),
  }));

  // Reconciliação raw × mart (devem bater — mart lê de raw via core).
  const rawCount = fresh ? Number(fresh.raw_count) : null;
  const martProc = fresh?.mart_processos != null ? Number(fresh.mart_processos) : null;
  const reconcilia = rawCount !== null && martProc !== null && rawCount === martProc;

  const bannerMsg =
    level === "ok"
      ? `Última sincronização bem-sucedida ${fmtRelative(health?.last_success_at)} (${fmtDateTime(health?.last_success_at)}).`
      : level === "error"
        ? `A última execução falhou: ${health?.last_error ?? "erro desconhecido"}.`
        : level === "warn"
          ? health?.zeroed
            ? "A última execução (delta) não trouxe nenhuma linha nova — pode ser um dia sem novidades, mas vale conferir a API."
            : `Sem sincronização bem-sucedida há mais de 26h (última: ${fmtRelative(health?.last_success_at)}).`
          : "Nenhuma execução de sincronização registrada ainda. Rode a Edge Function tier2-sync.";

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader title="Auditoria" description="Saúde da sincronização com o Tier2">
        <Badge variant={BADGE_VARIANT[level]} className="gap-1.5">
          <span className="inline-block size-1.5 rounded-full bg-current" />
          {label}
        </Badge>
      </PageHeader>

      {/* Faixa de status */}
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${banner.cls}`}>
        <banner.Icon className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-sm opacity-90">{bannerMsg}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Última sincronização"
          value={fmtRelative(health?.last_success_at)}
          icon={RefreshCw}
          accent={level === "error" ? "red" : "dark"}
          hint={health?.last_success_at ? fmtDateTime(health?.last_success_at) : "sem registro"}
        />
        <KpiCard
          title="Linhas atualizadas hoje"
          value={fresh ? num.format(Number(fresh.linhas_hoje)) : "—"}
          icon={Database}
          accent="red"
          hint="Upserts em raw.shipment_process"
        />
        <KpiCard
          title="Linhas na última execução"
          value={health?.last_rows_upserted != null ? num.format(Number(health.last_rows_upserted)) : "—"}
          icon={CheckCircle2}
          accent="dark"
          hint={health?.last_mode ? `Modo: ${health.last_mode}` : undefined}
        />
        <KpiCard
          title="Linhas perdidas (Tier2 502)"
          value={health?.last_rows_lost != null ? num.format(Number(health.last_rows_lost)) : "—"}
          icon={PackageX}
          accent={Number(health?.last_rows_lost ?? 0) > 0 ? "red" : "muted"}
          hint="Registros que a API negou na última run"
        />
      </div>

      {/* Gráfico diário + reconciliação. Em xl: a tabela ao lado precisa da largura —
          a 2fr de uma tela lg ela passava a rolar na horizontal. */}
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Linhas atualizadas por dia</CardTitle>
            <CardDescription>
              Últimos 30 dias — dias em zero indicam sincronização sem novidades ou falha
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chart.length === 0 ? (
              <EmptyState className="h-[300px]" description="Sem sincronizações nos últimos 30 dias." />
            ) : (
              <MonthlyBar data={chart} name="Linhas" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Frescor & Reconciliação</CardTitle>
            <CardDescription>raw × mart devem bater</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Última atualização (raw)</dt>
                <dd className="tabular-nums">{fmtDateTime(fresh?.ultima_atualizacao)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">High-water-mark</dt>
                <dd className="tabular-nums">{fmtDateTime(health?.high_water_mark)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Linhas em raw</dt>
                <dd className="tabular-nums">{rawCount !== null ? num.format(rawCount) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Processos em mart</dt>
                <dd className="tabular-nums">{martProc !== null ? num.format(martProc) : "—"}</dd>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 border-t pt-3">
                <dt className="font-medium">Consistência raw × mart</dt>
                <dd>
                  {rawCount === null || martProc === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : reconcilia ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                      <CheckCircle2 className="size-4" /> OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      <AlertTriangle className="size-4" /> divergente
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Execuções recentes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Execuções recentes</CardTitle>
          <CardDescription>Histórico de auditoria por run (etl.sync_log)</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <EmptyState
              className="h-[200px]"
              title="Nenhuma execução registrada"
              description="Aplique a migration de auditoria e rode a Edge Function tier2-sync para popular o log."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Início</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Modo</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                    <TableHead className="text-right">Linhas</TableHead>
                    <TableHead className="text-right">Perdidas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="py-1.5 whitespace-nowrap tabular-nums">{fmtDateTime(r.started_at)}</TableCell>
                      <TableCell className="py-1.5 whitespace-nowrap">{r.entity}</TableCell>
                      <TableCell className="py-1.5 whitespace-nowrap">{r.mode ?? "—"}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">
                        {r.duration_s != null ? `${int.format(r.duration_s)}s` : "—"}
                      </TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{num.format(Number(r.rows_upserted))}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">
                        {Number(r.rows_lost) > 0 ? (
                          <span className="text-primary">{num.format(Number(r.rows_lost))}</span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 whitespace-nowrap">
                        <RunStatus status={r.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[260px] truncate py-1.5" title={r.error ?? ""}>
                        {r.error ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Fonte: etl.sync_log + etl.sync_state + raw.shipment_process (via views do schema mart). A
        ingestão roda pela Edge Function tier2-sync (backfill mês a mês → delta diário por
        ShipmentUpdateOn), agendada por pg_cron. &quot;Linhas perdidas&quot; = registros que o Tier2
        nega com HTTP 502 e são isolados pela recuperação por bissecção.
      </p>
    </div>
  );
}
