# Admin Approval Workflow — Implementation Plan

> **Codebase read**: Next.js App Router, `@supabase/ssr`, service-role admin client already wired in, Resend already wired in, `profiles` table exists, `grants.contact_email` captured on submission, `grants.approved_at` auto-set by a DB trigger.

---

## 1. Admin Role — `app_metadata.is_admin`

**Recommendation: store the flag in Supabase Auth `app_metadata`.**

- `app_metadata` can only be written via the service-role Admin API — users cannot set it themselves. `user_metadata` is user-writable and must not be used for this.
- The value is embedded in the JWT, so every server-side check reads it from the session object with zero extra DB queries: `user.app_metadata?.is_admin`.
- RLS policies can reference it directly: `(auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean`.

No new table is needed. Do not add `is_admin` to the `profiles` table — it creates a second source of truth and users could potentially update it via a misconfigured RLS policy.

---

## 2. Database Migration

**New file: `supabase/migrations/20260617000000_phase4_admin_approval.sql`**

```sql
-- Audit columns so you can see who reviewed a grant and why it was rejected
alter table public.grants
  add column if not exists rejection_reason text,
  add column if not exists reviewed_by     uuid references auth.users,
  add column if not exists reviewed_at     timestamptz;

-- RLS: let admins SELECT pending grants (not just approved ones).
-- The anon GET /api/grants route filters at application level; these policies
-- add defence-in-depth if RLS is already enabled on the grants table.
-- If RLS is NOT enabled on grants, these are no-ops but don't hurt.
create policy if not exists "Admins read all grants"
  on public.grants for select
  to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
  );

create policy if not exists "Admins update grants"
  on public.grants for update
  to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
  );
```

> **Note on existing grants status values**: the codebase uses `"pending"` and `"approved"`. Add `"rejected"` as a valid status — no DB constraint change needed since the column is plain `text`, but document it in `types/grant.ts`.

---

## 3. Middleware — Protect `/admin` Paths

**Modify: `lib/supabase/middleware.ts`**

The existing `updateSession` already calls `supabase.auth.getUser()` but discards the result. Capture it and redirect before returning:

```typescript
// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./config";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Reuse the getUser call for the /admin guard
  const { data: { user } } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user || !user.app_metadata?.is_admin) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}
```

`middleware.ts` (root) needs no changes — it still just calls `updateSession`.

---

## 4. Protected Admin Layout

**New file: `app/admin/layout.tsx`**

A Server Component that acts as a second layer of defence (middleware redirect is the first). It also renders the admin chrome.

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Green Grant Finder" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.app_metadata?.is_admin) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b border-emerald-900 bg-emerald-950 px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
          Admin
        </p>
        <h1 className="text-lg font-bold text-white">Green Grant Finder</h1>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
```

---

## 5. Admin Dashboard Page

**New file: `app/admin/page.tsx`**

Fetches pending grants server-side using `createAdminClient()` (service-role key, bypasses RLS — same pattern as `app/api/grants/submit/route.ts` and the weekly digest).

```tsx
import { createAdminClient } from "@/lib/supabase/admin";
import { PendingGrantsList } from "./components/PendingGrantsList";

export const dynamic = "force-dynamic"; // always fresh

export default async function AdminPage() {
  const supabase = createAdminClient();

  const { data: pending, error } = await supabase
    .from("grants")
    .select("id, title, provider, contact_email, source, sector, region, deadline, created_at, additional_notes, description")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-600">Failed to load grants: {error.message}</p>;
  }

  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-zinc-900">Pending grants</h2>
      <p className="mb-8 text-sm text-zinc-500">
        {pending?.length ?? 0} awaiting review
      </p>
      <PendingGrantsList grants={pending ?? []} />
    </div>
  );
}
```

---

## 6. Pending Grants List Component

**New file: `app/admin/components/PendingGrantsList.tsx`**

Client Component — handles the approve/reject actions and inline state updates.

```tsx
"use client";

import { useState } from "react";
import type { Grant } from "@/types/grant";

