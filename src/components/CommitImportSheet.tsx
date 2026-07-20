"use client";

import { formatDayLabel, formatTimeRangeCompact, parseDateOnly } from "@/lib/dates";
import { useEffect, useState } from "react";

interface PreviewDay {
  date: string;
  no_practice: boolean;
  cancelled: boolean;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  extra_note: string | null;
}

interface PreviewResponse {
  week_start: string;
  group: string | null;
  days: PreviewDay[];
}

interface CommitImportSheetProps {
  slug: string;
  weekStart: string;
  onClose: () => void;
  onImported: () => void;
}

export function CommitImportSheet({ slug, weekStart, onClose, onImported }: CommitImportSheetProps) {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/teams/${slug}/commit/preview?week_start=${weekStart}`);
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(data.error ?? "Could not load preview");
          return;
        }
        setPreview(data as PreviewResponse);
      } catch {
        if (!cancelled) setError("Could not reach Commit");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [slug, weekStart]);

  async function runImport() {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${slug}/commit/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: weekStart }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }
      onImported();
      onClose();
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
    }
  }

  function daySummary(day: PreviewDay): { text: string; tone: string } {
    if (day.no_practice) return { text: "No practice", tone: "text-slate-400" };
    const time =
      day.start_time && day.end_time
        ? formatTimeRangeCompact(day.start_time, day.end_time)
        : "";
    const loc = day.location ? ` · ${day.location}` : "";
    if (day.cancelled) {
      return { text: `Cancelled${time ? ` (${time})` : ""}`, tone: "text-red-500" };
    }
    return { text: `${time}${loc}`, tone: "text-slate-700 dark:text-slate-200" };
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-white safe-bottom dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Import from Commit
            </h2>
            {preview && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {preview.group ? `Group: ${preview.group}` : "All practices"} · Week of {weekStart}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="touch-target-sm rounded-full text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="max-w-lg mx-auto px-3 py-2 space-y-2">
          {loading && (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading preview…</p>
          )}

          {!loading && error && !preview && (
            <p className="py-4 text-center text-sm text-red-600">{error}</p>
          )}

          {!loading && preview && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This sets each day&apos;s time, location, and practice status. Driver assignments,
                skips, and home pickups are kept.
              </p>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {preview.days.map((day) => {
                  const summary = daySummary(day);
                  return (
                    <li key={day.date} className="flex items-baseline justify-between gap-2 py-1.5">
                      <span className="w-24 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {formatDayLabel(parseDateOnly(day.date))}
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate text-right text-xs ${summary.tone}`}
                        title={day.extra_note ?? undefined}
                      >
                        {summary.text}
                        {day.extra_note ? " *" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {preview.days.some((d) => d.extra_note) && (
                <p className="text-[11px] text-slate-400">
                  * Additional same-day practices are added to the day&apos;s notes.
                </p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={() => void runImport()}
                disabled={importing}
                className="touch-target w-full rounded-lg bg-sky-500 text-sm font-semibold text-white disabled:opacity-50"
              >
                {importing ? "Importing…" : "Import this week"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
