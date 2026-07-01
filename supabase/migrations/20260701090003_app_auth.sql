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
