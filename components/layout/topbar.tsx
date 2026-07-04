import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LastSyncBadge } from "@/components/layout/last-sync-badge";

/** Nome de exibição a partir do e-mail (bruno.reche@… → "Bruno Reche"). */
function displayName(email: string) {
  const local = email.split("@")[0] ?? "";
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function Topbar({ email }: { email: string }) {
  const name = displayName(email) || email;
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="bg-background sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-lg font-black tracking-tight">
          FGL <span className="text-primary">Dashboards</span>
        </span>
      </div>
      <div className="ml-auto flex items-center gap-3 md:gap-4">
        <LastSyncBadge />
        <div className="flex items-center gap-2.5 border-l pl-3 md:pl-4">
          <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full text-xs font-bold">
            {initials}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-muted-foreground text-xs">Administrador</p>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="ghost" size="sm" title="Sair">
            <LogOut className="size-4" />
            <span className="hidden lg:inline">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
