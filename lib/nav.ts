import {
  LayoutDashboard,
  TrendingUp,
  Gauge,
  Wallet,
  ListChecks,
  ShieldCheck,
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
    href: "/desempenho",
    label: "Desempenho",
    icon: Gauge,
    description: "Performance de processos, financeiro e agentes",
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
  {
    href: "/auditoria",
    label: "Auditoria",
    icon: ShieldCheck,
    description: "Saúde da sincronização com o Tier2",
  },
];
