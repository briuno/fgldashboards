-- M1 — Financeiro v2: cobertura de dados explícita + coerência com o Desempenho.
--
-- Motivação (auditoria 2026-07-20):
--  1. GP1 (ShipmentProfitInvoiceNetProfitNoExchVariation) só existia em 2026 — nos demais
--     anos a tela mostrava "0" como se fosse valor real. Agora a base expõe `tem_gp1` e as
--     agregações devolvem a contagem de cobertura, para a UI distinguir "zero" de "sem dado".
--  2. Idem para a proposta (GP2/Revenue): 2021 tinha 0% e 2022 82% de cobertura.
--  3. "Modalidade" no Financeiro usava ProcessType cru (dezenas de valores), enquanto o
--     Desempenho agrupa nos 5 baldes de mart.desempenho_base. Agora ambos usam o mesmo.

drop function if exists mart.financeiro_mensal_filtrado(int, text, text);
drop function if exists mart.financeiro_totais_filtrado(int, text, text);
drop view if exists mart.financeiro_totais;
drop view if exists mart.financeiro_mensal;
drop view if exists mart.financeiro_clientes;
drop view if exists mart.financeiro_tipos;
drop view if exists mart.financeiro_base cascade;

create view mart.financeiro_base as
select
  p.oid,
  p.data->>'ProcessID'                                         as process_id,
  (nullif(p.data->>'ProcessDate',''))::timestamptz             as process_date,
  extract(year  from (nullif(p.data->>'ProcessDate',''))::timestamptz
                     at time zone 'America/Sao_Paulo')::int    as ano,
  extract(month from (nullif(p.data->>'ProcessDate',''))::timestamptz
                     at time zone 'America/Sao_Paulo')::int    as mes,
  p.data->>'ProcessType'                                       as process_type,
  -- mesmos 5 baldes de mart.desempenho_base (coerência entre as telas)
  case when p.data->>'ProcessType' in ('Ocean Import','Air Import','Ocean Export','Air Export')
       then p.data->>'ProcessType' else 'Others & Road' end    as modalidade,
  p.data->>'CustomerName'                                      as customer_name,
  -- cobertura: a CHAVE existir no JSON distingue "lucro zero" de "campo não sincronizado"
  (p.data ? 'ShipmentProfitInvoiceNetProfitNoExchVariation')   as tem_gp1,
  (pp.oid is not null)                                         as tem_proposta,
  coalesce((nullif(p.data->>'ShipmentProfitInvoiceNetProfitNoExchVariation',''))::numeric, 0) as gp1,
  coalesce((nullif(pp.data->>'NetProfit',''))::numeric, 0)     as gp2,
  coalesce((nullif(pp.data->>'TotalSalesProposal',''))::numeric, 0) as revenue
from raw.shipment_process p
left join raw.shipment_profit_proposal pp
  on (pp.data->>'ProcessOID')::uuid = p.oid
where p.data->>'ProcessDate' is not null
  and p.data->>'Status' <> 'Canceled'
  and (p.data->>'ProcessID') not ilike '%CONS%';

create view mart.financeiro_totais as
select ano, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       count(*) filter (where tem_gp1)::int      as com_gp1,
       count(*) filter (where tem_proposta)::int as com_proposta,
       round(sum(gp1), 2) as gp1, round(sum(gp2), 2) as gp2, round(sum(revenue), 2) as revenue
from mart.financeiro_base group by 1;

create view mart.financeiro_mensal as
select ano, mes, count(*)::int as processos, count(distinct customer_name)::int as clientes,
       count(*) filter (where tem_gp1)::int      as com_gp1,
       count(*) filter (where tem_proposta)::int as com_proposta,
       round(sum(gp1), 2) as gp1, round(sum(gp2), 2) as gp2, round(sum(revenue), 2) as revenue
from mart.financeiro_base group by 1, 2;

