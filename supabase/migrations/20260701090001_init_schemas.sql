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
