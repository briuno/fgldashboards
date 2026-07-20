-- M1 — cron diário do GP1 (lucro por faturas).
--
-- Lacuna encontrada na auditoria de 2026-07-20: o delta diário (`tier2-sync-daily`) usa o
-- SELECT leve, que NÃO inclui os campos de lucro por fatura — eles são computados e pesados.
-- Resultado: `ShipmentProfitInvoiceNetProfitNoExchVariation` (GP1 do Financeiro) e
-- `ShipmentProfitInvoiceNetProfit` (GP2 do Desempenho) só entravam via backfill manual e
-- envelheciam nos meses recentes, justamente os que mais importam.
--
-- Este job refaz os 2 últimos meses com ?profit=1 todo dia. Custo medido: ~4 s por mês.
select cron.schedule(
  'tier2-sync-profit-daily',
  '40 8 * * *',
  $$
  select net.http_post(
    url := 'https://ifjpzyqjdagnxygbkwpm.supabase.co/functions/v1/tier2-sync?profit=1&months='
           || to_char((now() at time zone 'America/Sao_Paulo'), 'YYYY-MM') || ','
           || to_char((now() at time zone 'America/Sao_Paulo') - interval '1 month', 'YYYY-MM'),
    headers := '{"apikey":"sb_publishable_HUUaQD6U9TdtMeGc-MPAbw_RcnpX3lg"}'::jsonb
  )
  $$
);
