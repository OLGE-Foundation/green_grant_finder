import { GrantFinder } from "@/components/GrantFinder";

export default function Home() {
  return (
    <div className="relative min-h-full text-zinc-900">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[#f4f9f6]"
        aria-hidden
      />
      <div
        className="ambient-layer pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-30%,rgba(52,211,153,0.28),transparent_55%)]"
        aria-hidden
      />
      <div
        className="ambient-layer ambient-layer--delayed pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_100%_0%,rgba(56,189,248,0.12),transparent_45%)]"
        aria-hidden
      />
      <div
        className="ambient-layer pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_50%_40%_at_0%_100%,rgba(167,139,250,0.08),transparent_50%)]"
        aria-hidden
      />
      <GrantFinder />
    </div>
  );
}
