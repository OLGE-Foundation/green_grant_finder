import { describe, expect, it, vi } from "vitest";
import { applyGrantListFilters } from "./query";

// Minimal chainable stand-in for the Supabase/PostgREST query builder.
function makeMockQuery() {
  const calls: { method: string; args: unknown[] }[] = [];
  const query: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["contains", "or", "order"]) {
    query[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return query;
    });
  }
  return { query, calls };
}

describe("applyGrantListFilters", () => {
  it("always orders by deadline ascending", () => {
    const { query, calls } = makeMockQuery();
    applyGrantListFilters(query, new URLSearchParams());
    expect(calls).toEqual([
      { method: "order", args: ["deadline", { ascending: true }] },
    ]);
  });

  it("applies sector and region as array containment filters", () => {
    const { query, calls } = makeMockQuery();
    applyGrantListFilters(
      query,
      new URLSearchParams({ sector: "Clean energy", region: "Europe" }),
    );
    expect(calls).toContainEqual({
      method: "contains",
      args: ["sector", ["Clean energy"]],
    });
    expect(calls).toContainEqual({
      method: "contains",
      args: ["region", ["Europe"]],
    });
  });

  it("builds an OR ilike clause across title, description and provider for search", () => {
    const { query, calls } = makeMockQuery();
    applyGrantListFilters(query, new URLSearchParams({ q: "solar" }));
    const orCall = calls.find((c) => c.method === "or");
    expect(orCall).toBeDefined();
    const clause = orCall?.args[0] as string;
    expect(clause).toContain("title.ilike.");
    expect(clause).toContain("description.ilike.");
    expect(clause).toContain("provider.ilike.");
    expect(clause).toContain("solar");
  });

  it("ignores blank/whitespace-only params", () => {
    const { query, calls } = makeMockQuery();
    applyGrantListFilters(
      query,
      new URLSearchParams({ sector: "  ", region: "", q: "   " }),
    );
    expect(calls.filter((c) => c.method !== "order")).toHaveLength(0);
  });
});
