"use client";

import { formatDayLabel, formatTime12, isToday, parseDateOnly } from "@/lib/dates";
import type { AssignmentRole, SessionWithAssignments } from "@/lib/types";

interface DayCardProps {
  session: SessionWithAssignments;
  onOpen: () => void;
}

function assignmentLabel(session: SessionWithAssignments, role: AssignmentRole): { text: string; open: boolean } {
  const a = session.assignments.find((x) => x.role === role);
  if (a?.family_name) return { text: a.family_name, open: false };
  return { text: "Open — tap to claim", open: true };
}

export function DayCard({ session, onOpen }: DayCardProps) {
  const date = parseDateOnly(session.session_date);
  const today = isToday(session.session_date);
  const drop = assignmentLabel(session, "dropoff");
  const pick = assignmentLabel(session, "pickup");

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`block w-full rounded-2xl border p-4 text-left transition-colors active:scale-[0.99] ${
        session.cancelled
          ? "border-slate-200 bg-slate-100 opacity-70"
          : today
            ? "border-sky-400 bg-sky-50 shadow-sm"
            : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className={`font-semibold ${today ? "text-sky-800" : "text-slate-900"}`}>
          {formatDayLabel(date)}
          {today ? " · Today" : ""}
        </span>
        {session.cancelled ? (
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Cancelled</span>
        ) : (
          <span className="text-sm text-slate-600">
            {formatTime12(session.start_time)}–{formatTime12(session.end_time)}
          </span>
        )}
      </div>

      {!session.cancelled && (
        <>
          <p className="text-base font-medium text-slate-800 mb-2">📍 {session.location_name}</p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-slate-500">Drop-off:</span>{" "}
              <span className={drop.open ? "text-amber-700 font-medium" : "text-emerald-700 font-medium"}>
                {drop.text}
              </span>
            </p>
            <p>
              <span className="text-slate-500">Pick-up:</span>{" "}
              <span className={pick.open ? "text-amber-700 font-medium" : "text-emerald-700 font-medium"}>
                {pick.text}
              </span>
            </p>
          </div>
        </>
      )}
    </button>
  );
}
