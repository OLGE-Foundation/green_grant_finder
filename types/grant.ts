/**
 * A grant as consumed by the UI.
 *
 * This type intentionally carries two naming conventions for the same data
 * because grants reach components through two different paths:
 *
 *   1. Public directory — raw DB rows from `GET /api/grants` are run through
 *      `normalizeGrantRecord()` (lib/grants/normalize.ts), which fills in the
 *      canonical/UI fields (`provider_name`, `funding_amount_*`,
 *      `short_description`, `application_url`).
 *   2. Admin dashboard — raw DB rows from the service-role client are typed as
 *      `Grant` and rendered *without* normalization, so components read the raw
 *      DB column names (`provider`, `amount_*`, `description`, `url`) directly.
 *
 * Consumers therefore read with a fallback, e.g.
 * `grant.provider_name ?? grant.provider`. Do not remove either set without
 * also updating both paths (normalize + the admin rendering).
 *
 * Actual DB columns are the raw names: provider, amount_min, amount_max,
 * description, url.
 */
export type Grant = {
  id: string;
  status: "pending" | "approved" | "rejected" | string;
  title: string;

  // Canonical / normalized fields (populated by normalizeGrantRecord).
  provider_name: string | null;
  funding_amount_min: number | null;
  funding_amount_max: number | null;
  short_description: string | null;
  application_url?: string | null;

  // Raw DB column aliases (present on un-normalized admin rows).
  provider?: string | null;
  amount_min?: number | null;
  amount_max?: number | null;
  description?: string | null;
  url?: string | null;

  // Shared fields (same name in DB and UI).
  sector: string[] | null;
  region: string[] | null;
  eligibility: string[] | null;
  deadline: string | null;
  created_at: string;
  source?: string | null;
  approved_at?: string | null;

  // Internal review fields — never exposed by the public API (see
  // PUBLIC_GRANT_COLUMNS in lib/grants/constants.ts).
  contact_email?: string | null;
  additional_notes?: string | null;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
};
