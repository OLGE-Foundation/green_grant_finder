"use client";

import { useState } from "react";
import type { Grant } from "@/types/grant";

export function PendingGrantsList({ grants }: { grants: Grant[] }) {
  const [items, setItems] = useState(grants);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(
    id: string,
    action: "approve" | "reject",
    rejectionReason?: string,
  ) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/grants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejection_reason: rejectionReason }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
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
                <span className="font-mono text-xs text-zinc-400">
                  {grant.source}
                </span>
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
            Submitted{" "}
            {new Date(grant.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}
