-- M1 — o job diário da provisão passa a cobrir ano corrente E anterior.
--
-- O ano embutido no ProcessID é o de CRIAÇÃO do processo, não o do ProcessDate. Medição
-- em 2026-07-20: 12,9% dos processos com data em 2026 têm ID '-25', e 16,2% dos de 2025
-- têm '-24'. Filtrando só o ano corrente, essa fatia nunca era reprocessada — e na virada
-- do ano o buraco seria bem maior, porque em janeiro quase todo processo ainda tem ID do
-- ano anterior. A dispersão medida nunca passa de um ano para trás, então dois anos cobrem 100%.
select cron.unschedule('tier2-sync-proposal-daily');

select cron.schedule(
  'tier2-sync-proposal-daily',
  '20 8 * * *',
  $$
  select net.http_post(
    url := 'https://ifjpzyqjdagnxygbkwpm.supabase.co/functions/v1/tier2-sync?proposal=1&year='
           || to_char(now() at time zone 'America/Sao_Paulo', 'YY') || ','
           || to_char((now() at time zone 'America/Sao_Paulo') - interval '1 year', 'YY'),
    headers := '{"apikey":"sb_publishable_HUUaQD6U9TdtMeGc-MPAbw_RcnpX3lg"}'::jsonb
  )
  $$
);
