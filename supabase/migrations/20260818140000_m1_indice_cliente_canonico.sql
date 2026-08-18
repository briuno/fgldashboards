-- M1 — índice para mart.cliente_canonico.
--
-- A view agrupa por upper(btrim(data->>'CustomerName')) sobre raw.shipment_process. Sem
-- índice isso era seq scan das 22.696 linhas + ordenação externa de 18 MB em DISCO, a
-- cada chamada — 1,5 s cravados em toda tela que usa o nome canônico: Financeiro,
-- Desempenho, Comercial e o Profit Map.
--
-- A expressão é indexável porque upper, btrim e ->> são todas IMMUTABLE.
--
-- Medido no plano de mart.profitmap_processos(2026): o ramo do cliente canônico caiu de
-- 1.497 ms (Seq Scan + Sort em disco) para 124 ms (Index Scan + GroupAggregate).

create index if not exists shipment_process_customer_chave_idx
  on raw.shipment_process ((upper(btrim(data->>'CustomerName'))));
