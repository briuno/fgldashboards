-- M2 — Profit Map: matriz Payable × Receivable por processo → cliente → item → parceiro.
--
-- Fonte: OData `InvoiceProposalProfitMapView` (grão = item de fatura/proposta). Cada linha
-- é um lançamento de custo (Payable) ou receita (Receivable) de um processo, com moeda,
-- taxa de câmbio, valor em BRL, valor liquidado e data da última liquidação.
--
-- Mapa campo Tier2 → coluna da tela (validado no swagger de 2026-08-18):
--   ShipmentProcessID                   → Processo Embarque   (nível 1)
--   ShipmentBusinessPartner             → Cliente             (nível 2)
--   ItemsNamePT                         → Item                (nível 3)
--   BusinessPartnerName                 → Parceiro            (nível 4)
--   InvoiceProposalType                 → banda Payable/Receivable
--   InvoiceProposalAmount + CurrencyISOCode      → "Valor Original"
--   InvoiceProposalForecastExchangeRate          → "Taxa"
--   InvoiceProposalForecastAmountSys             → "Valor BRL"
--   InvoiceProposalSettlementAmount              → "Liquidado"
--   InvoiceLastSettlementDate                    → "Data Liquidação"
--
-- Profit% = Total BRL ÷ Receivable BRL. Conferido contra 4 linhas do relatório de
-- referência (10,33% · 15,60% · 7,43% · 77,86% batem exatamente) e é o mesmo que a API
-- expõe como `ProfitPctOverRevenue` em /api/ProfitMap.
--
-- ATENÇÃO — sinal do Payable: o relatório do Tier2 mostra custo como NEGATIVO
-- ("USD -6400,00"), e por isso Total = Payable + Receivable é uma soma simples. Esta
-- migration preserva o sinal que a API devolver, sem forçar abs(). Se o primeiro sync
-- trouxer Payable positivo, `total_brl` sai errado — conferir com a query de sanidade
-- no fim deste arquivo antes de liberar a tela.

-- ---------------------------------------------------------------------------
-- raw — aterrissagem
-- ---------------------------------------------------------------------------

create table if not exists raw.invoice_proposal_profit_map (
  oid       uuid primary key,
  data      jsonb not null,
  synced_at timestamptz not null default now()
);

-- Caminho quente da tela: abrir um processo carrega só as linhas dele.
create index if not exists invoice_proposal_profit_map_process_id_idx
  on raw.invoice_proposal_profit_map ((data->>'ShipmentProcessID'));
create index if not exists invoice_proposal_profit_map_process_oid_idx
  on raw.invoice_proposal_profit_map ((data->>'ShipmentProcessOID'));

-- NOTA de desempenho: o filtro por ano sai de ShipmentProcessDate convertido para
-- America/Sao_Paulo, e `at time zone` é STABLE — não dá para indexar a expressão. Em
-- ~1M de linhas a listagem de processos vira seq scan. Se doer, o próximo passo é uma
-- matview de mart.profitmap_processo_agg com refresh no fim do sync (não antes de medir).

-- ---------------------------------------------------------------------------
-- mart — base achatada
-- ---------------------------------------------------------------------------

drop function if exists mart.profitmap_processos(int, text, text, text, int, int);
drop function if exists mart.profitmap_totais(int, text, text, text);
drop function if exists mart.profitmap_detalhe(text);
drop view if exists mart.profitmap_clientes;
drop view if exists mart.profitmap_base cascade;

