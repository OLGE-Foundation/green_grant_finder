import type { Grant } from "@/types/grant";
import type { AmountFilter, SortKey } from "./constants";

export function amountLabel(v: AmountFilter): string | null {
  switch (v) {
    case "under_50k":
      return "Under $50K";
    case "50k_500k":
      return "$50K to $500K";
    case "over_500k":
      return "$500K and above";
    default:
      return null;
  }
}

export function grantMatchesAmount(grant: Grant, filter: AmountFilter): boolean {
  if (!filter) return true;
  const min = grant.funding_amount_min;
  const max = grant.funding_amount_max;
  const low = min ?? max ?? null;
  const high = max ?? min ?? null;
  if (low == null && high == null) return true;

  const overlaps = (a1: number, a2: number, b1: number, b2: number) =>
    a1 <= b2 && b1 <= a2;

  switch (filter) {
    case "under_50k":
      return overlaps(0, 50_000, low ?? 0, high ?? low ?? 0);
    case "50k_500k":
      return overlaps(50_000, 500_000, low ?? 0, high ?? low ?? 0);
    case "over_500k":
      return (high ?? low ?? 0) >= 500_000;
    default:
      return true;
  }
}

export function grantMatchesEligibility(grant: Grant, eligibility: string): boolean {
  if (!eligibility) return true;
  return (grant.eligibility ?? []).includes(eligibility);
}

export function sortGrants(grants: Grant[], sort: SortKey): Grant[] {
  const copy = [...grants];
  switch (sort) {
    case "amount":
      return copy.sort((a, b) => {
        const aMax = a.funding_amount_max ?? a.funding_amount_min ?? 0;
        const bMax = b.funding_amount_max ?? b.funding_amount_min ?? 0;
        return bMax - aMax;
      });
    case "created":
      return copy.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "deadline":
    default:
      return copy.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  }
}

export function escapeIlikePattern(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "");
}

export function quotePostgrestFilterValue(value: string) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}