export function PendingGrantsList({ grants }: { grants: Grant[] }) {
  const [items, setItems] = useState(grants);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, action: "approve" | "reject", reason?: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/grants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        alert(`Error: ${error}`);
        return;
      }
      setItems((prev) => prev.filter((g) => g.id !== id));
    } finally {
      setBusy(null);
    }
  }

  function handleReject(id: string) {
    const reason = prompt("Rejection reason (shown to submitter in email):");
    if (reason === null) return; // cancelled
    decide(id, "reject", reason || undefined);
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        No pending grants. 🎉
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((grant) => (
        <li
          key={grant.id}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold text-zinc-900">{grant.title}</p>
              <p className="mt-0.5 text-sm text-zinc-500">
                {grant.provider_name ?? grant.provider} ·{" "}
                <span className="font-mono text-xs text-zinc-400">{grant.source}</span>
              </p>
              {grant.contact_email && (
                <p className="mt-1 text-xs text-zinc-400">
                  Submitter: {grant.contact_email}
                </p>
              )}
              {grant.description && (
                <p className="mt-3 line-clamp-3 text-sm text-zinc-600">
                  {grant.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                disabled={busy === grant.id}
                onClick={() => decide(grant.id, "approve")}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={busy === grant.id}
                onClick={() => handleReject(grant.id)}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            Submitted {new Date(grant.created_at).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}
```

> For a production build, replace the `prompt()` call with a proper modal/dialog component.

---

## 7. Approve / Reject API Route

**New file: `app/api/admin/grants/[id]/route.ts`**

Pattern mirrors `app/api/grants/submit/route.ts` (uses admin client for DB) but adds a session check first.

```typescript
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

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, reason } = body as { action?: string; reason?: string };

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'" },
      { status: 400 },
    );
  }

  // 3. Update the grant (admin client bypasses RLS)
  const { id } = await params;
  const adminSupabase = createAdminClient();

  const { data: grant, error } = await adminSupabase
    .from("grants")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      ...(action === "reject" && reason ? { rejection_reason: reason } : {}),
    })
    .eq("id", id)
    .eq("status", "pending") // safety: only transition from pending
    .select("title, contact_email")
    .single();

  if (error) {
    console.error("[api/admin/grants] update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!grant) {
    // Row not found or status wasn't "pending"
    return NextResponse.json(
      { error: "Grant not found or already reviewed" },
      { status: 404 },
    );
  }

  // 4. Send notification email (fire-and-forget — don't fail the request on email error)
  if (grant.contact_email) {
    sendGrantDecisionEmail({
      to: grant.contact_email,
      grantTitle: grant.title,
      action,
      reason,
    }).catch((err) =>
      console.error("[api/admin/grants] email error:", err),
    );
  }

  return NextResponse.json({
    success: true,
    status: action === "approve" ? "approved" : "rejected",
  });
}
```

> **Important**: `params` in Next.js 15/16 is a `Promise` — note the `await params` on line 3 of the handler body. This matches the pattern for dynamic segments in the latest Next.js App Router.

---

## 8. Email Notification

Follow the same two-file pattern as the weekly digest:

### `lib/email/templates/grant-decision.ts`

Pure rendering function, no side effects.

```typescript
export function renderGrantDecisionHtml(
  grantTitle: string,
  action: "approve" | "reject",
  reason?: string,
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
        <strong>${grantTitle}</strong> has been
        ${approved ? "approved and is now live in the Green Grant Finder directory." : "reviewed but was not approved at this time."}
      </p>
      ${
        !approved && reason
          ? `<div style="background:#fef2f2;border-radius:8px;padding:12px;margin-bottom:16px">
               <p style="color:#7f1d1d;font-size:13px;margin:0"><strong>Reason:</strong> ${reason}</p>
             </div>`
          : ""
      }
      <p style="color:#71717a;font-size:12px;margin-top:24px">
        Green Grant Finder · <a href="https://greenGrantFinder.com" style="color:#047857">greenGrantFinder.com</a>
      </p>
    </div>
  </body>
</html>`;
}
```

### `lib/email/grant-decision.ts`

```typescript
import { getFromEmail, getResendClient } from "./resend";
import { renderGrantDecisionHtml } from "./templates/grant-decision";

export async function sendGrantDecisionEmail({
  to,
  grantTitle,
  action,
  reason,
}: {
  to: string;
  grantTitle: string;
  action: "approve" | "reject";
  reason?: string;
}): Promise<void> {
  const resend = getResendClient();
  const subject =
    action === "approve"
      ? `Your grant "${grantTitle}" has been approved`
      : `Update on your grant submission: "${grantTitle}"`;

  await resend.emails.send({
    from: getFromEmail(),
    to,
    subject,
    html: renderGrantDecisionHtml(grantTitle, action, reason),
  });
}
```

---

## 9. Update `types/grant.ts`

Add the new columns from the migration and the `"rejected"` status:

```typescript
// types/grant.ts — add to the Grant type:
rejection_reason?: string | null;
reviewed_by?: string | null;
reviewed_at?: string | null;
```

`status` is already typed as `string`, which covers `"rejected"`. If you want to tighten it:
```typescript
status: "pending" | "approved" | "rejected";
```

---

## 10. Seed the First Admin User

### Option A — One-time script (recommended)

**New file: `scripts/make-admin.ts`**

```typescript
import { createAdminClient } from "../lib/supabase/admin";

async function makeAdmin(email: string) {
  const supabase = createAdminClient();

  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error(error.message); process.exit(1); }

  const user = users.find((u) => u.email === email);
  if (!user) { console.error(`No user with email: ${email}`); process.exit(1); }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, is_admin: true },
  });

  if (updateError) { console.error(updateError.message); process.exit(1); }
  console.log(`✓ ${email} (${user.id}) is now an admin.`);
}

makeAdmin(process.argv[2] ?? "");
```

Run once:
```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npx ts-node --esm scripts/make-admin.ts your@email.com
```

### Option B — Supabase Dashboard (no code needed)

Authentication → Users → click the user → **Edit** → App Metadata → paste `{"is_admin": true}` → Save.

The change takes effect on the user's next login (new JWT issued).

---

## Files to Create / Modify — In Order

| # | Action | File |
|---|--------|------|
| 1 | **Create** | `supabase/migrations/20260617000000_phase4_admin_approval.sql` |
| 2 | **Modify** | `lib/supabase/middleware.ts` — add `/admin` redirect guard |
| 3 | **Create** | `lib/email/templates/grant-decision.ts` |
| 4 | **Create** | `lib/email/grant-decision.ts` |
| 5 | **Create** | `app/api/admin/grants/[id]/route.ts` |
| 6 | **Create** | `app/admin/layout.tsx` |
| 7 | **Create** | `app/admin/page.tsx` |
| 8 | **Create** | `app/admin/components/PendingGrantsList.tsx` |
| 9 | **Modify** | `types/grant.ts` — add `rejection_reason`, `reviewed_by`, `reviewed_at`, optional status union |
| 10 | **Create** | `scripts/make-admin.ts` — one-time seeding script |

Run the migration (step 1) and designate the first admin (step 10 / Option B) before deploying the code changes.

---

## Key Design Decisions

**Why `app_metadata` and not a `profiles.is_admin` column?**
Only the service-role key can write `app_metadata`. A column in `profiles` could be accidentally left writable by a loose RLS policy. Belt-and-suspenders: even if the middleware redirect is bypassed, the route handler re-checks the JWT on every request.

**Why does the API route use `createAdminClient()` for the DB update?**
The same pattern already used by `/api/grants/submit` and the weekly digest cron. The service-role client bypasses RLS, which is correct here since we've already authenticated the caller in application code.

**Why `.eq("status", "pending")` in the PATCH update?**
Prevents double-approvals or double-rejections if an admin clicks twice or two admins act simultaneously. If the row is already `approved` or `rejected`, the `.single()` returns null (no rows matched) and the route returns 404.

**Email is fire-and-forget.**
The PATCH returns 200 as soon as the DB update succeeds. The email is sent asynchronously with `.catch(console.error)`. This matches the pattern in the weekly digest cron. If email delivery matters for your SLA, use a queue (Inngest, Trigger.dev) instead.
