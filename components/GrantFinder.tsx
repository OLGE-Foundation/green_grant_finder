"use client";

import { GrantFiltersPanel } from "./GrantFiltersPanel";
import { GrantResultsGrid } from "./GrantResultsGrid";
import { GrantSearchBar } from "./GrantSearchBar";
import { useGrantDirectory } from "@/lib/hooks/useGrantDirectory";

export function GrantFinder() {
  const directory = useGrantDirectory({ fetchUrl: "/api/grants" });

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
          />
        </section>
      </div>
    </div>
  );
}
