-- M1 — Financeiro: replica os painéis "Performance de Processos e Financeiro" e
-- "Performance de Gross Profit" do Power BI (referência = filtro Sistema: Tier2).
-- Definições (usuário, 2026-07-02):
--   GP1     = ShipmentProcessView.ShipmentProfitInvoiceNetProfitNoExchVariation (lucro faturas s/ var. cambial)
--   GP2     = ShipmentProfitProposalView.NetProfit           (lucro da proposta)
--   Revenue = ShipmentProfitProposalView.TotalSalesProposal  (receita da proposta)
--   Ticket Médio = GP2 / processos.
-- Regras do PBI (validadas no Comercial/Desempenho): data-base = ProcessDate
-- ("data processo"), exclui Status='Canceled' e ProcessID com CONS (consolidações).

create table if not exists raw.shipment_profit_proposal (
  oid       uuid primary key,
  data      jsonb not null,
  synced_at timestamptz not null default now()
);

drop view if exists mart.financeiro_totais;
drop view if exists mart.financeiro_mensal;
drop view if exists mart.financeiro_mensal_detalhe;
drop view if exists mart.financeiro_clientes;
drop view if exists mart.financeiro_tipos;
drop view if exists mart.financeiro_base cascade;

create view mart.financeiro_base as
select
  p.data->>'ProcessID'                                         as process_id,
  (nullif(p.data->>'ProcessDate',''))::timestamptz             as process_date,
  extract(year  from (nullif(p.data->>'ProcessDate',''))::timestamptz
                     at time zone 'America/Sao_Paulo')::int    as ano,
  extract(month from (nullif(p.data->>'ProcessDate',''))::timestamptz
                     at time zone 'America/Sao_Paulo')::int    as mes,
  p.data->>'ProcessType'                                       as process_type,
  p.data->>'CustomerName'                                      as customer_name,
  coalesce((nullif(p.data->>'ShipmentProfitInvoiceNetProfitNoExchVariation',''))::numeric, 0) as gp1,
  coalesce((nullif(pp.data->>'NetProfit',''))::numeric, 0)     as gp2,
  coalesce((nullif(pp.data->>'TotalSalesProposal',''))::numeric, 0) as revenue
from raw.shipment_process p
left join raw.shipment_profit_proposal pp
  on (pp.data->>'ProcessOID')::uuid = p.oid
where p.data->>'ProcessDate' is not null
  and p.data->>'Status' <> 'Canceled'
  and (p.data->>'ProcessID') not ilike '%CONS%';

-- Cards do topo (Processos / Clientes do ano) + totais das tabelas YoY.
create view mart.financeiro_totais as
select ano, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(gp1), 2) as gp1, round(sum(gp2), 2) as gp2, round(sum(revenue), 2) as revenue
from mart.financeiro_base group by 1;

-- Tela sem filtros: gráfico GP2 mensal + tabelas YoY (GP2/Revenue/Ticket) + GP1×GP2.
create view mart.financeiro_mensal as
select ano, mes, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(gp1), 2) as gp1, round(sum(gp2), 2) as gp2, round(sum(revenue), 2) as revenue
from mart.financeiro_base group by 1, 2;

-- Tela com filtro (cliente e/ou modalidade): agregação server-side via RPC
-- (uma view detalhada estouraria o max-rows de 1000 do PostgREST).
create or replace function mart.financeiro_mensal_filtrado(p_ano int, p_cliente text default null, p_tipo text default null)
returns table (ano int, mes int, processos int, clientes int, gp1 numeric, gp2 numeric, revenue numeric)
language sql stable
as $$
  select b.ano, b.mes, count(*)::int, count(distinct b.customer_name)::int,
         round(sum(b.gp1), 2), round(sum(b.gp2), 2), round(sum(b.revenue), 2)
  from mart.financeiro_base b
  where b.ano in (p_ano - 1, p_ano)
    and (p_cliente is null or b.customer_name = p_cliente)
    and (p_tipo is null or b.process_type = p_tipo)
  group by 1, 2
$$;

-- Cards sob filtro (clientes distintos do ANO ≠ soma dos meses).
create or replace function mart.financeiro_totais_filtrado(p_ano int, p_cliente text default null, p_tipo text default null)
returns table (ano int, processos int, clientes int, gp1 numeric, gp2 numeric, revenue numeric)
language sql stable
as $$
  select b.ano, count(*)::int, count(distinct b.customer_name)::int,
         round(sum(b.gp1), 2), round(sum(b.gp2), 2), round(sum(b.revenue), 2)
  from mart.financeiro_base b
  where b.ano in (p_ano - 1, p_ano)
    and (p_cliente is null or b.customer_name = p_cliente)
    and (p_tipo is null or b.process_type = p_tipo)
  group by 1
$$;

-- Opções dos dropdowns de filtro.
create view mart.financeiro_clientes as
select ano, customer_name, count(*)::int as processos
from mart.financeiro_base
where customer_name is not null and customer_name <> ''
group by 1, 2;

create view mart.financeiro_tipos as
select ano, process_type, count(*)::int as processos
from mart.financeiro_base
where process_type is not null and process_type <> ''
group by 1, 2;

-- As RPCs rodam como invoker: precisam de select na base (mesmo dado das demais views).
grant select on mart.financeiro_base, mart.financeiro_totais, mart.financeiro_mensal,
  mart.financeiro_clientes, mart.financeiro_tipos to authenticated;
grant execute on function mart.financeiro_mensal_filtrado(int, text, text) to authenticated;
grant execute on function mart.financeiro_totais_filtrado(int, text, text) to authenticated;
