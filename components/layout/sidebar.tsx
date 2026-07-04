"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Marca FGL: estrela de 4 pontas vermelha (aproximação do logotipo). */
function FglMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path
        d="M16 1l3.2 11.8L31 16l-11.8 3.2L16 31l-3.2-11.8L1 16l11.8-3.2z"
        fill="var(--sidebar-primary)"
      />
      <path
        d="M16 8l1.6 6.4L24 16l-6.4 1.6L16 24l-1.6-6.4L8 16l6.4-1.6z"
        fill="color-mix(in oklch, var(--sidebar-primary) 100%, white 35%)"
      />
    </svg>
  );
}

/** Silhueta portuária (guindaste + contêineres) para o rodapé — traço sutil. */
function PortArt() {
  return (
    <svg
      viewBox="0 0 240 120"
      className="absolute inset-x-0 bottom-0 h-auto w-full opacity-[0.14]"
      aria-hidden
    >
      <g stroke="white" strokeWidth="2" fill="none">
        {/* guindaste */}
        <path d="M30 110V38l52-18v90" />
        <path d="M30 44h96M126 44l-10 12M30 60l52-16M58 110V50" />
        <path d="M96 44v18h10V44" />
      </g>
      <g fill="white">
        {/* pilha de contêineres */}
        <rect x="140" y="92" width="34" height="18" rx="1" />
        <rect x="178" y="92" width="34" height="18" rx="1" />
        <rect x="150" y="72" width="34" height="18" rx="1" opacity="0.8" />
        <rect x="188" y="72" width="24" height="18" rx="1" opacity="0.6" />
        <rect x="160" y="52" width="30" height="18" rx="1" opacity="0.5" />
      </g>
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-screen w-60 shrink-0 flex-col self-start md:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <FglMark className="size-10 shrink-0" />
        <div className="leading-none">
          <p className="text-[26px] font-black tracking-tight">FGL</p>
          <p className="mt-1 text-[8.5px] font-semibold tracking-[0.28em] text-white/60">
            GLOBAL LOGISTICS
          </p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const sectionActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <div key={item.href} className="flex flex-col">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                  sectionActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-black/30"
                    : "text-white/65 hover:bg-sidebar-accent hover:text-white"
                )}
              >
                <Icon className="size-4.5" strokeWidth={sectionActive ? 2.2 : 1.8} />
                {item.label}
              </Link>
              {item.children && sectionActive && (
                <div className="mt-1 mb-1 ml-6 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                  {item.children.map((c) => {
                    const childActive = pathname === c.href;
                    return (
                      <Link
                        key={c.href + c.label}
                        href={c.href}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-[13px] transition-colors",
                          childActive
                            ? "bg-white/12 font-medium text-white"
                            : "text-white/55 hover:bg-white/5 hover:text-white/90"
                        )}
                      >
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Rodapé com arte + tagline */}
      <div className="relative h-44 shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/50" />
        <PortArt />
        <p className="absolute bottom-5 left-5 text-[11px] font-bold tracking-[0.14em] text-white/85 italic">
          WE DELIVER THE FUTURE!
        </p>
      </div>
    </aside>
  );
}
