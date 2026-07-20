-- M1 — nome canônico de cliente.
--
-- O Tier2 grava o mesmo cliente com grafias diferentes ("Sherwin-Williams Do Brasil…"
-- com 103 processos e "SHERWIN-WILLIAMS DO BRASIL…" com 19), e às vezes com espaço
-- sobrando no fim. Consequências no Financeiro: o dropdown listava a mesma empresa duas
-- vezes, o Top 5 dividia o cliente em dois e a contagem de clientes inflava.
--
-- Prova: 2025 jan-out dava 159 clientes; normalizando dá 156 — o número exato do Power BI.
--
-- Estratégia: agrupar por UPPER(BTRIM(nome)) e exibir a grafia mais frequente (mode),
-- para a tela não virar caixa-alta.

create or replace view mart.cliente_canonico as
select upper(btrim(data->>'CustomerName'))                            as chave,
       mode() within group (order by btrim(data->>'CustomerName'))    as customer_name
from raw.shipment_process
where nullif(btrim(data->>'CustomerName'), '') is not null
group by 1;

grant select on mart.cliente_canonico to authenticated;

-- Recria a base do Financeiro usando o nome canônico (as demais views dependem dela).
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
  coalesce(cc.customer_name, btrim(p.data->>'CustomerName'))   as customer_name,
  -- cobertura: a CHAVE existir no JSON distingue "lucro zero" de "campo não sincronizado"
  (p.data ? 'ShipmentProfitInvoiceNetProfitNoExchVariation')   as tem_gp1,
  (pp.oid is not null)                                         as tem_proposta,
  coalesce((nullif(p.data->>'ShipmentProfitInvoiceNetProfitNoExchVariation',''))::numeric, 0) as gp1,
  coalesce((nullif(pp.data->>'NetProfit',''))::numeric, 0)     as gp2,
  coalesce((nullif(pp.data->>'TotalSalesProposal',''))::numeric, 0) as revenue
from raw.shipment_process p
left join raw.shipment_profit_proposal pp
  on (pp.data->>'ProcessOID')::uuid = p.oid
left join mart.cliente_canonico cc
  on cc.chave = upper(btrim(p.data->>'CustomerName'))
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
