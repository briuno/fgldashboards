-- M1 — Transformação raw -> core (fato de processo) -> mart (KPIs que o app lê).
-- Views (dados leves ~22k); trocar por matview se crescer.

create or replace view core.fact_process as
select
  oid                                                as process_oid,
  data->>'ProcessID'                                 as process_id,
  (nullif(data->>'ProcessDate',''))::timestamptz     as process_date,
  (nullif(data->>'ShipmentUpdateOn',''))::timestamptz as updated_on,
  (nullif(data->>'CustomerOID',''))::uuid            as customer_oid,
  data->>'CustomerName'                              as customer_name,
  data->>'SalesPerson'                               as sales_person,
  data->>'ProcessType'                               as process_type,
  data->>'ShipmentExpoImpo'                          as expo_impo,
  (nullif(data->>'QtyTEU',''))::numeric              as teu,
  data->>'Status'                                    as status,
  (nullif(data->>'ShipmentProfitInvoiceNetProfit',''))::numeric   as net_profit,
  (nullif(data->>'ShipmentProfitInvoiceGrossProfit',''))::numeric as gross_profit
from raw.shipment_process;

-- KPIs mensais (Visão Executiva)
create or replace view mart.kpi_monthly as
select
  date_trunc('month', process_date)::date as month,
  count(*)                                 as processos,
  sum(coalesce(net_profit, 0))             as lucro_liquido,
  sum(coalesce(gross_profit, 0))           as lucro_bruto,
  sum(coalesce(teu, 0))                    as teu
from core.fact_process
where process_date is not null
group by 1;

-- Top clientes por lucro
create or replace view mart.profit_by_client as
select
  customer_name,
  count(*)                        as processos,
  sum(coalesce(net_profit, 0))    as lucro_liquido
from core.fact_process
where customer_name is not null and customer_name <> ''
group by 1;

-- Resumo por vendedor
create or replace view mart.profit_by_salesperson as
select
  sales_person,
  count(*)                        as processos,
  sum(coalesce(net_profit, 0))    as lucro_liquido
from core.fact_process
where sales_person is not null and sales_person <> ''
group by 1;
