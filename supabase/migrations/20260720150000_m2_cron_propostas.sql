-- M2 — cron diário das propostas comerciais (ProposalProcessView).
-- Delta por `ProposalUpdateOn` a partir do maior já gravado, com 3 min de folga.
-- 09:00 UTC: depois dos jobs de processo (08:00), provisão (08:20) e lucro (08:40).
select cron.schedule(
  'tier2-sync-propostas-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://ifjpzyqjdagnxygbkwpm.supabase.co/functions/v1/tier2-sync?propostas=1&delta=1',
    headers := '{"apikey":"sb_publishable_HUUaQD6U9TdtMeGc-MPAbw_RcnpX3lg"}'::jsonb
  )
  $$
);
