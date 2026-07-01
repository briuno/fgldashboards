import { Badge } from "@/components/ui/badge";

/**
 * Placeholder for the "última atualização" badge.
 * Será ligado à tabela etl.sync_log no M1 (após a primeira sincronização real).
 */
export function LastSyncBadge() {
  return (
    <Badge variant="warning" className="gap-1.5">
      <span className="inline-block size-1.5 rounded-full bg-current" />
      Aguardando 1ª sincronização
    </Badge>
  );
}
