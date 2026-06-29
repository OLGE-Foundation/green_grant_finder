"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Grant } from "@/types/grant";
import { PendingGrantsList } from "./PendingGrantsList";
import { ApprovedGrantsList } from "./ApprovedGrantsList";

type Props = {
  pending: Grant[];
  approved: Grant[];
  rejectedCount: number;
};

export function AdminDashboard({ pending, approved, rejectedCount }: Props) {
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [query, setQuery] = useState("");
  // Live counts so the stat cards update as grants are approved/edited/deleted.
  const [pendingCount, setPendingCount] = useState(pending.length);
  const [approvedCount, setApprovedCount] = useState(approved.length);

  const total = pendingCount + approvedCount + rejectedCount;

  const stats: {
    key: string;
    label: string;
    value: number;
    accent: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "pending",
      label: "Pending review",
      value: pendingCount,
      accent: "text-amber-600 bg-amber-50 ring-amber-200",
      icon: <ClockIcon />,
    },
    {
      key: "approved",
      label: "Live in directory",
      value: approvedCount,
      accent: "text-emerald-600 bg-emerald-50 ring-emerald-200",
      icon: <CheckIcon />,
    },
    {
      key: "rejected",
      label: "Rejected",
      value: rejectedCount,
      accent: "text-rose-600 bg-rose-50 ring-rose-200",
      icon: <XIcon />,
    },
    {
      key: "total",
      label: "Total grants",
      value: total,
      accent: "text-zinc-600 bg-zinc-100 ring-zinc-200",
      icon: <StackIcon />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {s.label}
              </p>
              <span
                className={`flex size-8 items-center justify-center rounded-full ring-1 ${s.accent}`}
              >
                {s.icon}
              </span>
            </div>
            <motion.p
              key={s.value}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 text-3xl font-bold text-zinc-900"
            >
              {s.value}
            </motion.p>
          </motion.div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Grant queues"
          className="inline-flex rounded-full bg-zinc-100 p-1"
        >
          <TabButton
            active={tab === "pending"}
            onClick={() => setTab("pending")}
            label="Pending"
            count={pendingCount}
          />
          <TabButton
            active={tab === "approved"}
            onClick={() => setTab("approved")}
            label="Approved"
            count={approvedCount}
          />
        </div>

        <div className="relative sm:w-72">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or provider…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Lists — both mounted so counts stay live; inactive is hidden. */}
      <div role="tabpanel" className={tab === "pending" ? "" : "hidden"}>
        <PendingGrantsList
          grants={pending}
          search={query}
          onCountChange={setPendingCount}
        />
      </div>
      <div role="tabpanel" className={tab === "approved" ? "" : "hidden"}>
        <ApprovedGrantsList
          grants={approved}
          search={query}
          onCountChange={setApprovedCount}
        />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
        active ? "text-emerald-900" : "text-zinc-500 hover:text-zinc-800"
      }`}
    >
      {active && (
        <motion.span
          layoutId="admin-tab-pill"
          className="absolute inset-0 rounded-full bg-white shadow-sm"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span className="relative z-10">{label}</span>
      <span
        className={`relative z-10 rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${
          active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ClockIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v5l3 2" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function StackIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinejoin="round" d="M12 3l9 5-9 5-9-5 9-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l9 5 9-5" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
    </svg>
  );
}
