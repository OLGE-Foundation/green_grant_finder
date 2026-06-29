"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Grant } from "@/types/grant";
import {
  ELIGIBILITY_OPTIONS,
  REGION_OPTIONS,
  SECTOR_OPTIONS,
} from "@/lib/grants/constants";

type GrantUpdate = {
  title: string;
  provider: string;
  description: string;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  url: string;
  sector: string[];
  region: string[];
  eligibility: string[];
};

export function ApprovedGrantsList({
  grants,
  search = "",
  onCountChange,
}: {
  grants: Grant[];
  search?: string;
  onCountChange?: (n: number) => void;
}) {
  const [items, setItems] = useState(grants);
  const [error, setError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Grant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Grant | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function handleSave(id: string, updates: GrantUpdate): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/grants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const { error: msg } = await res
          .json()
          .catch(() => ({ error: "Request failed" }));
        setError(msg ?? "Request failed");
        return;
      }
      setItems((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      );
      setEditTarget(null);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/grants/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error: msg } = await res
          .json()
          .catch(() => ({ error: "Request failed" }));
        setError(msg ?? "Request failed");
        return;
      }
      setItems((prev) => prev.filter((g) => g.id !== id));
      setDeleteTarget(null);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        No approved grants yet.
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
          No approved grants match “{search}”.
        </p>
      ) : (
      <motion.ul layout className="space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
        {visible.map((grant) => {
          const provider = grant.provider_name ?? grant.provider;
          const min = grant.funding_amount_min ?? grant.amount_min;
          const max = grant.funding_amount_max ?? grant.amount_max;
          return (
            <motion.li
              key={grant.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-900">
                  {grant.title}
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {provider ?? "Unknown provider"}
                  {(min != null || max != null) && (
                    <>
                      {" · "}
                      {formatRange(min ?? null, max ?? null)}
                    </>
                  )}
                  {grant.deadline && (
                    <>
                      {" · "}
                      {new Date(grant.deadline).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  disabled={busyId === grant.id}
                  onClick={() => {
                    setError(null);
                    setEditTarget(grant);
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  disabled={busyId === grant.id}
                  onClick={() => {
                    setError(null);
                    setDeleteTarget(grant);
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </motion.li>
          );
        })}
        </AnimatePresence>
      </motion.ul>
      )}

      {editTarget && (
        <EditModal
          grant={editTarget}
          busy={busyId === editTarget.id}
          onCancel={() => setEditTarget(null)}
          onSave={(updates) => handleSave(editTarget.id, updates)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          grant={deleteTarget}
          busy={busyId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget.id)}
        />
      )}
    </>
  );
}

function formatRange(min: number | null, max: number | null): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  if (max != null) return `Up to ${fmt(max)}`;
  return "Amount on request";
}

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

function EditModal({
  grant,
  busy,
  onCancel,
  onSave,
}: {
  grant: Grant;
  busy: boolean;
  onCancel: () => void;
  onSave: (updates: GrantUpdate) => void;
}) {
  const [title, setTitle] = useState(grant.title ?? "");
  const [provider, setProvider] = useState(
    grant.provider_name ?? grant.provider ?? "",
  );
  const [description, setDescription] = useState(
    grant.short_description ?? grant.description ?? "",
  );
  const [amountMin, setAmountMin] = useState(
    String(grant.funding_amount_min ?? grant.amount_min ?? ""),
  );
  const [amountMax, setAmountMax] = useState(
    String(grant.funding_amount_max ?? grant.amount_max ?? ""),
  );
  const [deadline, setDeadline] = useState(
    grant.deadline ? grant.deadline.slice(0, 10) : "",
  );
  const [url, setUrl] = useState(grant.application_url ?? grant.url ?? "");
  const [sector, setSector] = useState<string[]>(grant.sector ?? []);
  const [region, setRegion] = useState<string[]>(grant.region ?? []);
  const [eligibility, setEligibility] = useState<string[]>(
    grant.eligibility ?? [],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  function toggle(
    value: string,
    list: string[],
    setList: (v: string[]) => void,
  ) {
    setList(
      list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value],
    );
  }

  function submit() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      provider: provider.trim(),
      description: description.trim(),
      amount_min: amountMin.trim() === "" ? null : Number(amountMin),
      amount_max: amountMax.trim() === "" ? null : Number(amountMax),
      deadline: deadline || null,
      url: url.trim(),
      sector,
      region,
      eligibility,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="edit-modal-title" className="text-lg font-semibold text-zinc-900">
          Edit grant
        </h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Title
            </label>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Provider
            </label>
            <input
              className={inputClass}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Description
            </label>
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600">
                Amount min (USD)
              </label>
              <input
                type="number"
                className={inputClass}
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">
                Amount max (USD)
              </label>
              <input
                type="number"
                className={inputClass}
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600">
                Deadline
              </label>
              <input
                type="date"
                className={inputClass}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">
                Application URL
              </label>
              <input
                type="url"
                placeholder="https://…"
                className={inputClass}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>

          <CheckboxGroup
            label="Sector"
            options={SECTOR_OPTIONS}
            selected={sector}
            onToggle={(v) => toggle(v, sector, setSector)}
          />
          <CheckboxGroup
            label="Region"
            options={REGION_OPTIONS}
            selected={region}
            onToggle={(v) => toggle(v, region, setRegion)}
          />
          <CheckboxGroup
            label="Eligibility"
            options={ELIGIBILITY_OPTIONS}
            selected={eligibility}
            onToggle={(v) => toggle(v, eligibility, setEligibility)}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
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
            disabled={busy || !title.trim()}
            onClick={submit}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="block text-xs font-medium text-zinc-600">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  grant,
  busy,
  onCancel,
  onConfirm,
}: {
  grant: Grant;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="delete-modal-title"
          className="text-lg font-semibold text-zinc-900"
        >
          Delete grant
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Permanently delete “{grant.title}”? This removes it from the public
          directory and cannot be undone.
        </p>
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
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