create view mart.profitmap_base as
select
  m.oid,
  m.data->>'ShipmentProcessID'                                      as process_id,
  (nullif(m.data->>'ShipmentProcessOID',''))::uuid                  as process_oid,
  (nullif(m.data->>'ShipmentProcessDate',''))::timestamptz          as process_date,
  extract(year  from (nullif(m.data->>'ShipmentProcessDate',''))::timestamptz
                     at time zone 'America/Sao_Paulo')::int          as ano,
  extract(month from (nullif(m.data->>'ShipmentProcessDate',''))::timestamptz
                     at time zone 'America/Sao_Paulo')::int          as mes,
  m.data->>'ShipmentProcessType'                                    as process_type,
  -- mesmos 5 baldes de mart.desempenho_base (coerência entre as telas)
  case when m.data->>'ShipmentProcessType' in ('Ocean Import','Air Import','Ocean Export','Air Export')
       then m.data->>'ShipmentProcessType' else 'Others & Road' end  as modalidade,
  -- nome canônico: o Tier2 grava a mesma empresa com grafias diferentes (ver
  -- 20260720160000_m1_cliente_canonico.sql), o que duplicaria linhas e dropdown.
  coalesce(cc.customer_name, btrim(m.data->>'ShipmentBusinessPartner')) as customer_name,
  btrim(m.data->>'ShipmentCompany')                                 as company,
  -- ItemsNamePT é o rótulo do relatório ("CAPATAZIAS", "Desconsolidação"); cai para o
  -- neutro quando o cadastro não tem tradução.
  coalesce(nullif(btrim(m.data->>'ItemsNamePT'), ''),
           nullif(btrim(m.data->>'ItemsName'), ''),
           '(sem item)')                                            as item_name,
  coalesce(nullif(btrim(m.data->>'BusinessPartnerName'), ''),
           '(sem parceiro)')                                        as partner_name,
  m.data->>'InvoiceProposalType'                                    as tipo,
  m.data->>'InvoiceProposalSourceType'                              as origem,
  nullif(btrim(m.data->>'CurrencyISOCode'), '')                     as moeda,
  coalesce((nullif(m.data->>'InvoiceProposalAmount',''))::numeric, 0)              as valor_original,
  (nullif(m.data->>'InvoiceProposalForecastExchangeRate',''))::numeric             as taxa,
  coalesce((nullif(m.data->>'InvoiceProposalForecastAmountSys',''))::numeric, 0)   as valor_brl,
  coalesce((nullif(m.data->>'InvoiceProposalSettlementAmount',''))::numeric, 0)    as liquidado,
  (nullif(m.data->>'InvoiceLastSettlementDate',''))::timestamptz    as data_liquidacao
from raw.invoice_proposal_profit_map m
-- LEFT JOIN (e não INNER): se o sync do ProfitMap correr à frente do de processos, a
-- linha continua aparecendo em vez de sumir sem aviso. Cancelado só é excluído quando
-- de fato sabemos que é cancelado.
left join raw.shipment_process p
  on p.oid = (nullif(m.data->>'ShipmentProcessOID',''))::uuid
left join mart.cliente_canonico cc
  on cc.chave = upper(btrim(m.data->>'ShipmentBusinessPartner'))
where m.data->>'ShipmentProcessDate' is not null
  and coalesce(p.data->>'Status', '') <> 'Canceled'
  and coalesce(m.data->>'ShipmentProcessID', '') not ilike '%CONS%';

-- ---------------------------------------------------------------------------
-- mart — agregações (RPC: PostgREST corta em 1000 linhas, então agrega no servidor)
-- ---------------------------------------------------------------------------

