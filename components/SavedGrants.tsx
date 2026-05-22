"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AlertPreferences } from "@/components/AlertPreferences";
import { GrantFiltersPanel } from "@/components/GrantFiltersPanel";
import { GrantResultsGrid } from "@/components/GrantResultsGrid";
import { GrantSearchBar } from "@/components/GrantSearchBar";
import { useGrantDirectory } from "@/lib/hooks/useGrantDirectory";

export function SavedGrants() {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const directory = useGrantDirectory({
    fetchUrl: "/api/grants/saved",
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="rounded-3xl border border-dashed border-zinc-300/80 bg-white/60 px-6 py-14 [backdrop-filter:blur(6px)]">
          <h1 className="text-2xl font-bold text-emerald-950">Your saved grants</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Log in to view and manage your bookmarked grants.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="rounded-full bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Log in
            </button>
            <Link
              href="/login"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:border-emerald-300"
            >
              Go to login page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="animate-fade-up mb-10 text-center lg:mb-12 lg:text-left">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 shadow-sm ring-1 ring-white/60">
          Saved grants
        </p>
        <h1 className="mt-5 bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-800 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
          Your bookmarked opportunities
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 lg:mx-0">
          Search and filter your saved grants with the same tools as the main directory.
        </p>
      </header>

      <AlertPreferences />

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <GrantFiltersPanel
          sector={directory.sector}
          region={directory.region}
          eligibility={directory.eligibility}
          amount={directory.amount}
          sort={directory.sort}
          onSectorChange={directory.setSector}
          onRegionChange={directory.setRegion}
          onEligibilityChange={directory.setEligibility}
          onAmountChange={directory.setAmount}
          onSortChange={directory.setSort}
        />

        <section className="min-w-0 flex-1 space-y-6">
          <GrantSearchBar
            search={directory.search}
            onSearchChange={directory.setSearch}
            chips={directory.chips}
          />
          <GrantResultsGrid
            grants={directory.visibleGrants}
            loading={directory.loading}
            error={directory.error}
            isLoggedIn={directory.isLoggedIn}
            bookmarkIds={directory.bookmarkIds}
            onBookmarkToggle={directory.handleBookmarkToggle}
            onBookmarkRequiresAuth={directory.handleBookmarkRequiresAuth}
            emptyTitle="No saved grants match your filters"
            emptyDescription="Bookmark grants from the directory, or adjust your filters to see more results."
          />
        </section>
      </div>
    </div>
  );
}
