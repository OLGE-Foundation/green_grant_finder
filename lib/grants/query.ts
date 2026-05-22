import { escapeIlikePattern, quotePostgrestFilterValue } from "./filters";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyGrantListFilters(query: any, searchParams: URLSearchParams) {
  const sector = searchParams.get("sector");
  const region = searchParams.get("region");
  const q = searchParams.get("q");

  if (sector?.trim()) {
    query = query.contains("sector", [sector.trim()]);
  }

  if (region?.trim()) {
    query = query.contains("region", [region.trim()]);
  }

  if (q?.trim()) {
    const term = `%${escapeIlikePattern(q.trim())}%`;
    const quoted = quotePostgrestFilterValue(term);
    query = query.or(
      `title.ilike.${quoted},description.ilike.${quoted},provider.ilike.${quoted}`,
    );
  }

  return query.order("deadline", { ascending: true });
}
