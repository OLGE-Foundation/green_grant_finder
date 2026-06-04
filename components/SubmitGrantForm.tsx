"use client";

import { useState } from "react";
import {
  ELIGIBILITY_OPTIONS,
  REGION_OPTIONS,
  SECTOR_OPTIONS,
} from "@/lib/grants/constants";

type FormState = {
  title: string;
  organisationName: string;
  contactEmail: string;
  description: string;
  amountMin: string;
  amountMax: string;
  deadline: string;
  sectors: string[];
  regions: string[];
  eligibility: string[];
  applicationUrl: string;
  additionalNotes: string;
};

const initialState: FormState = {
  title: "",
  organisationName: "",
  contactEmail: "",
  description: "",
  amountMin: "",
  amountMax: "",
  deadline: "",
  sectors: [],
  regions: [],
  eligibility: [],
  applicationUrl: "",
  additionalNotes: "",
};

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  tone,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  tone: "emerald" | "sky" | "violet";
}) {
  const activeClass =
    tone === "emerald"
      ? "bg-emerald-600 text-white"
      : tone === "sky"
        ? "bg-sky-600 text-white"
        : "bg-violet-600 text-white";
  const idleClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-200/80 hover:bg-emerald-100"
      : tone === "sky"
        ? "bg-sky-50 text-sky-900 ring-sky-200/80 hover:bg-sky-100"
        : "bg-violet-50 text-violet-900 ring-violet-200/80 hover:bg-violet-100";

  return (
    <fieldset>
      <legend className="text-sm font-medium text-zinc-600">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(toggleValue(selected, option))}
              className={`touch-target rounded-full px-3 py-2 text-xs font-semibold ring-1 transition-colors sm:py-1.5 ${
                active ? activeClass : idleClass
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SubmitGrantForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(current: number): boolean {
    const stepErrors: Record<string, string[]> = {};

    if (current === 1) {
      if (!form.title.trim()) stepErrors.title = ["Grant title is required"];
      if (!form.organisationName.trim())
        stepErrors.organisationName = ["Organisation name is required"];
      if (!form.contactEmail.trim())
        stepErrors.contactEmail = ["Contact email is required"];
      if (!form.description.trim())
        stepErrors.description = ["Grant description is required"];
    }

    if (current === 2) {
      if (form.amountMin && Number(form.amountMin) < 0)
        stepErrors.amountMin = ["Must be 0 or greater"];
      if (form.amountMax && Number(form.amountMax) < 0)
        stepErrors.amountMax = ["Must be 0 or greater"];
      if (
        form.amountMin &&
        form.amountMax &&
        Number(form.amountMin) > Number(form.amountMax)
      ) {
        stepErrors.amountMax = ["Minimum cannot exceed maximum"];
      }
    }

    if (current === 3) {
      if (form.sectors.length === 0)
        stepErrors.sectors = ["Select at least one sector"];
      if (form.regions.length === 0)
        stepErrors.regions = ["Select at least one region"];
      if (form.eligibility.length === 0)
        stepErrors.eligibility = ["Select at least one applicant type"];
      if (!form.applicationUrl.trim())
        stepErrors.applicationUrl = ["Application URL is required"];
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateStep(3)) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      title: form.title,
      organisationName: form.organisationName,
      contactEmail: form.contactEmail,
      description: form.description,
      amountMin: form.amountMin ? Number(form.amountMin) : null,
      amountMax: form.amountMax ? Number(form.amountMax) : null,
      deadline: form.deadline || null,
      sectors: form.sectors,
      regions: form.regions,
      eligibility: form.eligibility,
      applicationUrl: form.applicationUrl,
      additionalNotes: form.additionalNotes || null,
    };

    try {
      const res = await fetch("/api/grants/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.details) setErrors(body.details);
        throw new Error(body.error ?? "Submission failed");
      }
      setSuccessId(body.id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (successId) {
    return (
      <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/80 p-8 text-center ring-1 ring-emerald-100">
        <h2 className="text-xl font-bold text-emerald-950">Submission received</h2>
        <p className="mt-3 text-sm leading-relaxed text-emerald-800">
          Thank you for submitting your grant. Our team will review it and publish it
          once approved. Reference: {successId}
        </p>
      </div>
    );
  }

  const inputClass =
    "touch-target mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white/90 px-3.5 py-3 text-base text-zinc-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 sm:py-2.5 sm:text-sm";

  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl ring-1 ring-emerald-950/[0.04] sm:p-8 [backdrop-filter:blur(16px)]">
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <span
              className={`flex size-9 items-center justify-center rounded-full text-sm font-bold sm:size-8 ${
                step >= n
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {n}
            </span>
            {n < 3 && (
              <span
                className={`h-0.5 flex-1 rounded ${step > n ? "bg-emerald-500" : "bg-zinc-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-emerald-950">Basics</h2>
          <label className="block text-sm">
            <span className="font-medium text-zinc-600">Grant title *</span>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title[0]}</p>}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-600">Organisation name *</span>
            <input
              className={inputClass}
              value={form.organisationName}
              onChange={(e) => updateField("organisationName", e.target.value)}
            />
            {errors.organisationName && (
              <p className="mt-1 text-xs text-red-600">{errors.organisationName[0]}</p>
            )}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-600">Contact email *</span>
            <input
              type="email"
              className={inputClass}
              value={form.contactEmail}
              onChange={(e) => updateField("contactEmail", e.target.value)}
            />
            {errors.contactEmail && (
              <p className="mt-1 text-xs text-red-600">{errors.contactEmail[0]}</p>
            )}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-600">Grant description *</span>
            <textarea
              rows={5}
              className={inputClass}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description[0]}</p>
            )}
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-emerald-950">Funding & timing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-zinc-600">Minimum amount (USD)</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.amountMin}
                onChange={(e) => updateField("amountMin", e.target.value)}
              />
              {errors.amountMin && (
                <p className="mt-1 text-xs text-red-600">{errors.amountMin[0]}</p>
              )}
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-600">Maximum amount (USD)</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.amountMax}
                onChange={(e) => updateField("amountMax", e.target.value)}
              />
              {errors.amountMax && (
                <p className="mt-1 text-xs text-red-600">{errors.amountMax[0]}</p>
              )}
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-zinc-600">Application deadline</span>
            <input
              type="date"
              className={inputClass}
              value={form.deadline}
              onChange={(e) => updateField("deadline", e.target.value)}
            />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-emerald-950">Classification & URL</h2>
          <MultiSelect
            label="Sector(s) *"
            options={SECTOR_OPTIONS}
            selected={form.sectors}
            onChange={(next) => updateField("sectors", next)}
            tone="emerald"
          />
          {errors.sectors && <p className="text-xs text-red-600">{errors.sectors[0]}</p>}
          <MultiSelect
            label="Region(s) *"
            options={REGION_OPTIONS}
            selected={form.regions}
            onChange={(next) => updateField("regions", next)}
            tone="sky"
          />
          {errors.regions && <p className="text-xs text-red-600">{errors.regions[0]}</p>}
          <MultiSelect
            label="Who can apply *"
            options={ELIGIBILITY_OPTIONS}
            selected={form.eligibility}
            onChange={(next) => updateField("eligibility", next)}
            tone="violet"
          />
          {errors.eligibility && (
            <p className="text-xs text-red-600">{errors.eligibility[0]}</p>
          )}
          <label className="block text-sm">
            <span className="font-medium text-zinc-600">Application URL *</span>
            <input
              type="url"
              className={inputClass}
              placeholder="https://"
              value={form.applicationUrl}
              onChange={(e) => updateField("applicationUrl", e.target.value)}
            />
            {errors.applicationUrl && (
              <p className="mt-1 text-xs text-red-600">{errors.applicationUrl[0]}</p>
            )}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-600">Additional notes</span>
            <textarea
              rows={4}
              className={inputClass}
              value={form.additionalNotes}
              onChange={(e) => updateField("additionalNotes", e.target.value)}
            />
          </label>
        </div>
      )}

      {submitError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {submitError}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-between gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="touch-target rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:border-emerald-300"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={() => {
              if (validateStep(step)) setStep((s) => s + 1);
            }}
            className="touch-target rounded-full bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="touch-target rounded-full bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit grant"}
          </button>
        )}
      </div>
    </div>
  );
}