-- Agregações filtradas (RPC): PostgREST corta em 1000 linhas, então agrega no servidor.
create function mart.financeiro_mensal_filtrado(p_ano int, p_cliente text default null, p_modalidade text default null)
returns table (ano int, mes int, processos int, clientes int, com_gp1 int, com_proposta int,
               gp1 numeric, gp2 numeric, revenue numeric)
language sql stable
as $$
  select b.ano, b.mes, count(*)::int, count(distinct b.customer_name)::int,
         count(*) filter (where b.tem_gp1)::int, count(*) filter (where b.tem_proposta)::int,
         round(sum(b.gp1), 2), round(sum(b.gp2), 2), round(sum(b.revenue), 2)
  from mart.financeiro_base b
  where b.ano in (p_ano - 1, p_ano)
    and (p_cliente is null or b.customer_name = p_cliente)
    and (p_modalidade is null or b.modalidade = p_modalidade)
  group by 1, 2
$$;

create function mart.financeiro_totais_filtrado(p_ano int, p_cliente text default null, p_modalidade text default null)
returns table (ano int, processos int, clientes int, com_gp1 int, com_proposta int,
               gp1 numeric, gp2 numeric, revenue numeric)
language sql stable
as $$
  select b.ano, count(*)::int, count(distinct b.customer_name)::int,
         count(*) filter (where b.tem_gp1)::int, count(*) filter (where b.tem_proposta)::int,
         round(sum(b.gp1), 2), round(sum(b.gp2), 2), round(sum(b.revenue), 2)
  from mart.financeiro_base b
  where b.ano in (p_ano - 1, p_ano)
    and (p_cliente is null or b.customer_name = p_cliente)
    and (p_modalidade is null or b.modalidade = p_modalidade)
  group by 1
$$;

-- Ranking de clientes por GP2 (tela financeira ranqueia por lucro, não por volume),
-- já respeitando os filtros ativos.
create function mart.financeiro_clientes_top(p_ano int, p_cliente text default null,
                                             p_modalidade text default null, p_limit int default 5)
returns table (customer_name text, processos int, gp2 numeric, revenue numeric)
language sql stable
as $$
  select b.customer_name, count(*)::int, round(sum(b.gp2), 2), round(sum(b.revenue), 2)
  from mart.financeiro_base b
  where b.ano = p_ano
    and b.customer_name is not null and b.customer_name <> ''
    and (p_cliente is null or b.customer_name = p_cliente)
    and (p_modalidade is null or b.modalidade = p_modalidade)
  group by 1
  order by 3 desc nulls last
  limit greatest(p_limit, 1)
$$;

-- Participação por modalidade em GP2 (o donut da tela é financeiro).
create function mart.financeiro_modalidades(p_ano int, p_cliente text default null,
                                            p_modalidade text default null)
returns table (modalidade text, processos int, gp2 numeric)
language sql stable
as $$
  select b.modalidade, count(*)::int, round(sum(b.gp2), 2)
  from mart.financeiro_base b
  where b.ano = p_ano
    and (p_cliente is null or b.customer_name = p_cliente)
    and (p_modalidade is null or b.modalidade = p_modalidade)
  group by 1
  order by 3 desc nulls last
$$;

-- Opções dos dropdowns (lista completa do ano, independente do filtro ativo).
create view mart.financeiro_clientes as
select ano, customer_name, count(*)::int as processos, round(sum(gp2), 2) as gp2
from mart.financeiro_base
where customer_name is not null and customer_name <> ''
group by 1, 2;

create view mart.financeiro_tipos as
select ano, modalidade, count(*)::int as processos, round(sum(gp2), 2) as gp2
from mart.financeiro_base group by 1, 2;

grant select on mart.financeiro_base, mart.financeiro_totais, mart.financeiro_mensal,
  mart.financeiro_clientes, mart.financeiro_tipos to authenticated;
grant execute on function mart.financeiro_mensal_filtrado(int, text, text) to authenticated;
grant execute on function mart.financeiro_totais_filtrado(int, text, text) to authenticated;
grant execute on function mart.financeiro_clientes_top(int, text, text, int) to authenticated;
grant execute on function mart.financeiro_modalidades(int, text, text) to authenticated;
