-- Estado da sincronizacao por entidade
create table if not exists etl.sync_state (
  entity           text primary key,
  mode             text not null default 'full' check (mode in ('full','delta')),
  high_water_mark  timestamptz,               -- maior "modificado em" ja processado
  delta_cursor     text,                      -- cursor/deltaLink da API, se houver
  page_size        int not null default 500,
  last_success_at  timestamptz,
  updated_at       timestamptz not null default now()
);

-- Fila de tarefas de ingestao (backfill/delta resumivel e idempotente)
create table if not exists etl.sync_queue (
  id           bigint generated always as identity primary key,
  entity       text not null,
  mode         text not null default 'delta',
  cursor       text,                          -- proximo nextLink / offset
  status       text not null default 'pending' check (status in ('pending','running','done','error')),
  retry_count  int  not null default 0,
  enqueued_at  timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz,
  error        text
);
create index if not exists sync_queue_status_idx on etl.sync_queue (status, enqueued_at);

-- Log por execucao (auditoria + base do badge "ultima atualizacao")
create table if not exists etl.sync_log (
  id            bigint generated always as identity primary key,
  entity        text not null,
  mode          text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  pages         int default 0,
  rows_upserted int default 0,
  http_status   int,
  status        text not null default 'running' check (status in ('running','success','error')),
  error         text
);
create index if not exists sync_log_started_idx on etl.sync_log (started_at desc);

-- Conveniencia: ultima sincronizacao bem-sucedida por entidade
create or replace view etl.last_success as
select entity, max(finished_at) as last_success_at
from etl.sync_log
where status = 'success'
group by entity;
