import { safeHttpUrl } from "@/lib/grants/url";
import { escapeHtml } from "@/lib/email/escape";

type DigestGrant = {
  id: string;
  title: string;
  provider: string | null;
  deadline: string | null;
  url: string | null;
  sector: string[] | null;
  region: string[] | null;
};

export function renderWeeklyDigestHtml(
  grants: DigestGrant[],
  userEmail: string,
): string {
  const items = grants
    .map((grant) => {
      const deadline = grant.deadline
        ? new Date(grant.deadline).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "No deadline";
      const safeUrl = safeHttpUrl(grant.url);
      const applyLink = safeUrl
        ? `<a href="${escapeHtml(safeUrl)}" style="color:#047857;font-weight:600">Apply</a>`
        : "";
      const tags = [...(grant.sector ?? []), ...(grant.region ?? [])]
        .map(escapeHtml)
        .join(", ");
      return `
        <li style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e4e4e7">
          <strong style="color:#064e3b">${escapeHtml(grant.title)}</strong><br/>
          <span style="color:#52525b;font-size:14px">${escapeHtml(grant.provider ?? "Unknown provider")} · ${escapeHtml(deadline)}</span><br/>
          <span style="color:#71717a;font-size:13px">${tags}</span><br/>
          ${applyLink}
        </li>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;color:#18181b;background:#f4f9f6;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;border:1px solid #d1fae5">
      <h1 style="color:#064e3b;font-size:20px;margin:0 0 8px">Weekly grant digest</h1>
      <p style="color:#52525b;font-size:14px;margin:0 0 20px">
        Hi ${escapeHtml(userEmail)}, here are newly approved grants matching your interests:
      </p>
      <ul style="list-style:none;padding:0;margin:0">${items}</ul>
      <p style="color:#71717a;font-size:12px;margin-top:24px">
        Manage alert preferences on your saved grants page.
      </p>
    </div>
  </body>
</html>`;
}

export function grantMatchesPreferences(
  grant: DigestGrant,
  sectors: string[],
  regions: string[],
): boolean {
  const grantSectors = grant.sector ?? [];
  const grantRegions = grant.region ?? [];

  const sectorMatch =
    sectors.length > 0 && grantSectors.some((s) => sectors.includes(s));
  const regionMatch =
    regions.length > 0 && grantRegions.some((r) => regions.includes(r));

  if (sectors.length === 0 && regions.length === 0) return false;
  if (sectors.length === 0) return regionMatch;
  if (regions.length === 0) return sectorMatch;
  return sectorMatch || regionMatch;
}
