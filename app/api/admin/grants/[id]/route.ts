import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGrantDecisionEmail } from "@/lib/email/grant-decision";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Verify the caller is an authenticated admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.app_metadata?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse and validate the body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, rejection_reason } = body as {
    action?: string;
    rejection_reason?: string;
  };

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'" },
      { status: 400 },
    );
  }

  // 3. Update the grant. The admin client bypasses RLS, which is correct since the
  // caller is already authenticated above. Filtering on status = 'pending' makes the
  // transition idempotent and prevents double-approvals under concurrent clicks.
  const { id } = await params;
  const adminSupabase = createAdminClient();

  const { data: grant, error } = await adminSupabase
    .from("grants")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      ...(action === "reject" && rejection_reason
        ? { rejection_reason }
        : {}),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("title, contact_email, source")
    .single();

  if (error) {
    // PGRST116 = no rows returned by .single() (already reviewed or not found)
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Grant not found or already reviewed" },
        { status: 404 },
      );
    }
    console.error("[api/admin/grants] update error:", error);
    return NextResponse.json(
      { error: "Failed to update grant" },
      { status: 500 },
    );
  }

  if (!grant) {
    return NextResponse.json(
      { error: "Grant not found or already reviewed" },
      { status: 404 },
    );
  }

  // 4. Notify the submitter. Auto-scraped grants (source = 'scraper') have no
  // submitter, so they are skipped. Email is fire-and-forget so a delivery failure
  // does not fail the request.
  if (grant.source !== "scraper" && grant.contact_email) {
    sendGrantDecisionEmail({
      to: grant.contact_email,
      grantTitle: grant.title,
      action,
      rejectionReason: rejection_reason,
    }).catch((err) =>
      console.error("[api/admin/grants] email error:", err),
    );
  }

  return NextResponse.json({
    success: true,
    status: action === "approve" ? "approved" : "rejected",
  });
}
