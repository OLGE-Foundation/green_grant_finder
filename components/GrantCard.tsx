"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Grant } from "@/types/grant";
import { safeHttpUrl } from "@/lib/grants/url";

function formatFundingRange(min: number | null, max: number | null): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  if (min != null && max != null) {
    return `${fmt(min)} – ${fmt(max)}`;
  }
  if (min != null) return `${fmt(min)}+`;
  if (max != null) return `Up to ${fmt(max)}`;
  return "Amount on request";
}

function daysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

type GrantCardProps = {
  grant: Grant;
  style?: CSSProperties;
  isLoggedIn?: boolean;
  saved?: boolean;
  onBookmarkToggle?: () => void;
  onBookmarkRequiresAuth?: () => void;
};

function normalizeGrant(grant: Grant) {
  return {
    providerName: grant.provider_name ?? grant.provider ?? "Unknown provider",
    minAmount: grant.funding_amount_min ?? grant.amount_min ?? null,
    maxAmount: grant.funding_amount_max ?? grant.amount_max ?? null,
    description: grant.short_description ?? grant.description ?? "",
    applicationUrl: safeHttpUrl(grant.application_url ?? grant.url),
  };
}

function deadlineIndicator(deadline: string | null, daysLeft: number | null) {
  if (!deadline || daysLeft == null) {
    return { label: "No deadline", tone: "neutral" as const };
  }
  if (daysLeft < 0) {
    return { label: "Closed", tone: "closed" as const };
  }
  if (daysLeft === 0) {
    return { label: "Closes today", tone: "urgent" as const };
  }
  if (daysLeft <= 7) {
    return {
      label: `Urgent: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
      tone: "urgent" as const,
    };
  }
  if (daysLeft <= 30) {
    return {
      label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
      tone: "soon" as const,
    };
  }
  return {
    label: new Date(deadline).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    tone: "normal" as const,
  };
}

function StarIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      />
    </svg>
  );
}

export function GrantCard({
  grant,
  style,
  isLoggedIn = false,
  saved = false,
  onBookmarkToggle,
  onBookmarkRequiresAuth,
}: GrantCardProps) {
  const [expanded, setExpanded] = useState(false);
  const daysLeft = useMemo(() => daysUntilDeadline(grant.deadline), [grant.deadline]);
  const normalized = normalizeGrant(grant);
  const urgency = deadlineIndicator(grant.deadline, daysLeft);
  const description = normalized.description.trim();
  const longDescription = description.length > 180;

  function handleBookmarkClick() {
    if (isLoggedIn) {
      onBookmarkToggle?.();
    } else {
      onBookmarkRequiresAuth?.();
    }
  }

  return (
    <motion.article
      layout
      style={style}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-5 shadow-[0_2px_16px_-2px_rgba(15,118,110,0.08),0_8px_32px_-8px_rgba(15,23,42,0.06)] outline-none ring-1 ring-transparent transition-[border-color,background-color] duration-300 ease-out [backdrop-filter:saturate(140%)_blur(10px)] hover:border-emerald-300/55 hover:bg-white/95 focus-visible:border-emerald-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100"
        aria-hidden
      />

      <motion.div layout className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug tracking-tight text-emerald-950 transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-emerald-800 sm:text-lg">
            {grant.title}
          </h3>
          <p className="mt-1.5 text-sm font-medium text-emerald-700/85">
            {normalized.providerName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:text-right">
          <span className="rounded-full bg-gradient-to-br from-emerald-50 to-teal-50/90 px-3 py-1.5 text-[clamp(0.6875rem,2vw,0.75rem)] font-semibold text-emerald-900 shadow-sm ring-1 ring-emerald-600/10 sm:px-3.5">
            {formatFundingRange(normalized.minAmount, normalized.maxAmount)}
          </span>
          <span
            className={
              urgency.tone === "urgent"
                ? "rounded-full bg-gradient-to-r from-rose-100 to-orange-100 px-2.5 py-1 text-[clamp(0.6875rem,2vw,0.75rem)] font-bold text-rose-900 shadow-sm ring-2 ring-rose-300/80 sm:px-3"
                : urgency.tone === "soon"
                  ? "rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-2.5 py-1 text-[clamp(0.6875rem,2vw,0.75rem)] font-semibold text-amber-950 shadow-sm ring-2 ring-amber-300/70 sm:px-3"
                  : urgency.tone === "closed"
                    ? "rounded-full bg-zinc-100 px-2.5 py-1 text-[clamp(0.6875rem,2vw,0.75rem)] font-medium text-zinc-500 ring-1 ring-zinc-200/80 sm:px-3"
                    : "rounded-full bg-emerald-100/90 px-2.5 py-1 text-[clamp(0.6875rem,2vw,0.75rem)] font-medium text-emerald-900 ring-1 ring-emerald-300/30 sm:px-3"
            }
          >
            {urgency.label}
          </span>
        </div>
      </motion.div>

      {description && (
        <motion.div
          layout
          initial={false}
          animate={{ height: longDescription && !expanded ? "5.5rem" : "auto" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`mt-3 overflow-hidden ${
            longDescription && !expanded
              ? "[mask-image:linear-gradient(to_bottom,black_62%,transparent)]"
              : ""
          }`}
        >
          <p className="text-sm leading-relaxed text-zinc-600">{description}</p>
        </motion.div>
      )}

      <motion.div layout className="mt-4 flex flex-wrap gap-2">
        {(grant.sector ?? []).map((s) => (
          <span
            key={s}
            className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-600/10"
          >
            {s}
          </span>
        ))}
        {(grant.region ?? []).map((r) => (
          <span
            key={r}
            className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-900 ring-1 ring-sky-500/15"
          >
            {r}
          </span>
        ))}
        {(grant.eligibility ?? []).map((e) => (
          <span
            key={e}
            className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-900 ring-1 ring-violet-500/15"
          >
            {e}
          </span>
        ))}
      </motion.div>

      <motion.div layout className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/70 pt-3">
        {longDescription ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="touch-target text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        ) : (
          <span className="text-xs text-zinc-500">Full details shown</span>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBookmarkClick}
            className={`touch-target inline-flex items-center justify-center rounded-full p-2.5 transition-colors duration-200 ease-out ${
              saved
                ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                : "bg-zinc-100 text-zinc-400 hover:bg-emerald-100 hover:text-emerald-700"
            }`}
            title={isLoggedIn ? (saved ? "Remove bookmark" : "Save grant") : "Log in to save grants"}
            aria-label={saved ? "Remove bookmark" : "Save grant"}
          >
            <StarIcon filled={saved} />
          </button>

          {normalized.applicationUrl && (
            <a
              href={normalized.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target inline-flex items-center gap-1 rounded-full bg-emerald-950 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
            >
              Apply
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </motion.div>
    </motion.article>
  );
}
