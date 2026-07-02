-- M1 — Comercial: views semanais (leem direto do raw).
-- Semana de referência = coalesce(FirstCreatedOn, CreatedOn) (regra do Power BI).
-- Convertido = Status <> 'Canceled'; Cancelado = Status = 'Canceled'.

drop view if exists mart.comercial_semana;
drop view if exists mart.comercial_detalhe;

create view mart.comercial_detalhe as
with base as (
  select
    data->>'ProcessID'                                  as process_id,
    data->>'SalesPerson'                                as sales_person,
    data->>'ProcessType'                                as process_type,
    data->>'CustomerName'                               as customer_name,
    data->>'Status'                                     as status,
    (data->>'Status' = 'Canceled')                      as is_cancelado,
    coalesce((nullif(data->>'ForecastGrossProfit',''))::numeric, 0) as forecast_gross,
    coalesce((nullif(data->>'FirstCreatedOn',''))::timestamptz,
             (nullif(data->>'CreatedOn',''))::timestamptz)          as ref_date
  from raw.shipment_process
  -- filtro "todas as páginas" do Power BI: exclui processos de consolidação (CONS)
  where (data->>'ProcessID') not ilike '%CONS%'
)
select
  process_id,
  ref_date,
  -- Power BI usa semana começando no DOMINGO; o +1 dia alinha domingo à segunda-ISO.
  extract(isoyear from ref_date + interval '1 day')::int as ano,
  extract(week    from ref_date + interval '1 day')::int as semana,
  sales_person,
  process_type,
  customer_name,
  status,
  is_cancelado,
  forecast_gross
from base
where ref_date is not null;

create view mart.comercial_semana as
select
  ano,
  semana,
  count(*) filter (where not is_cancelado)::int as convertidos,
  count(*) filter (where is_cancelado)::int     as cancelados,
  round(sum(forecast_gross) filter (where not is_cancelado), 2) as profit_previsto
from mart.comercial_detalhe
group by 1, 2;

grant select on mart.comercial_semana, mart.comercial_detalhe to authenticated;
