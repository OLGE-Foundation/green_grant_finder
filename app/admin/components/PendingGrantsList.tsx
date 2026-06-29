"use client";

import { useEffect, useRef, useState } from "react";
import type { Grant } from "@/types/grant";

export function PendingGrantsList({
  grants,
  search = "",
  onCountChange,
}: {
  grants: Grant[];
  search?: string;
  onCountChange?: (n: number) => void;
}) {
  const [items, setItems] = useState(grants);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The grant currently being rejected (drives the reason modal), or null.
  const [rejectTarget, setRejectTarget] = useState<Grant | null>(null);

  useEffect(() => {
    onCountChange?.(items.length);
  }, [items.length, onCountChange]);

  const q = search.trim().toLowerCase();
  const visible = q
    ? items.filter((g) =>
        `${g.title ?? ""} ${g.provider_name ?? g.provider ?? ""}`
          .toLowerCase()
          .includes(q),
      )
    : items;

  async function decide(
    id: string,
    action: "approve" | "reject",
    rejectionReason?: string,
  ) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/grants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejection_reason: rejectionReason }),
      });
      if (!res.ok) {
        const { error: message } = await res
          .json()
          .catch(() => ({ error: "Request failed" }));
        setError(message ?? "Request failed");
        return;
      }
      setItems((prev) => prev.filter((g) => g.id !== id));
      setRejectTarget(null);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        No pending grants. 🎉
      </p>
    );
  }

  return (
    <>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
          No pending grants match “{search}”.
        </p>
      ) : (
      <ul className="space-y-4">
        {visible.map((grant) => (
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
                  onClick={() => {
                    setError(null);
                    setRejectTarget(grant);
                  }}
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
      )}

      {rejectTarget && (
        <RejectModal
          grant={rejectTarget}
          busy={busy === rejectTarget.id}
          onCancel={() => setRejectTarget(null)}
          onConfirm={(reason) =>
            decide(rejectTarget.id, "reject", reason || undefined)
          }
        />
      )}
    </>
  );
}

function RejectModal({
  grant,
  busy,
  onCancel,
  onConfirm,
}: {
  grant: Grant;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="reject-modal-title"
          className="text-lg font-semibold text-zinc-900"
        >
          Reject grant
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          “{grant.title}” — the reason below is emailed to the submitter.
        </p>
        <label
          htmlFor="reject-reason"
          className="mt-4 block text-xs font-medium text-zinc-600"
        >
          Rejection reason (optional)
        </label>
        <textarea
          id="reject-reason"
          ref={textareaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="mt-1 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="e.g. Duplicate of an existing listing"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(reason.trim())}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Rejecting…" : "Confirm reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
