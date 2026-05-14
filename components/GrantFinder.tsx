"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Grant } from "@/types/grant";
import { GrantCard } from "./GrantCard";

const SECTOR_OPTIONS = [
  "Clean energy",
  "Biodiversity",
  "Climate adaptation",
  "Ocean conservation",
  "Sustainable agriculture",
  "Clean transport",
] as const;

const REGION_OPTIONS = [
  "Global",
  "South Asia",
  "Sub-Saharan Africa",
  "Latin America",
  "Europe",
  "Southeast Asia",
  "North America",
  "Middle East & North Africa",
] as const;

const ELIGIBILITY_OPTIONS = [
  "NGOs",
  "Startups",
  "SMEs",
  "Individuals",
  "Research institutions",
] as const;

const selectClass =
  "w-full cursor-pointer appearance-none rounded-xl border border-zinc-200/90 bg-white/90 px-3.5 py-2.5 pr-10 text-sm text-zinc-900 shadow-sm transition-[border-color,background-color] duration-200 ease-out hover:border-emerald-300/70 hover:bg-white focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15";

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

type AmountFilter =
  | ""
  | "under_50k"
  | "50k_500k"
  | "over_500k";

type SortKey = "deadline" | "amount" | "created";

function normalizeGrantRecord(input: unknown): Grant | null {
  const g = (input ?? {}) as Record<string, unknown>;
  if (typeof g.id !== "string" || !g.id.trim()) return null;
  if (typeof g.title !== "string" || !g.title.trim()) return null;

  const toNumber = (value: unknown) =>
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : null;
  const toTextArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : null;
  const toStringOrNull = (value: unknown) => (typeof value === "string" ? value : null);

  return {
    id: g.id.trim(),
    status: typeof g.status === "string" && g.status ? g.status : "approved",
    title: g.title.trim(),
    provider_name:
      typeof g.provider_name === "string"
        ? g.provider_name
        : typeof g.provider === "string"
          ? g.provider
          : null,
    provider: typeof g.provider === "string" ? g.provider : null,
    funding_amount_min: toNumber(g.funding_amount_min) ?? toNumber(g.amount_min),
    funding_amount_max: toNumber(g.funding_amount_max) ?? toNumber(g.amount_max),
    amount_min: toNumber(g.amount_min),
    amount_max: toNumber(g.amount_max),
    short_description:
      typeof g.short_description === "string"
        ? g.short_description
        : typeof g.description === "string"
          ? g.description
          : null,
    description: typeof g.description === "string" ? g.description : null,
    sector: toTextArray(g.sector),
    region: toTextArray(g.region),
    eligibility: toTextArray(g.eligibility),
    deadline: toStringOrNull(g.deadline),
    url: toStringOrNull(g.url),
    application_url: toStringOrNull(g.application_url),
    created_at:
      typeof g.created_at === "string" ? g.created_at : new Date().toISOString(),
  };
}

function amountLabel(v: AmountFilter): string | null {
  switch (v) {
    case "under_50k":
      return "Under $50K";
    case "50k_500k":
      return "$50K to $500K";
    case "over_500k":
      return "$500K and above";
    default:
      return null;
  }
}

function grantMatchesAmount(grant: Grant, filter: AmountFilter): boolean {
  if (!filter) return true;
  const min = grant.funding_amount_min;
  const max = grant.funding_amount_max;
  const low = min ?? max ?? null;
  const high = max ?? min ?? null;
  if (low == null && high == null) return true;

  const overlaps = (a1: number, a2: number, b1: number, b2: number) =>
    a1 <= b2 && b1 <= a2;

  switch (filter) {
    case "under_50k":
      return overlaps(0, 50_000, low ?? 0, high ?? low ?? 0);
    case "50k_500k":
      return overlaps(50_000, 500_000, low ?? 0, high ?? low ?? 0);
    case "over_500k":
      return (high ?? low ?? 0) >= 500_000;
    default:
      return true;
  }
}

function grantMatchesEligibility(grant: Grant, value: string): boolean {
  if (!value) return true;
  return (grant.eligibility ?? []).includes(value);
}

