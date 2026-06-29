import { describe, expect, it } from "vitest";
import { normalizeGrantRecord } from "./normalize";

describe("normalizeGrantRecord", () => {
  it("returns null when id or title is missing", () => {
    expect(normalizeGrantRecord(null)).toBeNull();
    expect(normalizeGrantRecord({ id: "  ", title: "x" })).toBeNull();
    expect(normalizeGrantRecord({ id: "1", title: "  " })).toBeNull();
  });

  it("bridges raw DB column names to canonical UI fields", () => {
    const grant = normalizeGrantRecord({
      id: "abc",
      title: "Solar Fund",
      provider: "Green Co",
      amount_min: "1000",
      amount_max: 5000,
      description: "Funds solar projects",
      url: "https://example.com",
    });

    expect(grant).not.toBeNull();
    expect(grant?.provider_name).toBe("Green Co");
    expect(grant?.funding_amount_min).toBe(1000); // coerced from string
    expect(grant?.funding_amount_max).toBe(5000);
    expect(grant?.short_description).toBe("Funds solar projects");
    expect(grant?.application_url).toBeNull(); // application_url absent; url kept separately
    expect(grant?.url).toBe("https://example.com");
  });

  it("prefers canonical fields over raw aliases when both exist", () => {
    const grant = normalizeGrantRecord({
      id: "abc",
      title: "X",
      provider_name: "Canonical",
      provider: "Raw",
      funding_amount_min: 200,
      amount_min: 999,
    });
    expect(grant?.provider_name).toBe("Canonical");
    expect(grant?.funding_amount_min).toBe(200);
  });

  it("defaults status to approved and trims id/title", () => {
    const grant = normalizeGrantRecord({ id: " x ", title: " Hello " });
    expect(grant?.id).toBe("x");
    expect(grant?.title).toBe("Hello");
    expect(grant?.status).toBe("approved");
  });

  it("filters non-string entries out of array fields", () => {
    const grant = normalizeGrantRecord({
      id: "1",
      title: "t",
      sector: ["Clean energy", 5, null, "Biodiversity"],
    });
    expect(grant?.sector).toEqual(["Clean energy", "Biodiversity"]);
  });
});
