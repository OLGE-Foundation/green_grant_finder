"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Grant } from "@/types/grant";
import { useAuth } from "@/components/auth/AuthProvider";
import type { AmountFilter, SortKey } from "@/lib/grants/constants";
import {
  amountLabel,
  grantMatchesAmount,
  grantMatchesEligibility,
  sortGrants,
} from "@/lib/grants/filters";
import { normalizeGrantRecord } from "@/lib/grants/normalize";

type UseGrantDirectoryOptions = {
  fetchUrl: string;
  enabled?: boolean;
};

export function useGrantDirectory({ fetchUrl, enabled = true }: UseGrantDirectoryOptions) {
  const { user, openAuthModal, pendingBookmarkGrantId, clearPendingBookmark } =
    useAuth();
  const isLoggedIn = !!user;

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
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const prevApiQueryKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 260);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!isLoggedIn) return;

    fetch("/api/bookmarks")
      .then(async (res) => {
        if (!res.ok) return { grantIds: [] as string[] };
        return res.json() as Promise<{ grantIds: string[] }>;
      })
      .then((data) => {
        setBookmarkIds(new Set(data.grantIds ?? []));
      })
      .catch(() => setBookmarkIds(new Set()));
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (!isLoggedIn || !pendingBookmarkGrantId) return;

    fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grantId: pendingBookmarkGrantId }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ saved: boolean }>;
      })
      .then((data) => {
        if (!data) return;
        setBookmarkIds((prev) => {
          const next = new Set(prev);
          if (data.saved) next.add(pendingBookmarkGrantId);
          else next.delete(pendingBookmarkGrantId);
          return next;
        });
        clearPendingBookmark();
      })
      .catch(() => clearPendingBookmark());
  }, [isLoggedIn, pendingBookmarkGrantId, clearPendingBookmark]);

  useEffect(() => {
    if (!enabled) return;

    const ac = new AbortController();
    const apiQueryKey = `${sector}|${region}|${debouncedSearch}|${fetchUrl}`;
    const apiParamsChanged = prevApiQueryKeyRef.current !== apiQueryKey;

    if (apiParamsChanged) {
      prevApiQueryKeyRef.current = apiQueryKey;
    }

    const params = new URLSearchParams();
    if (sector) params.set("sector", sector);
    if (region) params.set("region", region);
    if (debouncedSearch) params.set("q", debouncedSearch);

    void (async () => {
      if (apiParamsChanged) setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${fetchUrl}?${params.toString()}`, {
          signal: ac.signal,
        });
        const body = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof body?.error === "string" ? body.error : "Failed to load grants",
          );
        }
        const data = Array.isArray(body)
          ? body.map(normalizeGrantRecord).filter((row): row is Grant => row != null)
          : [];
        if (!ac.signal.aborted) setGrants(data);
      } catch (e: unknown) {
        if (ac.signal.aborted) return;
        setGrants([]);
        setError(e instanceof Error ? e.message : "Failed to load grants");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [sector, region, debouncedSearch, fetchUrl, enabled]);

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
      items.push({ key: "sector", label: `Sector: ${sector}`, onRemove: () => setSector("") });
    }
    if (region) {
      items.push({ key: "region", label: `Region: ${region}`, onRemove: () => setRegion("") });
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
        items.push({ key: "amount", label: `Amount: ${lbl}`, onRemove: () => setAmount("") });
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

  const handleBookmarkToggle = useCallback(
    async (grantId: string) => {
      const wasSaved = bookmarkIds.has(grantId);
      setBookmarkIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(grantId);
        else next.add(grantId);
        return next;
      });

      try {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grantId }),
        });
        if (!res.ok) throw new Error("Failed to update bookmark");
        const data = (await res.json()) as { saved: boolean };
        setBookmarkIds((prev) => {
          const next = new Set(prev);
          if (data.saved) next.add(grantId);
          else next.delete(grantId);
          return next;
        });
      } catch {
        setBookmarkIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(grantId);
          else next.delete(grantId);
          return next;
        });
      }
    },
    [bookmarkIds],
  );

  const handleBookmarkRequiresAuth = useCallback(
    (grantId: string) => {
      openAuthModal("login", grantId);
    },
    [openAuthModal],
  );

  return {
    isLoggedIn,
    search,
    setSearch,
    sector,
    setSector,
    region,
    setRegion,
    eligibility,
    setEligibility,
    amount,
    setAmount,
    sort,
    setSort,
    visibleGrants: enabled ? visibleGrants : [],
    loading: enabled ? loading : false,
    error: enabled ? error : null,
    chips,
    bookmarkIds: isLoggedIn ? bookmarkIds : new Set<string>(),
    handleBookmarkToggle,
    handleBookmarkRequiresAuth,
  };
}
