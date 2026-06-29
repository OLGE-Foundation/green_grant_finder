import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGrantDecisionEmail } from "@/lib/email/grant-decision";
import { safeHttpUrl } from "@/lib/grants/url";
import {
  ELIGIBILITY_OPTIONS,
  REGION_OPTIONS,
  SECTOR_OPTIONS,
} from "@/lib/grants/constants";

const SECTOR_SET = new Set<string>(SECTOR_OPTIONS);
const REGION_SET = new Set<string>(REGION_OPTIONS);
const ELIGIBILITY_SET = new Set<string>(ELIGIBILITY_OPTIONS);
const EDITABLE_STATUSES = new Set(["approved", "pending", "rejected"]);

function sanitizeOptions(input: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter(
    (v): v is string => typeof v === "string" && allowed.has(v),
  );
}

// Shared admin gate for the non-PATCH handlers.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.app_metadata?.is_admin) return null;
  return user;
}

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

// Edit an existing grant's content. Used by the admin panel to manage grants
// that are already approved (or any status). The admin client bypasses RLS.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (typeof b.title === "string") {
    const title = b.title.trim();
    if (!title) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 },
      );
    }
    updates.title = title.slice(0, 200);
  }
  if (typeof b.provider === "string") {
    updates.provider = b.provider.trim().slice(0, 200) || null;
  }
  if (typeof b.description === "string") {
    updates.description = b.description.trim().slice(0, 5000) || null;
  }
  for (const key of ["amount_min", "amount_max"] as const) {
    if (key in b) {
      const v = b[key];
      if (v === null || v === "") {
        updates[key] = null;
      } else if (typeof v === "number" && Number.isFinite(v)) {
        updates[key] = v;
      } else if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
        updates[key] = Number(v);
      } else {
        return NextResponse.json(
          { error: `${key} must be a number or empty` },
          { status: 400 },
        );
      }
    }
  }
  if ("deadline" in b) {
    const v = b.deadline;
    updates.deadline = typeof v === "string" && v.trim() ? v.trim() : null;
  }
  if (typeof b.url === "string") {
    const raw = b.url.trim();
    if (!raw) {
      updates.url = null;
    } else {
      const safe = safeHttpUrl(raw);
      if (!safe) {
        return NextResponse.json(
          { error: "URL must start with http:// or https://" },
          { status: 400 },
        );
      }
      updates.url = safe;
    }
  }
  if ("sector" in b) updates.sector = sanitizeOptions(b.sector, SECTOR_SET);
  if ("region" in b) updates.region = sanitizeOptions(b.region, REGION_SET);
  if ("eligibility" in b) {
    updates.eligibility = sanitizeOptions(b.eligibility, ELIGIBILITY_SET);
  }
  if (typeof b.status === "string" && EDITABLE_STATUSES.has(b.status)) {
    updates.status = b.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("grants")
    .update(updates)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }
    console.error("[api/admin/grants] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update grant" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, id: data.id });
}

// Permanently delete a grant.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const adminSupabase = createAdminClient();
  const { error, count } = await adminSupabase
    .from("grants")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    console.error("[api/admin/grants] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete grant" },
      { status: 500 },
    );
  }
  if (!count) {
    return NextResponse.json({ error: "Grant not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
