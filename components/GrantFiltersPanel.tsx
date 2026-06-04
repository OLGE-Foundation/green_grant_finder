"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ELIGIBILITY_OPTIONS,
  REGION_OPTIONS,
  SECTOR_OPTIONS,
  SORT_OPTIONS,
  selectClass,
  type AmountFilter,
  type SortKey,
} from "@/lib/grants/constants";

function SelectChevron() {
  return (
    <span
      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
      aria-hidden
    >
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

type GrantFiltersPanelProps = {
  sector: string;
  region: string;
  eligibility: string;
  amount: AmountFilter;
  sort: SortKey;
  onSectorChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onEligibilityChange: (value: string) => void;
  onAmountChange: (value: AmountFilter) => void;
  onSortChange: (value: SortKey) => void;
};

function countActiveFilters(
  sector: string,
  region: string,
  eligibility: string,
  amount: AmountFilter,
): number {
  let count = 0;
  if (sector) count++;
  if (region) count++;
  if (eligibility) count++;
  if (amount) count++;
  return count;
}

function FilterControls({
  sector,
  region,
  eligibility,
  amount,
  sort,
  onSectorChange,
  onRegionChange,
  onEligibilityChange,
  onAmountChange,
  onSortChange,
}: GrantFiltersPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-600">Sector</span>
        <div className="relative">
          <select
            className={selectClass}
            value={sector}
            onChange={(e) => onSectorChange(e.target.value)}
          >
            <option value="">All sectors</option>
            {SECTOR_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-600">Region</span>
        <div className="relative">
          <select
            className={selectClass}
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
          >
            <option value="">All regions</option>
            {REGION_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-600">Applicants (eligibility)</span>
        <div className="relative">
          <select
            className={selectClass}
            value={eligibility}
            onChange={(e) => onEligibilityChange(e.target.value)}
          >
            <option value="">All applicants</option>
            {ELIGIBILITY_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-600">Amount</span>
        <div className="relative">
          <select
            className={selectClass}
            value={amount}
            onChange={(e) => onAmountChange(e.target.value as AmountFilter)}
          >
            <option value="">Any amount</option>
            <option value="under_50k">Under $50K</option>
            <option value="50k_500k">$50K to $500K</option>
            <option value="over_500k">$500K and above</option>
          </select>
          <SelectChevron />
        </div>
      </label>

      <div className="border-t border-zinc-200/80 pt-5">
        <p className="text-sm font-medium text-zinc-600">Sort by</p>
        <div className="mt-3 flex flex-col gap-1.5 rounded-2xl bg-zinc-100/80 p-1.5 ring-1 ring-zinc-200/60">
          {SORT_OPTIONS.map(([value, title, subtitle]) => {
            const active = sort === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onSortChange(value)}
                className={`touch-target flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-[background-color,color] duration-200 ease-out ${
                  active
                    ? "bg-white text-emerald-950 shadow-md shadow-zinc-900/5 ring-1 ring-emerald-200/80"
                    : "text-zinc-600 hover:bg-white/60 hover:text-zinc-900"
                }`}
              >
                <span className="text-sm font-semibold">{title}</span>
                <span
                  className={`text-xs ${active ? "text-emerald-700/80" : "text-zinc-500"}`}
                >
                  {subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GrantFiltersPanel(props: GrantFiltersPanelProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const activeCount = countActiveFilters(props.sector, props.region, props.eligibility, props.amount);

  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:max-w-[20rem]">
      <div className="rounded-3xl border border-white/70 bg-white/75 shadow-[0_8px_40px_-12px_rgba(15,118,110,0.15)] ring-1 ring-emerald-950/[0.04] transition-[border-color,background-color] duration-200 ease-out [backdrop-filter:saturate(160%)_blur(16px)] hover:border-emerald-200/80 hover:bg-white/85">
        {/* --- Desktop layout: always visible, never collapses --- */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-3 p-6">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-white/50">
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </span>
            <h2 className="text-base font-semibold tracking-tight text-emerald-950">
              Filters & sort
            </h2>
          </div>
          <div className="px-6 pb-6">
            <FilterControls {...props} />
          </div>
        </div>

        {/* --- Mobile layout: collapsible toggle --- */}
        <div className="lg:hidden">
          {/* Toggle header */}
          <button
            type="button"
            onClick={() => setMobileExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-3 p-4"
            aria-expanded={mobileExpanded}
            aria-controls="filter-panel-content"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-white/50">
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
              </span>
              <span className="text-sm font-semibold tracking-tight text-emerald-950">
                Filters & sort
                {activeCount > 0 && (
                  <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white align-middle">
                    {activeCount}
                  </span>
                )}
              </span>
            </div>
            <ChevronIcon open={mobileExpanded} />
          </button>

          {/* Collapsible content */}
          <AnimatePresence initial={false}>
            {mobileExpanded && (
              <motion.div
                id="filter-panel-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="border-t border-zinc-100/80 px-4 pb-5 pt-2">
                  <FilterControls {...props} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
