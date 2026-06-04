import type { Grant } from "@/types/grant";
import { motion, AnimatePresence } from "framer-motion";
import { GrantCard } from "./GrantCard";

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

type GrantResultsGridProps = {
  grants: Grant[];
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  bookmarkIds: Set<string>;
  onBookmarkToggle: (grantId: string) => void;
  onBookmarkRequiresAuth: (grantId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function GrantResultsGrid({
  grants,
  loading,
  error,
  isLoggedIn,
  bookmarkIds,
  onBookmarkToggle,
  onBookmarkRequiresAuth,
  emptyTitle = "No grants match your filters",
  emptyDescription = "Try removing a chip or broadening your search — the list updates as you go.",
}: GrantResultsGridProps) {
  return (
    <div
      className={`results-surface space-y-4 sm:space-y-6 ${loading && grants.length > 0 ? "results-surface--refreshing" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 transition-opacity duration-300">
        <p className="flex items-center gap-2 text-sm text-zinc-600">
          {loading && (
            <span className="relative flex size-2.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
          )}
          <span>
            {loading
              ? "Refreshing grants…"
              : `${grants.length} grant${grants.length === 1 ? "" : "s"} shown`}
          </span>
        </p>
      </div>

      {error && (
        <div className="animate-fade-up rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50 to-orange-50/50 px-5 py-4 text-sm text-red-900 shadow-sm ring-1 ring-red-200/40">
          {error}
        </div>
      )}

      {!loading && !error && grants.length === 0 && (
        <div className="animate-fade-up rounded-3xl border border-dashed border-zinc-300/80 bg-white/50 px-6 py-14 text-center shadow-inner [backdrop-filter:blur(6px)]">
          <p className="text-base font-medium text-zinc-700">{emptyTitle}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
            {emptyDescription}
          </p>
        </div>
      )}

      {loading && grants.length === 0 && !error && (
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <li>
            <GrantCardSkeleton />
          </li>
          <li className="hidden sm:block">
            <GrantCardSkeleton />
          </li>
        </ul>
      )}

      <motion.ul
        layout
        className={`grid gap-4 sm:grid-cols-2 sm:gap-5 ${loading && grants.length === 0 && !error ? "hidden" : ""}`}
      >
        <AnimatePresence mode="popLayout">
          {grants.map((g, i) => (
            <motion.li
              key={g.id}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
            >
              <GrantCard
                grant={g}
                isLoggedIn={isLoggedIn}
                saved={bookmarkIds.has(g.id)}
                onBookmarkToggle={() => onBookmarkToggle(g.id)}
                onBookmarkRequiresAuth={() => onBookmarkRequiresAuth(g.id)}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
