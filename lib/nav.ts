import {
  LayoutDashboard,
  TrendingUp,
  Gauge,
  Wallet,
  ListChecks,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { MODALIDADES } from "@/lib/modalidades";

export type NavChild = { href: string; label: string };

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  children?: NavChild[];
};

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Visão Executiva",
    icon: LayoutDashboard,
    description: "Panorama geral de KPIs",
    children: [{ href: "/", label: "Geral" }],
  },
  {
    href: "/comercial",
    label: "Comercial",
    icon: TrendingUp,
    description: "Vendas, lucro por cliente/vendedor",
    children: [
      { href: "/comercial/proposta", label: "Proposta" },
      { href: "/comercial/semanal", label: "Semanal" },
      { href: "/comercial/vendedor", label: "Vendedor" },
      { href: "/comercial/customer", label: "Customer" },
    ],
  },
  {
    href: "/desempenho",
    label: "Desempenho",
    icon: Gauge,
    description: "Performance por modalidade e agentes",
    children: MODALIDADES.map((m) => ({ href: `/desempenho/${m.slug}`, label: m.short })),
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: Wallet,
    description: "AR/AP, aging e fluxo de caixa",
    children: [{ href: "/financeiro", label: "Geral" }],
  },
  {
    href: "/processos",
    label: "Processos",
    icon: ListChecks,
    description: "Lista detalhada de processos",
    children: [{ href: "/processos", label: "Geral" }],
  },
  {
    href: "/auditoria",
    label: "Auditoria",
    icon: ShieldCheck,
    description: "Saúde da sincronização com o Tier2",
  },
];
