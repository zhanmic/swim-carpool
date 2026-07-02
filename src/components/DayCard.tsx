"use client";

import { formatTimeRangeCompact, isToday, parseDateOnly } from "@/lib/dates";
import type { AssignmentRole, SessionWithAssignments } from "@/lib/types";

interface DayCardProps {
  session: SessionWithAssignments;
  onOpen: () => void;
}

function assignmentLabel(session: SessionWithAssignments, role: AssignmentRole): { text: string; open: boolean } {
  const a = session.assignments.find((x) => x.role === role);
  if (a?.family_name) return { text: a.family_name, open: false };
  return { text: "empty", open: true };
}

export function DayCard({ session, onOpen }: DayCardProps) {
  const date = parseDateOnly(session.session_date);
  const today = isToday(session.session_date);
  const drop = assignmentLabel(session, "dropoff");
  const pick = assignmentLabel(session, "pickup");

  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const dateLabel = date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`block w-full rounded-2xl border px-3.5 py-3 text-left transition-colors active:scale-[0.99] ${
        session.cancelled
          ? "border-slate-200 bg-slate-100 opacity-70"
          : today
            ? "border-sky-400 bg-sky-50 shadow-sm"
            : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      {session.cancelled ? (
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-semibold ${today ? "text-sky-800" : "text-slate-900"}`}>
            {weekday} {dateLabel}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Cancelled</span>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-1.5 text-sm leading-snug">
            <span className={`shrink-0 font-semibold ${today ? "text-sky-800" : "text-slate-900"}`}>
              {weekday}
            </span>
            <span className="shrink-0 text-slate-500">{dateLabel}</span>
            <span className="shrink-0 text-slate-300">·</span>
            <span className="min-w-0 truncate font-medium text-slate-800">{session.location_name}</span>
            <span className="shrink-0 text-slate-300">·</span>
            <span className="shrink-0 text-xs text-slate-600">
              {formatTimeRangeCompact(session.start_time, session.end_time)}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm">
            <span>
              <span className="text-slate-500">Drop Off </span>
              <span className={drop.open ? "font-medium text-amber-700" : "font-medium text-emerald-700"}>
                {drop.text}
              </span>
            </span>
            <span>
              <span className="text-slate-500">Pick Up </span>
              <span className={pick.open ? "font-medium text-amber-700" : "font-medium text-emerald-700"}>
                {pick.text}
              </span>
            </span>
          </div>
        </>
      )}
    </button>
  );
}
