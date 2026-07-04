-- M1 — Comercial: usa o lucro PREVISTO (ForecastNetProfit) como "Profit Previsto",
-- em vez do GP2. GP2 (ShipmentProfitProposalView.NetProfit) segue nas demais telas.
-- Definições:
--   Profit Previsto = ShipmentProcessView.ForecastNetProfit
--   Receita         = ShipmentProfitProposalView.TotalSalesProposal
-- Regras do PBI: data-base = ProcessDate; exclui Status='Canceled' e ProcessID com CONS.

drop view if exists mart.comercial_mensal;
drop view if exists mart.comercial_totais;
drop view if exists mart.comercial_base cascade;

create view mart.comercial_base as
select
  p.data->>'ProcessID'                                          as process_id,
  extract(year  from (nullif(p.data->>'ProcessDate','')::timestamptz
                     at time zone 'America/Sao_Paulo'))::int     as ano,
  extract(month from (nullif(p.data->>'ProcessDate','')::timestamptz
                     at time zone 'America/Sao_Paulo'))::int     as mes,
  p.data->>'ProcessType'                                        as process_type,
  p.data->>'CustomerName'                                       as customer_name,
  coalesce((nullif(pp.data->>'TotalSalesProposal',''))::numeric, 0) as revenue,
  coalesce((nullif(p.data->>'ForecastNetProfit',''))::numeric, 0)   as profit_previsto
from raw.shipment_process p
left join raw.shipment_profit_proposal pp
  on (pp.data->>'ProcessOID')::uuid = p.oid
where p.data->>'ProcessDate' is not null
  and p.data->>'Status' <> 'Canceled'
  and (p.data->>'ProcessID') not ilike '%CONS%';

-- Mensal dos dois anos (para tabela YoY, gráficos e estatísticas).
create view mart.comercial_mensal as
select ano, mes, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(revenue), 2) as revenue, round(sum(profit_previsto), 2) as profit_previsto
from mart.comercial_base group by 1, 2;

-- Totais do ano (clientes distintos do ANO ≠ soma dos meses) — cards do topo.
create view mart.comercial_totais as
select ano, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(revenue), 2) as revenue, round(sum(profit_previsto), 2) as profit_previsto
from mart.comercial_base group by 1;

grant select on mart.comercial_base, mart.comercial_mensal, mart.comercial_totais to authenticated;
