import { createAdminClient } from "@/lib/supabase/admin";
import type { Grant } from "@/types/grant";
import { AdminDashboard } from "./components/AdminDashboard";

export const dynamic = "force-dynamic"; // always fresh

const ADMIN_COLUMNS =
  "id, title, provider, contact_email, source, sector, region, eligibility, deadline, created_at, additional_notes, description, amount_min, amount_max, url, status";

export default async function AdminPage() {
  const supabase = createAdminClient();

  const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
    supabase
      .from("grants")
      .select(ADMIN_COLUMNS)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("grants")
      .select(ADMIN_COLUMNS)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("grants")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
  ]);

  if (pendingRes.error || approvedRes.error) {
    console.error(
      "[admin] load error:",
      pendingRes.error ?? approvedRes.error,
    );
    return <p className="text-red-600">Failed to load grants.</p>;
  }

  const pending = (pendingRes.data ?? []) as Grant[];
  const approved = (approvedRes.data ?? []) as Grant[];
  const rejectedCount = rejectedRes.count ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-900">Grant dashboard</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Review submissions and manage the public directory.
        </p>
      </div>
      <AdminDashboard
        pending={pending}
        approved={approved}
        rejectedCount={rejectedCount}
      />
    </div>
  );
}
