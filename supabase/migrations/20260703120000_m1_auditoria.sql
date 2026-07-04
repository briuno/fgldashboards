-- M1 — Auditoria da sincronizacao Tier2.
-- Fecha o ciclo: a Edge Function tier2-sync passa a gravar cada execucao em
-- etl.sync_log (ver funcao), e estas views em mart expoem a saude da sync ao app
-- (mesmo padrao .schema('mart') + grant to authenticated das demais views).

-- 1) Campos extras no log de execucao
alter table etl.sync_log add column if not exists rows_lost int not null default 0;
alter table etl.sync_log add column if not exists details  jsonb;

-- 2) Execucoes recentes (auditoria por run) — ordenar/limitar fica na query
create or replace view mart.sync_runs as
select
  id,
  entity,
  mode,
  started_at,
  finished_at,
  extract(epoch from (coalesce(finished_at, now()) - started_at))::int as duration_s,
  coalesce(rows_upserted, 0) as rows_upserted,
  coalesce(rows_lost, 0)     as rows_lost,
  http_status,
  status,
  error
from etl.sync_log;

-- 3) Saude atual por entidade (base do badge e dos cards).
-- Cobre entidades vindas de sync_state OU do log, e usa o ultimo sucesso do log
-- (fallback para sync_state.last_success_at enquanto o log ainda esta vazio).
create or replace view mart.sync_health as
with ents as (
  select entity from etl.sync_state
  union
  select distinct entity from etl.sync_log
),
last_run as (
  select distinct on (entity)
    entity, mode, status, started_at, finished_at,
    coalesce(rows_upserted, 0) as rows_upserted,
    coalesce(rows_lost, 0)     as rows_lost,
    error
  from etl.sync_log
  order by entity, started_at desc
),
last_ok as (
  select entity, max(finished_at) as last_success_at
  from etl.sync_log
  where status = 'success'
  group by entity
)
select
  e.entity,
  st.high_water_mark,
  coalesce(lo.last_success_at, st.last_success_at) as last_success_at,
  lr.status        as last_status,
  lr.mode          as last_mode,
  lr.started_at    as last_run_at,
  lr.finished_at   as last_finished_at,
  lr.rows_upserted as last_rows_upserted,
  lr.rows_lost     as last_rows_lost,
  lr.error         as last_error,
  round(
    (extract(epoch from (now() - coalesce(lo.last_success_at, st.last_success_at))) / 3600.0)::numeric,
    1
  ) as hours_since_success,
  (
    coalesce(lo.last_success_at, st.last_success_at) is null
    or now() - coalesce(lo.last_success_at, st.last_success_at) > interval '26 hours'
  ) as is_stale,
  (lr.mode = 'delta' and lr.rows_upserted = 0) as zeroed
from ents e
left join last_run       lr on lr.entity = e.entity
left join last_ok        lo on lo.entity = e.entity
left join etl.sync_state st on st.entity = e.entity;

-- 4) Linhas atualizadas por dia (ultimos 30d) — dias "zerados" saltam a vista.
create or replace view mart.rows_synced_daily as
select
  synced_at::date as dia,
  count(*)::int   as linhas
from raw.shipment_process
where synced_at >= (current_date - interval '29 days')
group by 1
order by 1;

-- 5) Frescor dos dados + reconciliacao raw x mart (uma linha).
create or replace view mart.data_freshness as
select
  (select max(synced_at) from raw.shipment_process)                                       as ultima_atualizacao,
  (select count(*) from raw.shipment_process where synced_at::date = current_date)::bigint as linhas_hoje,
  (select count(*) from raw.shipment_process)::bigint                                      as raw_count,
  (select processos_total from mart.kpi_totals)                                            as mart_processos,
  (select high_water_mark from etl.sync_state where entity = 'ShipmentProcessView')        as high_water_mark;

grant select on mart.sync_runs, mart.sync_health, mart.rows_synced_daily, mart.data_freshness to authenticated;
