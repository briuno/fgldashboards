import { Badge } from "@/components/ui/badge";
import { classifySync, getSyncHealth } from "@/lib/queries/auditoria";
import { fmtRelative } from "@/lib/format";

const VARIANT = {
  ok: "success",
  warn: "warning",
  error: "destructive",
  none: "secondary",
} as const;

/**
 * Status real da sincronização com o Tier2 (lê mart.sync_health).
 * Verde = em dia (<26h) · Amarelo = atrasada / sem novidades · Vermelho = erro.
 * A ingestão roda diariamente via Edge Function `tier2-sync` + pg_cron.
 */
export async function LastSyncBadge() {
  const health = await getSyncHealth();
  const { level, label } = classifySync(health);
  const quando = fmtRelative(health?.last_success_at);
  const texto = level === "ok" ? `Sincronizado ${quando}` : label;

  return (
    <Badge
      variant={VARIANT[level]}
      className="gap-1.5 font-normal"
      title={
        health?.last_success_at
          ? `Última sincronização bem-sucedida ${quando}`
          : "Nenhuma sincronização registrada ainda"
      }
    >
      <span className="inline-block size-1.5 rounded-full bg-current" />
      {texto}
    </Badge>
  );
}