function sortGrants(grants: Grant[], sort: SortKey): Grant[] {
  const copy = [...grants];
  if (sort === "deadline") {
    copy.sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
      const db = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    });
    return copy;
  }
  if (sort === "amount") {
    copy.sort((a, b) => {
      const va = a.funding_amount_max ?? a.funding_amount_min ?? 0;
      const vb = b.funding_amount_max ?? b.funding_amount_min ?? 0;
      return vb - va;
    });
    return copy;
  }
  copy.sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return tb - ta;
  });
  return copy;
}

function GrantCardSkeleton() {
  return (
    <div className="animate-pulse-soft rounded-3xl border border-white/60 bg-white/60 p-5 shadow-sm [backdrop-filter:blur(8px)]">
      <div className="h-5 w-4/5 rounded-lg bg-zinc-200/80" />
      <div className="mt-3 h-4 w-2/5 rounded-md bg-emerald-100/80" />
      <div className="mt-4 h-20 rounded-xl bg-zinc-100/90" />
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-emerald-100/70" />
        <div className="h-6 w-20 rounded-full bg-sky-100/70" />
        <div className="h-6 w-14 rounded-full bg-violet-100/70" />
      </div>
    </div>
  );
}

export function GrantFinder() {
  const isLoggedIn = false;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sector, setSector] = useState("");
  const [region, setRegion] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [amount, setAmount] = useState<AmountFilter>("");
  const [sort, setSort] = useState<SortKey>("deadline");

  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevApiQueryKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 260);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const ac = new AbortController();
    const apiQueryKey = `${sector}|${region}|${debouncedSearch}`;
    const apiParamsChanged = prevApiQueryKeyRef.current !== apiQueryKey;

    if (apiParamsChanged) {
      setLoading(true);
      prevApiQueryKeyRef.current = apiQueryKey;
    }

    setError(null);

    const params = new URLSearchParams();
    if (sector) params.set("sector", sector);
    if (region) params.set("region", region);
    if (debouncedSearch) params.set("q", debouncedSearch);

    fetch(`/api/grants?${params.toString()}`, { signal: ac.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof body?.error === "string" ? body.error : "Failed to load grants",
          );
        }
        return Array.isArray(body)
          ? body.map(normalizeGrantRecord).filter((row): row is Grant => row != null)
          : [];
      })
      .then((data) => {
        if (!ac.signal.aborted) {
          setGrants(data);
        }
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        setGrants([]);
        setError(e instanceof Error ? e.message : "Failed to load grants");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [sector, region, debouncedSearch, sort, eligibility, amount]);

  const visibleGrants = useMemo(() => {
    const filtered = grants.filter(
      (g) =>
        grantMatchesEligibility(g, eligibility) && grantMatchesAmount(g, amount),
    );
    return sortGrants(filtered, sort);
  }, [grants, eligibility, amount, sort]);

  const chips = useMemo(() => {
    const items: { key: string; label: string; onRemove: () => void }[] = [];
    if (sector) {
      items.push({
        key: "sector",
        label: `Sector: ${sector}`,
        onRemove: () => setSector(""),
      });
    }
    if (region) {
      items.push({
        key: "region",
        label: `Region: ${region}`,
        onRemove: () => setRegion(""),
      });
    }
    if (eligibility) {
      items.push({
        key: "eligibility",
        label: `Eligibility: ${eligibility}`,
        onRemove: () => setEligibility(""),
      });
    }
    if (amount) {
      const lbl = amountLabel(amount);
      if (lbl) {
        items.push({
          key: "amount",
          label: `Amount: ${lbl}`,
          onRemove: () => setAmount(""),
        });
      }
    }
    if (debouncedSearch) {
      items.push({
        key: "q",
        label: `Search: “${debouncedSearch}”`,
        onRemove: () => {
          setSearch("");
          setDebouncedSearch("");
        },
      });
    }
    return items;
  }, [sector, region, eligibility, amount, debouncedSearch]);

  const sortOptions = [
    ["deadline", "Deadline", "Soonest first"] as const,
    ["amount", "Amount", "Largest first"] as const,
    ["created", "Date added", "Newest first"] as const,
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="animate-fade-up mb-10 text-center lg:mb-12 lg:text-left">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 shadow-sm ring-1 ring-white/60">
          Green Grant Finder
        </p>
        <h1 className="mt-5 bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-800 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl lg:text-[2.65rem] lg:leading-[1.1]">
          Discover funding for environmental projects
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 lg:mx-0">
          Search approved grants, refine by sector and region, and stay ahead of
          deadlines with a calm, focused layout.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <aside className="w-full shrink-0 lg:sticky lg:top-8 lg:max-w-[20rem]">
          <div className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-[0_8px_40px_-12px_rgba(15,118,110,0.15)] ring-1 ring-emerald-950/[0.04] transition-[border-color,background-color] duration-200 ease-out [backdrop-filter:saturate(160%)_blur(16px)] hover:border-emerald-200/80 hover:bg-white/85">
            <div className="flex items-center gap-3">
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
            <div className="mt-6 flex flex-col gap-5">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-zinc-600">Sector</span>
                <div className="relative">
                  <select
                    className={selectClass}
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
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
                    onChange={(e) => setRegion(e.target.value)}
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
                <span className="font-medium text-zinc-600">
                  Applicants (eligibility)
                </span>
                <div className="relative">
                  <select
                    className={selectClass}
                    value={eligibility}
                    onChange={(e) => setEligibility(e.target.value)}
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
                    onChange={(e) => setAmount(e.target.value as AmountFilter)}
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
                  {sortOptions.map(([value, title, subtitle]) => {
                    const active = sort === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSort(value)}
                        className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-[background-color,color] duration-200 ease-out ${
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
          </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-6">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_8px_32px_-10px_rgba(15,23,42,0.1)] ring-1 ring-emerald-950/[0.04] transition-[border-color,background-color] duration-200 ease-out [backdrop-filter:blur(12px)] hover:border-emerald-200/80 hover:bg-white/90 sm:p-6">
            <label className="block text-sm font-medium text-zinc-600">
              Keywords
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400">
                  <svg
                    className="size-5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Titles, providers, descriptions…"
                  className="w-full rounded-2xl border border-zinc-200/90 bg-zinc-50/90 py-3.5 pl-12 pr-4 text-base text-zinc-900 shadow-inner transition-[border-color,background-color] duration-200 ease-out placeholder:text-zinc-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/15"
                />
              </div>
            </label>

            {chips.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {chips.map((c, i) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={c.onRemove}
                    className="animate-chip-in inline-flex items-center gap-2 rounded-full border border-emerald-200/50 bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-700/20 transition-opacity duration-200 ease-out hover:opacity-95"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <span>{c.label}</span>
                    <span
                      aria-hidden
                      className="flex size-5 items-center justify-center rounded-full bg-white/20 text-sm leading-none"
                    >
                      ×
                    </span>
                    <span className="sr-only">Remove filter</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            className={`results-surface space-y-6 ${loading && grants.length > 0 ? "results-surface--refreshing" : ""}`}
          >
          <div className="flex flex-wrap items-center justify-between gap-3 transition-opacity duration-300">
            <p className="flex items-center gap-2 text-sm text-zinc-600">
              {loading && (
                <span
                  className="relative flex size-2.5"
                  aria-hidden
                >
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </span>
              )}
              <span>
                {loading
                  ? "Refreshing grants…"
                  : `${visibleGrants.length} grant${visibleGrants.length === 1 ? "" : "s"} shown`}
              </span>
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50 to-orange-50/50 px-5 py-4 text-sm text-red-900 shadow-sm ring-1 ring-red-200/40 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] animate-fade-up">
              {error}
            </div>
          )}

          {!loading && !error && visibleGrants.length === 0 && (
            <div className="animate-fade-up rounded-3xl border border-dashed border-zinc-300/80 bg-white/50 px-6 py-14 text-center shadow-inner transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] [backdrop-filter:blur(6px)]">
              <p className="text-base font-medium text-zinc-700">
                No grants match your filters
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
                Try removing a chip or broadening your search — the list updates
                as you go.
              </p>
            </div>
          )}

          {loading && grants.length === 0 && !error && (
            <ul className="grid gap-5 sm:grid-cols-2">
              <li>
                <GrantCardSkeleton />
              </li>
              <li className="hidden sm:block">
                <GrantCardSkeleton />
              </li>
            </ul>
          )}

          <ul
            className={`grid gap-5 sm:grid-cols-2 ${loading && grants.length === 0 && !error ? "hidden" : ""}`}
          >
            {visibleGrants.map((g, i) => (
              <li
                key={g.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 72, 520)}ms` }}
              >
                <GrantCard grant={g} isLoggedIn={isLoggedIn} />
              </li>
            ))}
          </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