-- Nível 1 da matriz: uma linha por processo, com as bandas Payable/Receivable pivotadas.
create function mart.profitmap_processos(
  p_ano int,
  p_cliente text default null,
  p_modalidade text default null,
  p_busca text default null,
  p_limit int default 100,
  p_offset int default 0
)
-- Mesmo contrato de colunas de mart.profitmap_detalhe, para a tela usar um único
-- renderizador de linha nos 4 níveis da árvore.
returns table (
  process_id text, customer_name text, process_type text, modalidade text,
  process_date timestamptz,
  pay_moeda text, pay_valor_original numeric, pay_taxa numeric,
  pay_brl numeric, pay_liquidado numeric, pay_data_liq date,
  rec_moeda text, rec_valor_original numeric, rec_taxa numeric,
  rec_brl numeric, rec_liquidado numeric, rec_data_liq date,
  total_brl numeric, total_liquidado numeric, profit_pct numeric,
  linhas int
)
language sql stable
as $$
  select b.process_id,
         min(b.customer_name), min(b.process_type), min(b.modalidade), min(b.process_date),
         -- Payable
         case when count(distinct b.moeda) filter (where b.tipo = 'Payable') = 1
              then min(b.moeda) filter (where b.tipo = 'Payable') end,
         round(coalesce(sum(b.valor_original) filter (where b.tipo = 'Payable'), 0), 2),
         case when count(distinct b.taxa) filter (where b.tipo = 'Payable') = 1
              then min(b.taxa) filter (where b.tipo = 'Payable') end,
         round(coalesce(sum(b.valor_brl)  filter (where b.tipo = 'Payable'), 0), 2),
         round(coalesce(sum(b.liquidado)  filter (where b.tipo = 'Payable'), 0), 2),
         max((b.data_liquidacao at time zone 'America/Sao_Paulo')::date)
             filter (where b.tipo = 'Payable'),
         -- Receivable
         case when count(distinct b.moeda) filter (where b.tipo = 'Receivable') = 1
              then min(b.moeda) filter (where b.tipo = 'Receivable') end,
         round(coalesce(sum(b.valor_original) filter (where b.tipo = 'Receivable'), 0), 2),
         case when count(distinct b.taxa) filter (where b.tipo = 'Receivable') = 1
              then min(b.taxa) filter (where b.tipo = 'Receivable') end,
         round(coalesce(sum(b.valor_brl)  filter (where b.tipo = 'Receivable'), 0), 2),
         round(coalesce(sum(b.liquidado)  filter (where b.tipo = 'Receivable'), 0), 2),
         max((b.data_liquidacao at time zone 'America/Sao_Paulo')::date)
             filter (where b.tipo = 'Receivable'),
         -- Total
         round(sum(b.valor_brl), 2),
         round(sum(b.liquidado), 2),
         round(sum(b.valor_brl)
               / nullif(sum(b.valor_brl) filter (where b.tipo = 'Receivable'), 0) * 100, 2),
         count(*)::int
  from mart.profitmap_base b
  where b.ano = p_ano
    and (p_cliente is null    or b.customer_name = p_cliente)
    and (p_modalidade is null or b.modalidade = p_modalidade)
    and (p_busca is null      or b.process_id ilike '%' || p_busca || '%')
  group by 1
  -- ordem do relatório de referência: pelo ID do processo, não por lucro
  order by 1
  limit greatest(p_limit, 1) offset greatest(p_offset, 0)
$$;

-- Rodapé "Total": o mesmo recorte de filtros, sem o limit da paginação.
create function mart.profitmap_totais(
  p_ano int,
  p_cliente text default null,
  p_modalidade text default null,
  p_busca text default null
)
returns table (
  processos int, linhas int,
  pay_brl numeric, pay_liquidado numeric,
  rec_brl numeric, rec_liquidado numeric,
  total_brl numeric, total_liquidado numeric, profit_pct numeric
)
language sql stable
as $$
  select count(distinct b.process_id)::int, count(*)::int,
         round(coalesce(sum(b.valor_brl) filter (where b.tipo = 'Payable'), 0), 2),
         round(coalesce(sum(b.liquidado) filter (where b.tipo = 'Payable'), 0), 2),
         round(coalesce(sum(b.valor_brl) filter (where b.tipo = 'Receivable'), 0), 2),
         round(coalesce(sum(b.liquidado) filter (where b.tipo = 'Receivable'), 0), 2),
         round(sum(b.valor_brl), 2),
         round(sum(b.liquidado), 2),
         round(sum(b.valor_brl)
               / nullif(sum(b.valor_brl) filter (where b.tipo = 'Receivable'), 0) * 100, 2)
  from mart.profitmap_base b
  where b.ano = p_ano
    and (p_cliente is null    or b.customer_name = p_cliente)
    and (p_modalidade is null or b.modalidade = p_modalidade)
    and (p_busca is null      or b.process_id ilike '%' || p_busca || '%')
$$;

