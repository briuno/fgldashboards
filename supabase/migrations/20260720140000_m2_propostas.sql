-- M2 — Propostas comerciais (tela /comercial/proposta).
--
-- ATENÇÃO ao nome (confirmado com o usuário em 2026-07-20): nesta API "Proposal" tem
-- dois sentidos. `ShipmentProfitProposalView` é a PROVISÃO do lucro de um processo (é o
-- que o Financeiro usa). A proposta comercial de verdade — a cotação PROP-* que o
-- vendedor manda ao cliente — é a `ProposalProcessView`, que é o que esta tela consome.
-- Ela não tem processo nem "data processo": a data-base aqui é a CRIAÇÃO da proposta.

create table if not exists raw.proposal_process (
  oid       uuid primary key,
  data      jsonb not null,
  synced_at timestamptz not null default now()
);

drop view if exists mart.propostas_totais;
drop view if exists mart.propostas_mensal;
drop view if exists mart.propostas_base cascade;

create view mart.propostas_base as
select
  data->>'ProposalID'                                            as proposal_id,
  data->>'Status'                                                as status,
  -- Status observados: Won 13.4k · Lost 21.1k · Open 5.9k · Canceled 6.4k.
  (data->>'Status' = 'Won')                                      as ganha,
  (data->>'Status' = 'Lost')                                     as perdida,
  (data->>'Status' = 'Open')                                     as aberta,
  -- Os campos de valor só passaram a ser preenchidos em 2025/2026 (0% até 2024):
  -- guardamos a cobertura para a tela não exibir "R$ 0" como se fosse valor real.
  (coalesce((nullif(data->>'TotalSales',''))::numeric, 0) > 0)   as tem_valor,
  (nullif(data->>'CreatedOn',''))::timestamptz                   as created_on,
  extract(year  from (nullif(data->>'CreatedOn',''))::timestamptz
                     at time zone 'America/Sao_Paulo')::int      as ano,
  extract(month from (nullif(data->>'CreatedOn',''))::timestamptz
                     at time zone 'America/Sao_Paulo')::int      as mes,
  (nullif(data->>'ValidUntil',''))::timestamptz                  as valid_until,
  data->>'ProposalType'                                          as process_type,
  -- mesmos 5 grupos das outras telas
  case when data->>'ProposalType' in ('Ocean Import','Air Import','Ocean Export','Air Export')
       then data->>'ProposalType' else 'Others & Road' end       as modalidade,
  data->>'CustomerName'                                          as customer_name,
  data->>'SalesPerson'                                           as sales_person,
  coalesce((nullif(data->>'ProposalVersionQty',''))::int, 0)     as versoes,
  coalesce((nullif(data->>'TotalSales',''))::numeric, 0)         as total_sales,
  coalesce((nullif(data->>'ForecastNetProfit',''))::numeric, 0)  as profit_previsto,
  coalesce((nullif(data->>'SalesMargin',''))::numeric, 0)        as margem
from raw.proposal_process
where data->>'CreatedOn' is not null;

-- Cards do topo. Conversão = ganhas ÷ DECIDIDAS (ganhas+perdidas): incluir as abertas
-- afundaria a taxa do ano corrente, e as canceladas nem chegaram a ser disputadas.
create view mart.propostas_totais as
select ano,
       count(*)::int                                   as propostas,
       count(*) filter (where ganha)::int              as ganhas,
       count(*) filter (where perdida)::int            as perdidas,
       count(*) filter (where aberta)::int             as abertas,
       count(*) filter (where tem_valor)::int          as com_valor,
       count(distinct customer_name)::int              as clientes,
       round(sum(total_sales), 2)                      as total_sales,
       round(sum(total_sales) filter (where ganha), 2) as total_sales_ganhas,
       round(sum(profit_previsto), 2)                  as profit_previsto,
       round(sum(profit_previsto) filter (where ganha), 2) as profit_ganho
from mart.propostas_base group by 1;

create view mart.propostas_mensal as
select ano, mes,
       count(*)::int                                   as propostas,
       count(*) filter (where ganha)::int              as ganhas,
       count(*) filter (where perdida)::int            as perdidas,
       count(*) filter (where aberta)::int             as abertas,
       count(*) filter (where tem_valor)::int          as com_valor,
       round(sum(total_sales), 2)                      as total_sales,
       round(sum(total_sales) filter (where ganha), 2) as total_sales_ganhas,
       round(sum(profit_previsto), 2)                  as profit_previsto,
       round(sum(profit_previsto) filter (where ganha), 2) as profit_ganho
from mart.propostas_base group by 1, 2;

-- Quebras filtráveis (vendedor/modalidade/cliente/status), agregadas no servidor.
create or replace function mart.propostas_quebra(p_ano int, p_dim text)
returns table (rotulo text, propostas int, ganhas int, perdidas int,
               total_sales numeric, profit_previsto numeric)
language sql stable
as $$
  select coalesce(nullif(case p_dim
           when 'vendedor'   then b.sales_person
           when 'modalidade' then b.modalidade
           when 'cliente'    then b.customer_name
           when 'status'     then b.status
         end, ''), '—'),
         count(*)::int,
         count(*) filter (where b.ganha)::int,
         count(*) filter (where b.perdida)::int,
         round(sum(b.total_sales), 2),
         round(sum(b.profit_previsto), 2)
  from mart.propostas_base b
  where b.ano = p_ano
  group by 1
  order by 2 desc
$$;

grant select on mart.propostas_base, mart.propostas_totais, mart.propostas_mensal to authenticated;
grant execute on function mart.propostas_quebra(int, text) to authenticated;
