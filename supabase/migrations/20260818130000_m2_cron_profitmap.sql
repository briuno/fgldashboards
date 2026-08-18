-- M2 — cron do Profit Map (InvoiceProposalProfitMapView).
--
-- 09:20 UTC: depois de processo (08:00), provisão (08:20), lucro (08:40) e propostas (09:00).
--
-- O job é o MESMO para backfill e para o dia a dia: enquanto `etl.sync_state.delta_cursor`
-- não passa de STOP_MONTH a função avança meses a partir de 2022-01; depois disso ela
-- reprocessa os 3 meses mais recentes. Não há delta por high-water-mark porque a view não
-- tem coluna de atualização — o que muda depois do fato é a liquidação, e ela cai em
-- processos recentes.
select cron.schedule(
  'tier2-sync-profitmap-daily',
  '20 9 * * *',
  $$
  select net.http_post(
    url := 'https://ifjpzyqjdagnxygbkwpm.supabase.co/functions/v1/tier2-sync?profitmap=1',
    headers := '{"apikey":"sb_publishable_HUUaQD6U9TdtMeGc-MPAbw_RcnpX3lg"}'::jsonb
  )
  $$
);

-- ---------------------------------------------------------------------------
-- CARGA INICIAL — rodar à mão, NÃO faz parte do agendamento permanente.
-- ---------------------------------------------------------------------------
-- São ~72 meses (2022-01 → 2027-12) e cada execução cabe em ~110 s, então no ritmo
-- diário o backfill levaria meses. Para a carga inicial, agende um job temporário a cada
-- 5 minutos e REMOVA assim que a resposta trouxer "backfillComplete": true:
--
--   select cron.schedule(
--     'tier2-sync-profitmap-backfill', '*/5 * * * *',
--     $x$ select net.http_post(
--           url := 'https://ifjpzyqjdagnxygbkwpm.supabase.co/functions/v1/tier2-sync?profitmap=1',
--           headers := '{"apikey":"sb_publishable_HUUaQD6U9TdtMeGc-MPAbw_RcnpX3lg"}'::jsonb) $x$);
--
--   -- acompanhar:
--   select entity, mode, delta_cursor, updated_at from etl.sync_state
--    where entity = 'InvoiceProposalProfitMapView';
--   select count(*) from raw.invoice_proposal_profit_map;
--
--   -- ao terminar:
--   select cron.unschedule('tier2-sync-profitmap-backfill');
