-- Phase 5: enable Row-Level Security on grants (defence-in-depth)
--
-- Until now the public GET /api/grants route relied solely on an application-level
-- `.eq("status", "approved")` filter, with the anon key talking to a table that had
-- no RLS. This migration makes the database itself enforce that only approved grants
-- are publicly readable, so a crafted query against the anon key can never surface
-- pending/rejected rows or submitter PII.
--
-- Safe to run on the existing app:
--   * Public directory (anon key)      -> covered by "Public read approved grants"
--   * Saved grants (authenticated JWT) -> covered by "Public read approved grants"
--   * Admin dashboard / approve-reject -> service-role client bypasses RLS
--   * Provider submit / weekly digest  -> service-role client bypasses RLS
--   * Admins reading pending grants     -> covered by the Phase 4 "Admins read all grants"
--
-- There is intentionally NO public insert/update/delete policy: writes remain
-- service-role only, matching the existing "no public insert policy on grants" design.

alter table public.grants enable row level security;

-- Postgres has no CREATE POLICY IF NOT EXISTS; drop-then-create keeps this idempotent.
drop policy if exists "Public read approved grants" on public.grants;
create policy "Public read approved grants"
  on public.grants for select
  to anon, authenticated
  using (status = 'approved');
