import { createAdminClient } from "@/lib/supabase/admin";
import type { Grant } from "@/types/grant";
import { PendingGrantsList } from "./components/PendingGrantsList";

export const dynamic = "force-dynamic"; // always fresh

export default async function AdminPage() {
  const supabase = createAdminClient();

  const { data: pending, error } = await supabase
    .from("grants")
    .select(
      "id, title, provider, contact_email, source, sector, region, deadline, created_at, additional_notes, description",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-red-600">Failed to load grants: {error.message}</p>
    );
  }

  const grants = (pending ?? []) as Grant[];

  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-zinc-900">Pending grants</h2>
      <p className="mb-8 text-sm text-zinc-500">
        {grants.length} awaiting review
      </p>
      <PendingGrantsList grants={grants} />
    </div>
  );
}
