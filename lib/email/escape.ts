/**
 * Escapes a string for safe interpolation into HTML email bodies.
 *
 * Grant titles, providers, and rejection reasons originate from untrusted
 * provider submissions / scraped pages and are interpolated into email HTML,
 * so every such value must be escaped to prevent HTML/content injection in
 * recipients' inboxes.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