-- Níveis 2-4 de UM processo (cliente → item → parceiro). A tela monta a árvore.
--
-- Moeda e taxa só aparecem quando o grupo é homogêneo — agregar "USD 7500" com
-- "BRL 620" numa célula só produziria um número que não existe. Igual ao relatório,
-- onde os níveis mistos saem em branco.
create function mart.profitmap_detalhe(p_process_id text)
returns table (
  customer_name text, item_name text, partner_name text,
  pay_moeda text, pay_valor_original numeric, pay_taxa numeric,
  pay_brl numeric, pay_liquidado numeric, pay_data_liq date,
  rec_moeda text, rec_valor_original numeric, rec_taxa numeric,
  rec_brl numeric, rec_liquidado numeric, rec_data_liq date,
  total_brl numeric, total_liquidado numeric, profit_pct numeric
)
language sql stable
as $$
  select b.customer_name, b.item_name, b.partner_name,
         -- Payable
         case when count(distinct b.moeda) filter (where b.tipo = 'Payable') = 1
              then min(b.moeda) filter (where b.tipo = 'Payable') end,
         round(coalesce(sum(b.valor_original) filter (where b.tipo = 'Payable'), 0), 2),
         case when count(distinct b.taxa) filter (where b.tipo = 'Payable') = 1
              then min(b.taxa) filter (where b.tipo = 'Payable') end,
         round(coalesce(sum(b.valor_brl) filter (where b.tipo = 'Payable'), 0), 2),
         round(coalesce(sum(b.liquidado) filter (where b.tipo = 'Payable'), 0), 2),
         max((b.data_liquidacao at time zone 'America/Sao_Paulo')::date)
             filter (where b.tipo = 'Payable'),
         -- Receivable
         case when count(distinct b.moeda) filter (where b.tipo = 'Receivable') = 1
              then min(b.moeda) filter (where b.tipo = 'Receivable') end,
         round(coalesce(sum(b.valor_original) filter (where b.tipo = 'Receivable'), 0), 2),
         case when count(distinct b.taxa) filter (where b.tipo = 'Receivable') = 1
              then min(b.taxa) filter (where b.tipo = 'Receivable') end,
         round(coalesce(sum(b.valor_brl) filter (where b.tipo = 'Receivable'), 0), 2),
         round(coalesce(sum(b.liquidado) filter (where b.tipo = 'Receivable'), 0), 2),
         max((b.data_liquidacao at time zone 'America/Sao_Paulo')::date)
             filter (where b.tipo = 'Receivable'),
         -- Total
         round(sum(b.valor_brl), 2),
         round(sum(b.liquidado), 2),
         round(sum(b.valor_brl)
               / nullif(sum(b.valor_brl) filter (where b.tipo = 'Receivable'), 0) * 100, 2)
  from mart.profitmap_base b
  where b.process_id = p_process_id
  group by 1, 2, 3
  order by 2, 3
$$;

-- Opções do dropdown de cliente (lista do ano inteiro, independente do filtro ativo).
create view mart.profitmap_clientes as
select ano, customer_name, count(distinct process_id)::int as processos,
       round(sum(valor_brl), 2) as total_brl
from mart.profitmap_base
where customer_name is not null and customer_name <> ''
group by 1, 2;

grant select on mart.profitmap_base, mart.profitmap_clientes to authenticated;
grant execute on function mart.profitmap_processos(int, text, text, text, int, int) to authenticated;
grant execute on function mart.profitmap_totais(int, text, text, text) to authenticated;
grant execute on function mart.profitmap_detalhe(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Sanidade — rodar DEPOIS do primeiro sync, antes de liberar a tela.
-- ---------------------------------------------------------------------------
-- 1) O sinal do Payable é negativo, como no relatório do Tier2?
--      select tipo, count(*), min(valor_brl), max(valor_brl)
--      from mart.profitmap_base group by 1;
--    Esperado: Payable com max(valor_brl) <= 0. Se vier positivo, trocar as somas de
--    valor_brl por -abs() no lado Payable (e revisar Total/Profit%).
--
-- 2) Os tipos são mesmo 'Payable'/'Receivable' (e não outra grafia)?
--      select tipo, origem, count(*) from mart.profitmap_base group by 1, 2 order by 3 desc;
--    Qualquer valor fora desses dois cai fora das bandas e some do Total.
--
-- 3) O Profit% do total geral bate com o relatório?
--      select * from mart.profitmap_totais(2025);
--    No relatório de referência o total exibia 17,99% enquanto Total÷Receivable dava
--    16,44% — divergência não explicada. Conferir qual das duas o Tier2 considera certa
--    antes de tratar o rodapé como número oficial.
