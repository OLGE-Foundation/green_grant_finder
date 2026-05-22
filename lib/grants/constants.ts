export const SECTOR_OPTIONS = [
  "Clean energy",
  "Biodiversity",
  "Climate adaptation",
  "Ocean conservation",
  "Sustainable agriculture",
  "Clean transport",
] as const;

export const REGION_OPTIONS = [
  "Global",
  "South Asia",
  "Sub-Saharan Africa",
  "Latin America",
  "Europe",
  "Southeast Asia",
  "North America",
  "Middle East & North Africa",
] as const;

export const ELIGIBILITY_OPTIONS = [
  "NGOs",
  "Startups",
  "SMEs",
  "Individuals",
  "Research institutions",
] as const;

export type SectorOption = (typeof SECTOR_OPTIONS)[number];
export type RegionOption = (typeof REGION_OPTIONS)[number];
export type EligibilityOption = (typeof ELIGIBILITY_OPTIONS)[number];

export type AmountFilter = "" | "under_50k" | "50k_500k" | "over_500k";
export type SortKey = "deadline" | "amount" | "created";

export const selectClass =
  "w-full cursor-pointer appearance-none rounded-xl border border-zinc-200/90 bg-white/90 px-3.5 py-2.5 pr-10 text-sm text-zinc-900 shadow-sm transition-[border-color,background-color] duration-200 ease-out hover:border-emerald-300/70 hover:bg-white focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15";

export const SORT_OPTIONS = [
  ["deadline", "Deadline", "Soonest first"] as const,
  ["amount", "Amount", "Largest first"] as const,
  ["created", "Date added", "Newest first"] as const,
];
