import { describe, expect, it } from "vitest";
import type { Grant } from "@/types/grant";
import {
  amountLabel,
  escapeIlikePattern,
  grantMatchesAmount,
  grantMatchesEligibility,
  quotePostgrestFilterValue,
  sortGrants,
} from "./filters";

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "g1",
    status: "approved",
    title: "Test grant",
    provider_name: "Provider",
    funding_amount_min: null,
    funding_amount_max: null,
    short_description: null,
    sector: null,
    region: null,
    eligibility: null,
    deadline: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("amountLabel", () => {
  it("maps known filters to labels and unknown to null", () => {
    expect(amountLabel("under_50k")).toBe("Under $50K");
    expect(amountLabel("50k_500k")).toBe("$50K to $500K");
    expect(amountLabel("over_500k")).toBe("$500K and above");
    expect(amountLabel("")).toBeNull();
  });
});

describe("grantMatchesAmount", () => {
  it("matches everything when no filter is set", () => {
    expect(grantMatchesAmount(makeGrant({ funding_amount_min: 1_000_000 }), "")).toBe(
      true,
    );
  });

  it("includes grants with no amount data", () => {
    expect(grantMatchesAmount(makeGrant(), "under_50k")).toBe(true);
  });

  it("matches a range that overlaps the under_50k band", () => {
    const grant = makeGrant({ funding_amount_min: 10_000, funding_amount_max: 40_000 });
    expect(grantMatchesAmount(grant, "under_50k")).toBe(true);
    expect(grantMatchesAmount(grant, "over_500k")).toBe(false);
  });

  it("matches over_500k only when the high end clears the threshold", () => {
    expect(
      grantMatchesAmount(makeGrant({ funding_amount_max: 750_000 }), "over_500k"),
    ).toBe(true);
    expect(
      grantMatchesAmount(makeGrant({ funding_amount_max: 100_000 }), "over_500k"),
    ).toBe(false);
  });
});

describe("grantMatchesEligibility", () => {
  it("returns true when no eligibility filter is given", () => {
    expect(grantMatchesEligibility(makeGrant(), "")).toBe(true);
  });

  it("matches against the grant's eligibility list", () => {
    const grant = makeGrant({ eligibility: ["NGOs", "Startups"] });
    expect(grantMatchesEligibility(grant, "NGOs")).toBe(true);
    expect(grantMatchesEligibility(grant, "Individuals")).toBe(false);
  });
});

describe("sortGrants", () => {
  it("sorts by deadline ascending, pushing null deadlines last", () => {
    const a = makeGrant({ id: "a", deadline: "2026-03-01" });
    const b = makeGrant({ id: "b", deadline: "2026-01-01" });
    const c = makeGrant({ id: "c", deadline: null });
    const sorted = sortGrants([a, b, c], "deadline");
    expect(sorted.map((g) => g.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts by amount descending", () => {
    const a = makeGrant({ id: "a", funding_amount_max: 100 });
    const b = makeGrant({ id: "b", funding_amount_max: 900 });
    expect(sortGrants([a, b], "amount").map((g) => g.id)).toEqual(["b", "a"]);
  });

  it("sorts by created date, newest first", () => {
    const a = makeGrant({ id: "a", created_at: "2026-01-01T00:00:00.000Z" });
    const b = makeGrant({ id: "b", created_at: "2026-06-01T00:00:00.000Z" });
    expect(sortGrants([a, b], "created").map((g) => g.id)).toEqual(["b", "a"]);
  });

  it("does not mutate the input array", () => {
    const input = [makeGrant({ id: "a" }), makeGrant({ id: "b" })];
    const before = input.map((g) => g.id);
    sortGrants(input, "amount");
    expect(input.map((g) => g.id)).toEqual(before);
  });
});

describe("escapeIlikePattern", () => {
  it("escapes ilike wildcards and strips commas", () => {
    expect(escapeIlikePattern("50%_off, now")).toBe("50\\%\\_off now");
  });
});

describe("quotePostgrestFilterValue", () => {
  it("wraps the value in quotes and escapes embedded quotes/backslashes", () => {
    expect(quotePostgrestFilterValue('a"b')).toBe('"a\\"b"');
  });
});
