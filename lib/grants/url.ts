/**
 * Returns the URL only if it is a safe http(s) link, otherwise null.
 *
 * Grant `url`/`applicationUrl` values reach the UI as clickable hrefs and email
 * links. Provider submissions are validated at the API boundary, but scraped
 * grants are not — so anything rendered as an href is also sanitized here as
 * defence-in-depth against `javascript:` / `data:` scheme XSS.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    // not a parseable absolute URL
  }
  return null;
}
