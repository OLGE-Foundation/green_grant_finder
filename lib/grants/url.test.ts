import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./url";
import { escapeHtml } from "@/lib/email/escape";

describe("safeHttpUrl", () => {
  it("allows http and https URLs", () => {
    expect(safeHttpUrl("https://example.com/apply")).toBe(
      "https://example.com/apply",
    );
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com");
  });

  it("rejects javascript: and data: scheme XSS payloads", () => {
    expect(safeHttpUrl("javascript:alert(document.cookie)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("rejects empty / non-absolute / malformed input", () => {
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl("/relative/path")).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("returns an empty string for null/undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});
