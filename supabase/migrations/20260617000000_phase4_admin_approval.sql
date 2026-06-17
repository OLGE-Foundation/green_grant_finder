-- Phase 4: admin approval workflow

-- Audit columns: who reviewed a grant, when, and why it was rejected
alter table public.grants
  add column if not exists rejection_reason text,
  add column if not exists reviewed_by      uuid references auth.users,
  add column if not exists reviewed_at       timestamptz;

-- RLS: let admins SELECT all grants (not just approved ones) and UPDATE any grant.
-- Admin status is read from the JWT app_metadata, which only the service-role key
-- can write. These add defence-in-depth if RLS is enabled on grants; if RLS is not
-- enabled they are harmless no-ops. Postgres has no CREATE POLICY IF NOT EXISTS, so
-- drop-then-create keeps the migration idempotent.
drop policy if exists "Admins read all grants" on public.grants;
create policy "Admins read all grants"
  on public.grants for select
  to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
  );

drop policy if exists "Admins update grants" on public.grants;
create policy "Admins update grants"
  on public.grants for update
  to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
  );
