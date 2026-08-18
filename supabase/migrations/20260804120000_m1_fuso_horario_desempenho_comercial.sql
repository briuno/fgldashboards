-- M1 — Fuso horário: Desempenho e Comercial/Semanal ainda extraíam ano/mês/semana no
-- fuso da sessão do Postgres (UTC), não em America/Sao_Paulo como o resto do app.
--
-- O mesmo defeito já tinha sido corrigido em financeiro_base, comercial_base e
-- propostas_base (todas usam "at time zone 'America/Sao_Paulo'" explícito) — só não
-- tinha chegado a desempenho_base nem a comercial_detalhe/comercial_semana. Processos
-- datados/criados entre 21h e 23h59 (horário de SP) caem no dia seguinte em UTC e,
-- portanto, no mês/semana/ano seguinte nessas duas views.

-- ---------------------------------------------------------------------------
-- mart.desempenho_base (e toda a cadeia de views que dependem dela)
-- ---------------------------------------------------------------------------

drop view if exists mart.desempenho_totais_modal;
drop view if exists mart.desempenho_mensal_modal;
drop view if exists mart.desempenho_cliente_modal;
drop view if exists mart.desempenho_agente_modal;
drop view if exists mart.desempenho_agente_mensal_modal;
drop view if exists mart.desempenho_totais;
drop view if exists mart.desempenho_mensal;
drop view if exists mart.desempenho_modalidade;
drop view if exists mart.desempenho_cliente;
drop view if exists mart.desempenho_agente;
drop view if exists mart.desempenho_agente_mensal;
drop view if exists mart.desempenho_base cascade;

create view mart.desempenho_base as
select
  p.data->>'ProcessID'                                            as process_id,
  (nullif(p.data->>'ProcessDate',''))::timestamptz                as process_date,
  extract(year  from (nullif(p.data->>'ProcessDate',''))::timestamptz
                     at time zone 'America/Sao_Paulo')::int        as ano,
  extract(month from (nullif(p.data->>'ProcessDate',''))::timestamptz
                     at time zone 'America/Sao_Paulo')::int        as mes,
  p.data->>'ProcessType'                                          as process_type,
  case when p.data->>'ProcessType' in ('Ocean Import','Air Import','Ocean Export','Air Export')
       then p.data->>'ProcessType' else 'Others & Road' end       as modalidade,
  coalesce(cc.customer_name, btrim(p.data->>'CustomerName'))      as customer_name,
  p.data->>'AgentName'                                            as agent_name,
  coalesce((nullif(p.data->>'QtyTEU',''))::numeric, 0)            as teu,
  coalesce((nullif(p.data->>'ShipmentProfitInvoiceNetProfit',''))::numeric, 0) as gp2
from raw.shipment_process p
left join mart.cliente_canonico cc
  on cc.chave = upper(btrim(p.data->>'CustomerName'))
where p.data->>'ProcessDate' is not null
  and p.data->>'Status' <> 'Canceled'
  and (p.data->>'ProcessID') not ilike '%CONS%';

-- ---- visões gerais (todas as modalidades) ----
create view mart.desempenho_totais as
select ano, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(teu))::int as teu, round(sum(gp2), 2) as gp2
from mart.desempenho_base group by 1;

create view mart.desempenho_mensal as
select ano, mes, count(*)::int as processos, round(sum(teu))::int as teu
from mart.desempenho_base group by 1, 2;

create view mart.desempenho_modalidade as
select ano, modalidade, count(*)::int as processos
from mart.desempenho_base group by 1, 2;

create view mart.desempenho_cliente as
select ano, customer_name, count(*)::int as processos
from mart.desempenho_base
where customer_name is not null and customer_name <> ''
group by 1, 2;

create view mart.desempenho_agente as
select ano, agent_name, count(*)::int as processos,
       round(sum(gp2), 2) as gp2,
       round(sum(gp2) / nullif(count(*), 0), 2) as ticket_medio
from mart.desempenho_base
where agent_name is not null and agent_name <> ''
group by 1, 2;

create view mart.desempenho_agente_mensal as
select ano, mes, agent_name, count(*)::int as processos
from mart.desempenho_base
where agent_name is not null and agent_name <> ''
group by 1, 2, 3;

-- ---- visões por modalidade ----
create view mart.desempenho_totais_modal as
select ano, modalidade, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       round(sum(teu))::int as teu, round(sum(gp2), 2) as gp2
from mart.desempenho_base group by 1, 2;

create view mart.desempenho_mensal_modal as
select ano, modalidade, mes, count(*)::int as processos, round(sum(teu))::int as teu
from mart.desempenho_base group by 1, 2, 3;

create view mart.desempenho_cliente_modal as
select ano, modalidade, customer_name, count(*)::int as processos
from mart.desempenho_base
where customer_name is not null and customer_name <> ''
group by 1, 2, 3;

create view mart.desempenho_agente_modal as
select ano, modalidade, agent_name, count(*)::int as processos,
       round(sum(gp2), 2) as gp2,
       round(sum(gp2) / nullif(count(*), 0), 2) as ticket_medio
from mart.desempenho_base
where agent_name is not null and agent_name <> ''
group by 1, 2, 3;

create view mart.desempenho_agente_mensal_modal as
select ano, modalidade, mes, agent_name, count(*)::int as processos
from mart.desempenho_base
where agent_name is not null and agent_name <> ''
group by 1, 2, 3, 4;

-- Totais até um mês de corte: permite comparar o ano anterior na MESMA janela de meses
-- do ano corrente. `clientes` é distinct, então não pode ser somado mês a mês no app.
create or replace function mart.desempenho_totais_periodo(
  p_ano int, p_modalidade text, p_ate_mes int default 12)
returns table (ano int, processos int, clientes int, teu int, gp2 numeric)
language sql stable
as $$
  select b.ano, count(*)::int, count(distinct b.customer_name)::int,
         round(sum(b.teu))::int, round(sum(b.gp2), 2)
  from mart.desempenho_base b
  where b.ano = p_ano
    and (p_modalidade is null or b.modalidade = p_modalidade)
    and b.mes <= p_ate_mes
  group by b.ano
$$;

grant select on mart.desempenho_base, mart.desempenho_totais, mart.desempenho_mensal,
  mart.desempenho_modalidade, mart.desempenho_cliente, mart.desempenho_agente,
  mart.desempenho_agente_mensal, mart.desempenho_totais_modal, mart.desempenho_mensal_modal,
  mart.desempenho_cliente_modal, mart.desempenho_agente_modal,
  mart.desempenho_agente_mensal_modal to authenticated;
grant execute on function mart.desempenho_totais_periodo(int, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- mart.comercial_detalhe / mart.comercial_semana
-- ---------------------------------------------------------------------------

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
  extract(isoyear from (ref_date at time zone 'America/Sao_Paulo') + interval '1 day')::int    as ano,
  extract(week    from (ref_date at time zone 'America/Sao_Paulo') + interval '1 day')::int    as semana,
  extract(isoyear from (created_on at time zone 'America/Sao_Paulo') + interval '1 day')::int  as ano_criacao,
  extract(week    from (created_on at time zone 'America/Sao_Paulo') + interval '1 day')::int  as semana_criacao,
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
