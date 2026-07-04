-- M2 — Aba Semanal: passa a usar ForecastNetProfit (net) como "Profit Previsto",
-- consistente com o resto do Comercial. Mantém forecast_gross para referência.

drop view if exists mart.comercial_semana;
drop view if exists mart.comercial_detalhe;

create view mart.comercial_detalhe as
with base as (
  select
    data->>'ProcessID'                                  as process_id,
    data->>'SalesPerson'                                as sales_person,
    data->>'CustomerService'                            as customer_service,
    data->>'AgentName'                                  as agent_name,
    (nullif(data->>'CreatedOn',''))::timestamptz        as created_on,
    data->>'ProcessType'                                as process_type,
    data->>'CustomerName'                               as customer_name,
    data->>'Status'                                     as status,
    (data->>'Status' = 'Canceled')                      as is_cancelado,
    coalesce((nullif(data->>'ForecastGrossProfit',''))::numeric, 0) as forecast_gross,
    coalesce((nullif(data->>'ForecastNetProfit',''))::numeric, 0)   as forecast_net,
    coalesce((nullif(data->>'FirstCreatedOn',''))::timestamptz,
             (nullif(data->>'CreatedOn',''))::timestamptz)          as ref_date
  from raw.shipment_process
  where (data->>'ProcessID') not ilike '%CONS%'
)
select
  process_id,
  ref_date,
  extract(isoyear from ref_date + interval '1 day')::int as ano,
  extract(week    from ref_date + interval '1 day')::int as semana,
  extract(isoyear from created_on + interval '1 day')::int as ano_criacao,
  extract(week    from created_on + interval '1 day')::int as semana_criacao,
  sales_person, customer_service, agent_name, created_on, process_type,
  customer_name, status, is_cancelado, forecast_gross, forecast_net
from base
where ref_date is not null;

create view mart.comercial_semana as
select
  ano, semana,
  count(*) filter (where not is_cancelado)::int as convertidos,
  count(*) filter (where is_cancelado)::int     as cancelados,
  round(sum(forecast_net) filter (where not is_cancelado), 2) as profit_previsto
from mart.comercial_detalhe
group by 1, 2;

grant select on mart.comercial_semana, mart.comercial_detalhe to authenticated;
