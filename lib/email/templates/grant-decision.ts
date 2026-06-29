import { escapeHtml } from "@/lib/email/escape";

export function renderGrantDecisionHtml(
  grantTitle: string,
  action: "approve" | "reject",
  rejectionReason?: string,
): string {
  const approved = action === "approve";
  const accentColor = approved ? "#d1fae5" : "#fee2e2";
  const headingColor = approved ? "#064e3b" : "#991b1b";

  return `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;color:#18181b;background:#f4f9f6;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;border:1px solid ${accentColor}">
      <h1 style="color:${headingColor};font-size:20px;margin:0 0 8px">
        ${approved ? "Your grant has been approved ✓" : "Update on your grant submission"}
      </h1>
      <p style="color:#52525b;font-size:14px;margin:0 0 16px">
        <strong>${escapeHtml(grantTitle)}</strong> has been
        ${
          approved
            ? "approved and is now live in the Green Grant Finder directory."
            : "reviewed but was not approved at this time."
        }
      </p>
      ${
        !approved && rejectionReason
          ? `<div style="background:#fef2f2;border-radius:8px;padding:12px;margin-bottom:16px">
               <p style="color:#7f1d1d;font-size:13px;margin:0"><strong>Reason:</strong> ${escapeHtml(rejectionReason)}</p>
             </div>`
          : ""
      }
      <p style="color:#71717a;font-size:12px;margin-top:24px">
        Green Grant Finder
      </p>
    </div>
  </body>
</html>`;
}
