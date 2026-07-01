import {
  LayoutDashboard,
  TrendingUp,
  Ship,
  Wallet,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Visão Executiva",
    icon: LayoutDashboard,
    description: "Panorama geral de KPIs",
  },
  {
    href: "/comercial",
    label: "Comercial",
    icon: TrendingUp,
    description: "Vendas, lucro por cliente/vendedor",
  },
  {
    href: "/operacoes",
    label: "Operações",
    icon: Ship,
    description: "Processos por tipo, rota e transportadora",
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: Wallet,
    description: "AR/AP, aging e fluxo de caixa",
  },
  {
    href: "/processos",
    label: "Processos",
    icon: ListChecks,
    description: "Lista detalhada de processos",
  },
];
