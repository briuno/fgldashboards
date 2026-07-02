import { Badge } from "@/components/ui/badge";

/**
 * Status da sincronização com o Tier2.
 * A ingestão roda diariamente via Edge Function `tier2-sync` + pg_cron.
 */
export function LastSyncBadge() {
  return (
    <Badge variant="success" className="gap-1.5 font-normal">
      <span className="inline-block size-1.5 rounded-full bg-current" />
      Sincronização diária ativa
    </Badge>
  );
}
