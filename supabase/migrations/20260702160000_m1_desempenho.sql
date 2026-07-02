-- M1 — Desempenho (substitui "Operações"): performance de processos, financeiro e agentes.
-- Regra validada contra o PBI (2025 jan-out = 2.400 vs 2.399):
--   data-base = ProcessDate ("data processo"); exclui Canceled e ProcessID com CONS.
--   GP2 = ShipmentProfitInvoiceNetProfit (lucro realizado por faturas; AURORA 2025 = 99,8% do PBI).

drop view if exists mart.desempenho_totais;
drop view if exists mart.desempenho_mensal;
drop view if exists mart.desempenho_modalidade;
drop view if exists mart.desempenho_cliente;
drop view if exists mart.desempenho_agente;
drop view if exists mart.desempenho_agente_mensal;
drop view if exists mart.desempenho_base cascade;

create view mart.desempenho_base as
select
  data->>'ProcessID'                                              as process_id,
  (nullif(data->>'ProcessDate',''))::timestamptz                  as process_date,
  extract(year  from (nullif(data->>'ProcessDate',''))::timestamptz)::int as ano,
  extract(month from (nullif(data->>'ProcessDate',''))::timestamptz)::int as mes,
  data->>'ProcessType'                                            as process_type,
  case when data->>'ProcessType' in ('Ocean Import','Air Import','Ocean Export','Air Export')
       then data->>'ProcessType' else 'Others & Road' end         as modalidade,
  data->>'CustomerName'                                           as customer_name,
  data->>'AgentName'                                              as agent_name,
  coalesce((nullif(data->>'QtyTEU',''))::numeric, 0)              as teu,
  coalesce((nullif(data->>'ShipmentProfitInvoiceNetProfit',''))::numeric, 0) as gp2
from raw.shipment_process
where data->>'ProcessDate' is not null
  and data->>'Status' <> 'Canceled'
  and (data->>'ProcessID') not ilike '%CONS%';

create view mart.desempenho_totais as
select ano, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(teu))::int as teu, round(sum(gp2), 2) as gp2
from mart.desempenho_base group by 1;

create view mart.desempenho_mensal as
select ano, mes, count(*)::int as processos, round(sum(teu))::int as teu
from mart.desempenho_base group by 1, 2;

create view mart.desempenho_modalidade as
select ano, modalidade, count(*)::int as processos
from mart.desempenho_base group by 1, 2;

create view mart.desempenho_cliente as
select ano, customer_name, count(*)::int as processos
from mart.desempenho_base
where customer_name is not null and customer_name <> ''
group by 1, 2;

create view mart.desempenho_agente as
select ano, agent_name, count(*)::int as processos,
       round(sum(gp2), 2) as gp2,
       round(sum(gp2) / nullif(count(*), 0), 2) as ticket_medio
from mart.desempenho_base
where agent_name is not null and agent_name <> ''
group by 1, 2;

create view mart.desempenho_agente_mensal as
select ano, mes, agent_name, count(*)::int as processos
from mart.desempenho_base
where agent_name is not null and agent_name <> ''
group by 1, 2, 3;

grant select on mart.desempenho_totais, mart.desempenho_mensal, mart.desempenho_modalidade,
  mart.desempenho_cliente, mart.desempenho_agente, mart.desempenho_agente_mensal to authenticated;
