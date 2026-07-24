-- M1 — Comercial: nome canônico de cliente na base.
--
-- Terceira tela com o mesmo problema: o ranking "Ranking de Clientes" (aba Customer)
-- listava "Sherwin-Williams" e "SHERWIN-WILLIAMS" como duas linhas, e a contagem de
-- clientes por vendedor (aba Vendedor) contava a mesma empresa duas vezes. Já resolvido
-- no Financeiro (mart.cliente_canonico) e no Desempenho; falta o Comercial.
--
-- comercial_detalhe e comercial_semana leem direto do raw e NÃO dependem desta base,
-- então o cascade abaixo não as toca.

drop view if exists mart.comercial_customer;
drop view if exists mart.comercial_vendedor;
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
  coalesce(cc.customer_name, btrim(p.data->>'CustomerName'))    as customer_name,
  p.data->>'SalesPerson'                                        as sales_person,
  coalesce((nullif(pp.data->>'TotalSalesProposal',''))::numeric, 0) as revenue,
  coalesce((nullif(p.data->>'ForecastNetProfit',''))::numeric, 0)   as profit_previsto
from raw.shipment_process p
left join raw.shipment_profit_proposal pp
  on (pp.data->>'ProcessOID')::uuid = p.oid
left join mart.cliente_canonico cc
  on cc.chave = upper(btrim(p.data->>'CustomerName'))
where p.data->>'ProcessDate' is not null
  and p.data->>'Status' <> 'Canceled'
  and (p.data->>'ProcessID') not ilike '%CONS%';

create view mart.comercial_mensal as
select ano, mes, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(revenue), 2) as revenue, round(sum(profit_previsto), 2) as profit_previsto
from mart.comercial_base group by ano, mes;

create view mart.comercial_totais as
select ano, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(revenue), 2) as revenue, round(sum(profit_previsto), 2) as profit_previsto
from mart.comercial_base group by ano;

create view mart.comercial_vendedor as
select ano, coalesce(nullif(sales_person, ''), '—') as sales_person,
       count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(revenue), 2) as revenue, round(sum(profit_previsto), 2) as profit_previsto,
       round(sum(revenue) / nullif(count(*), 0), 2) as ticket_medio
from mart.comercial_base
group by ano, coalesce(nullif(sales_person, ''), '—');

create view mart.comercial_customer as
select ano, customer_name, count(*)::int as processos,
       round(sum(revenue), 2) as revenue, round(sum(profit_previsto), 2) as profit_previsto,
       round(sum(revenue) / nullif(count(*), 0), 2) as ticket_medio
from mart.comercial_base
where customer_name is not null and customer_name <> ''
group by ano, customer_name;

grant select on mart.comercial_base, mart.comercial_mensal, mart.comercial_totais,
  mart.comercial_vendedor, mart.comercial_customer to authenticated;
