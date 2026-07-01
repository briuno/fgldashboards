-- ===========================================================================
-- FGL Dashboards — Setup completo do banco (M0)
-- Cole TUDO no Supabase SQL Editor e clique RUN. Idempotente (pode repetir).
-- Projeto: ifjpzyqjdagnxygbkwpm
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 20260701090001_init_schemas.sql
-- ---------------------------------------------------------------------------
-- Schemas base do projeto FGL Dashboards (arquitetura em camadas)
create schema if not exists raw;    -- aterrissagem 1:1 com a API do Tier2 (JSON bruto)
create schema if not exists core;   -- modelo dimensional limpo (star schema)
create schema if not exists mart;   -- views / materialized views de KPI (o app lê daqui)
create schema if not exists etl;    -- estado, fila e logs da ingestao
create schema if not exists app;    -- perfis e papeis de usuarios

comment on schema raw is 'Dados brutos do Tier2 (JSON), uma tabela por entidade.';
comment on schema core is 'Modelo dimensional limpo (dimensoes e fatos).';
comment on schema mart is 'Views/materialized views de KPI consumidas pelo app.';
comment on schema etl is 'Estado, fila e logs da ingestao (Tier2 -> Supabase).';
comment on schema app is 'Perfis e papeis de usuarios da aplicacao.';

-- ---------------------------------------------------------------------------
-- 20260701090002_etl.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 20260701090003_app_auth.sql
-- ---------------------------------------------------------------------------
-- Papeis da aplicacao
do $$
begin
  create type app.app_role as enum ('director','manager','sales','finance','ops','viewer');
exception
  when duplicate_object then null;
end
$$;

-- Perfis (1:1 com auth.users)
create table if not exists app.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  office_key bigint,                      -- ligacao futura com core.dim_office
  created_at timestamptz not null default now()
);

create table if not exists app.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role    app.app_role not null,
  primary key (user_id, role)
);

-- Cria um profile automaticamente quando um usuario e criado
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into app.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- RLS: cada usuario enxerga apenas o proprio profile/roles (Fase 1)
alter table app.profiles   enable row level security;
alter table app.user_roles enable row level security;

drop policy if exists "profiles_select_own" on app.profiles;
create policy "profiles_select_own" on app.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on app.profiles;
create policy "profiles_update_own" on app.profiles
  for update to authenticated using (id = (select auth.uid()));

drop policy if exists "user_roles_select_own" on app.user_roles;
create policy "user_roles_select_own" on app.user_roles
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 20260701090004_core_dim_date.sql
-- ---------------------------------------------------------------------------
-- Dimensao de datas (independente do Tier2) para os graficos por periodo
create table if not exists core.dim_date (
  date_key   date primary key,
  year       int  not null,
  quarter    int  not null,
  month      int  not null,
  month_name text not null,
  week       int  not null,
  day        int  not null,
  dow        int  not null,        -- 1=segunda ... 7=domingo (isodow)
  is_weekend boolean not null
);

insert into core.dim_date (date_key, year, quarter, month, month_name, week, day, dow, is_weekend)
select
  d::date,
  extract(year    from d)::int,
  extract(quarter from d)::int,
  extract(month   from d)::int,
  to_char(d, 'TMMonth'),
  extract(week    from d)::int,
  extract(day     from d)::int,
  extract(isodow  from d)::int,
  extract(isodow  from d)::int in (6, 7)
from generate_series('2018-01-01'::date, '2030-12-31'::date, interval '1 day') as g(d)
on conflict (date_key) do nothing;

