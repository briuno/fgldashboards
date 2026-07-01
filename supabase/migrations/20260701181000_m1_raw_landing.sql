-- M1 — Tabelas de aterrissagem (raw) da ingestão do Tier2.
-- JSON cru da API OData, upsert por Oid (idempotente). Transformação vem depois em core/*.

create table if not exists raw.shipment_process (
  oid       uuid primary key,
  data      jsonb not null,
  synced_at timestamptz not null default now()
);

create table if not exists raw.shipment_profit_invoice (
  oid       uuid primary key,
  data      jsonb not null,
  synced_at timestamptz not null default now()
);
