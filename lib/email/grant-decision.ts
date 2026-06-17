import { getFromEmail, getResendClient } from "@/lib/email/resend";
import { renderGrantDecisionHtml } from "@/lib/email/templates/grant-decision";

export async function sendGrantDecisionEmail({
  to,
  grantTitle,
  action,
  rejectionReason,
}: {
  to: string;
  grantTitle: string;
  action: "approve" | "reject";
  rejectionReason?: string;
}): Promise<void> {
  const resend = getResendClient();
  const from = getFromEmail();

  const subject =
    action === "approve"
      ? `Your grant "${grantTitle}" has been approved`
      : `Update on your grant submission: "${grantTitle}"`;

  await resend.emails.send({
    from,
    to,
    subject,
    html: renderGrantDecisionHtml(grantTitle, action, rejectionReason),
  });
}
