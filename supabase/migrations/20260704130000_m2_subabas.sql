-- M2 — Sub-abas: views de apoio para Comercial (vendedor/customer) e
-- Desempenho por modalidade (Impo/Expo Marítimo/Aéreo e Rodoviário).

-- ── Comercial: recria a base com sales_person + views por vendedor/cliente ──
drop view if exists mart.comercial_vendedor;
drop view if exists mart.comercial_customer;
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
  p.data->>'SalesPerson'                                        as sales_person,
  coalesce((nullif(pp.data->>'TotalSalesProposal',''))::numeric, 0) as revenue,
  coalesce((nullif(p.data->>'ForecastNetProfit',''))::numeric, 0)   as profit_previsto
from raw.shipment_process p
left join raw.shipment_profit_proposal pp
  on (pp.data->>'ProcessOID')::uuid = p.oid
where p.data->>'ProcessDate' is not null
  and p.data->>'Status' <> 'Canceled'
  and (p.data->>'ProcessID') not ilike '%CONS%';

create view mart.comercial_mensal as
select ano, mes, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(revenue), 2) as revenue, round(sum(profit_previsto), 2) as profit_previsto
from mart.comercial_base group by 1, 2;

create view mart.comercial_totais as
select ano, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(revenue), 2) as revenue, round(sum(profit_previsto), 2) as profit_previsto
from mart.comercial_base group by 1;

create view mart.comercial_vendedor as
select ano, coalesce(nullif(sales_person, ''), '—') as sales_person,
       count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(revenue), 2) as revenue, round(sum(profit_previsto), 2) as profit_previsto,
       round(sum(revenue) / nullif(count(*), 0), 2) as ticket_medio
from mart.comercial_base group by 1, 2;

create view mart.comercial_customer as
select ano, customer_name,
       count(*)::int as processos,
       round(sum(revenue), 2) as revenue, round(sum(profit_previsto), 2) as profit_previsto,
       round(sum(revenue) / nullif(count(*), 0), 2) as ticket_medio
from mart.comercial_base
where customer_name is not null and customer_name <> ''
group by 1, 2;

-- ── Desempenho por modalidade (modalidade já existe em desempenho_base) ──
create or replace view mart.desempenho_totais_modal as
select ano, modalidade, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(teu))::int as teu, round(sum(gp2), 2) as gp2
from mart.desempenho_base group by 1, 2;

create or replace view mart.desempenho_mensal_modal as
select ano, modalidade, mes, count(*)::int as processos, round(sum(teu))::int as teu
from mart.desempenho_base group by 1, 2, 3;

create or replace view mart.desempenho_agente_modal as
select ano, modalidade, agent_name, count(*)::int as processos,
       round(sum(gp2), 2) as gp2, round(sum(gp2) / nullif(count(*), 0), 2) as ticket_medio
from mart.desempenho_base
where agent_name is not null and agent_name <> ''
group by 1, 2, 3;

create or replace view mart.desempenho_cliente_modal as
select ano, modalidade, customer_name, count(*)::int as processos
from mart.desempenho_base
where customer_name is not null and customer_name <> ''
group by 1, 2, 3;

create or replace view mart.desempenho_agente_mensal_modal as
select ano, modalidade, mes, agent_name, count(*)::int as processos
from mart.desempenho_base
where agent_name is not null and agent_name <> ''
group by 1, 2, 3, 4;

grant select on
  mart.comercial_base, mart.comercial_mensal, mart.comercial_totais,
  mart.comercial_vendedor, mart.comercial_customer,
  mart.desempenho_totais_modal, mart.desempenho_mensal_modal, mart.desempenho_agente_modal,
  mart.desempenho_cliente_modal, mart.desempenho_agente_mensal_modal
to authenticated;
