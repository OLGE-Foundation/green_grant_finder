import type { Grant } from "@/types/grant";

export function normalizeGrantRecord(input: unknown): Grant | null {
  const g = (input ?? {}) as Record<string, unknown>;
  if (typeof g.id !== "string" || !g.id.trim()) return null;
  if (typeof g.title !== "string" || !g.title.trim()) return null;

  const toNumber = (value: unknown) =>
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : null;
  const toTextArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : null;
  const toStringOrNull = (value: unknown) => (typeof value === "string" ? value : null);

  return {
    id: g.id.trim(),
    status: typeof g.status === "string" && g.status ? g.status : "approved",
    title: g.title.trim(),
    provider_name:
      typeof g.provider_name === "string"
        ? g.provider_name
        : typeof g.provider === "string"
          ? g.provider
          : null,
    provider: typeof g.provider === "string" ? g.provider : null,
    funding_amount_min: toNumber(g.funding_amount_min) ?? toNumber(g.amount_min),
    funding_amount_max: toNumber(g.funding_amount_max) ?? toNumber(g.amount_max),
    amount_min: toNumber(g.amount_min),
    amount_max: toNumber(g.amount_max),
    short_description:
      typeof g.short_description === "string"
        ? g.short_description
        : typeof g.description === "string"
          ? g.description
          : null,
    description: typeof g.description === "string" ? g.description : null,
    sector: toTextArray(g.sector),
    region: toTextArray(g.region),
    eligibility: toTextArray(g.eligibility),
    deadline: toStringOrNull(g.deadline),
    url: toStringOrNull(g.url),
    application_url: toStringOrNull(g.application_url),
    created_at:
      typeof g.created_at === "string" ? g.created_at : new Date().toISOString(),
    source: toStringOrNull(g.source),
    contact_email: toStringOrNull(g.contact_email),
    additional_notes: toStringOrNull(g.additional_notes),
    approved_at: toStringOrNull(g.approved_at),
  };
}
