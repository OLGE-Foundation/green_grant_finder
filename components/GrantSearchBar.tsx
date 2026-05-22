type FilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

type GrantSearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  chips: FilterChip[];
};

export function GrantSearchBar({ search, onSearchChange, chips }: GrantSearchBarProps) {
  return (
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
            onChange={(e) => onSearchChange(e.target.value)}
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
  );
}
