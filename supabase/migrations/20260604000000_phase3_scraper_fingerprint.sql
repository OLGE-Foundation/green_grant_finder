-- Phase 3: scraper deduplication via fingerprint

alter table public.grants
  add column if not exists fingerprint text;

create unique index if not exists grants_fingerprint_unique
  on public.grants (fingerprint)
  where fingerprint is not null;
