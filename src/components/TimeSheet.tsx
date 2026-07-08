"use client";

import { TimeInput } from "@/components/TimeInput";
import { formatTimeRangeCompact, snapTimeToStep } from "@/lib/dates";
import type { SessionWithAssignments } from "@/lib/types";
import { FormEvent, useState } from "react";

interface TimeSheetProps {
  slug: string;
  weekStart: string;
  sessions: SessionWithAssignments[];
  onClose: () => void;
  onWeekApplied: () => void;
}

function defaultTimes(sessions: SessionWithAssignments[]): { start: string; end: string } {
  const active = sessions.find((s) => !s.cancelled) ?? sessions[0];
  return {
    start: snapTimeToStep(active?.start_time ?? "05:45"),
    end: snapTimeToStep(active?.end_time ?? "08:15"),
  };
}

export function TimeSheet({ slug, weekStart, sessions, onClose, onWeekApplied }: TimeSheetProps) {
  const initial = defaultTimes(sessions);
  const [startTime, setStartTime] = useState(initial.start);
  const [endTime, setEndTime] = useState(initial.end);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setApplied(false);
    try {
      const res = await fetch(`/api/teams/${slug}/week/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, start_time: startTime, end_time: endTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update times");
        return;
      }
      setApplied(true);
      onWeekApplied();
      setTimeout(() => setApplied(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="rounded-t-2xl bg-white safe-bottom dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-lg font-semibold dark:text-slate-100">Edit time</h2>
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

        <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-4 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Set practice time for all days this week. Tap a single day on the schedule to change that day only.
          </p>

          <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <label className="block min-w-0">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Start</span>
              <TimeInput
                required
                value={startTime}
                onChange={setStartTime}
                className="mt-1 w-full rounded-lg border border-slate-300 px-1 py-2 text-sm dark:border-slate-600"
              />
            </label>
            <label className="block min-w-0">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">End</span>
              <TimeInput
                required
                value={endTime}
                onChange={setEndTime}
                className="mt-1 w-full rounded-lg border border-slate-300 px-1 py-2 text-sm dark:border-slate-600"
              />
            </label>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Preview: {formatTimeRangeCompact(startTime, endTime)}
          </p>

          <button
            type="submit"
            disabled={busy}
            className={`w-full rounded-lg py-2.5 font-medium text-white disabled:opacity-50 ${
              applied ? "bg-emerald-500" : "bg-sky-500"
            }`}
          >
            {applied ? "Applied to all days" : "Set all days this week"}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </div>
  );
}
