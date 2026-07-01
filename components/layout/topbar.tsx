import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LastSyncBadge } from "@/components/layout/last-sync-badge";

export function Topbar({ email }: { email: string }) {
  return (
    <header className="bg-background sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="font-semibold">FGL Dashboards</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <LastSyncBadge />
        <span className="text-muted-foreground hidden text-sm sm:inline">
          {email}
        </span>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
