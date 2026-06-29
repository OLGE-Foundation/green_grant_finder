import { createAdminClient } from "@/lib/supabase/admin";
import type { Grant } from "@/types/grant";
import { PendingGrantsList } from "./components/PendingGrantsList";
import { ApprovedGrantsList } from "./components/ApprovedGrantsList";

export const dynamic = "force-dynamic"; // always fresh

const ADMIN_COLUMNS =
  "id, title, provider, contact_email, source, sector, region, eligibility, deadline, created_at, additional_notes, description, amount_min, amount_max, url, status";

export default async function AdminPage() {
  const supabase = createAdminClient();

  const [pendingRes, approvedRes] = await Promise.all([
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

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-1 text-2xl font-bold text-zinc-900">Pending grants</h2>
        <p className="mb-8 text-sm text-zinc-500">
          {pending.length} awaiting review
        </p>
        <PendingGrantsList grants={pending} />
      </section>

      <section>
        <h2 className="mb-1 text-2xl font-bold text-zinc-900">
          Approved grants
        </h2>
        <p className="mb-8 text-sm text-zinc-500">
          {approved.length} live in the directory — edit or remove
        </p>
        <ApprovedGrantsList grants={approved} />
      </section>
    </div>
  );
}
