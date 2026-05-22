"use client";

import { useEffect, useState } from "react";
import {
  REGION_OPTIONS,
  SECTOR_OPTIONS,
} from "@/lib/grants/constants";

type AlertPrefs = {
  enabled: boolean;
  sectors: string[];
  regions: string[];
};

export function AlertPreferences() {
  const [prefs, setPrefs] = useState<AlertPrefs>({
    enabled: true,
    sectors: [],
    regions: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alerts/preferences")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<AlertPrefs>;
      })
      .then((data) => {
        if (data) setPrefs(data);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleSector(sector: string) {
    setPrefs((p) => ({
      ...p,
      sectors: p.sectors.includes(sector)
        ? p.sectors.filter((s) => s !== sector)
        : [...p.sectors, sector],
    }));
  }

  function toggleRegion(region: string) {
    setPrefs((p) => ({
      ...p,
      regions: p.regions.includes(region)
        ? p.regions.filter((r) => r !== region)
        : [...p.regions, region],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/alerts/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      setMessage("Alert preferences saved.");
    } catch {
      setMessage("Could not save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm ring-1 ring-emerald-950/[0.04] [backdrop-filter:blur(12px)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-emerald-950">Weekly email alerts</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Get a digest of newly approved grants matching your sectors and regions.
            We also consider sectors and regions from your bookmarked grants.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            checked={prefs.enabled}
            onChange={(e) => setPrefs((p) => ({ ...p, enabled: e.target.checked }))}
            className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
          />
          Enabled
        </label>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-medium text-zinc-600">Preferred sectors</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SECTOR_OPTIONS.map((sector) => {
              const active = prefs.sectors.includes(sector);
              return (
                <button
                  key={sector}
                  type="button"
                  onClick={() => toggleSector(sector)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80 hover:bg-emerald-100"
                  }`}
                >
                  {sector}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-zinc-600">Preferred regions</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {REGION_OPTIONS.map((region) => {
              const active = prefs.regions.includes(region);
              return (
                <button
                  key={region}
                  type="button"
                  onClick={() => toggleRegion(region)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-sky-600 text-white"
                      : "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80 hover:bg-sky-100"
                  }`}
                >
                  {region}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-emerald-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {message && <p className="text-sm text-emerald-700">{message}</p>}
      </div>
    </div>
  );
}
