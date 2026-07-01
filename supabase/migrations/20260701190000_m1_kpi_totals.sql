-- M1 — totais agregados (INCLUI processos novos, sem ProcessDate = ainda sem ETA/pipeline).
create or replace view mart.kpi_totals as
select
  count(*)::bigint                                          as processos_total,
  count(*) filter (where process_date is not null)::bigint  as processos_com_data,
  count(*) filter (where process_date is null)::bigint      as processos_novos,
  sum(coalesce(net_profit, 0))                              as lucro_liquido,
  sum(coalesce(gross_profit, 0))                            as lucro_bruto,
  sum(coalesce(teu, 0))                                     as teu
from core.fact_process;

grant select on mart.kpi_totals to authenticated;
