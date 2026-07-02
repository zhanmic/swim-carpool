"use client";

import { formatDayShort, formatTimeRangeShort, isToday, parseDateOnly } from "@/lib/dates";
import type { AssignmentRole, SessionWithAssignments } from "@/lib/types";

interface DayCardProps {
  session: SessionWithAssignments;
  onOpen: () => void;
}

function assignmentShort(session: SessionWithAssignments, role: AssignmentRole): { text: string; open: boolean } {
  const a = session.assignments.find((x) => x.role === role);
  if (a?.family_name) return { text: a.family_name, open: false };
  return { text: "Open", open: true };
}

export function DayCard({ session, onOpen }: DayCardProps) {
  const date = parseDateOnly(session.session_date);
  const today = isToday(session.session_date);
  const drop = assignmentShort(session, "dropoff");
  const pick = assignmentShort(session, "pickup");

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-0 flex-1 flex-col justify-center rounded-lg border px-2.5 py-1 text-left active:scale-[0.99] ${
        session.cancelled
          ? "border-slate-200 bg-slate-100 opacity-70"
          : today
            ? "border-sky-400 bg-sky-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-1 leading-tight">
        <span className={`truncate text-xs font-semibold ${today ? "text-sky-800" : "text-slate-900"}`}>
          {formatDayShort(date)}
          {today ? " · Today" : ""}
        </span>
        {session.cancelled ? (
          <span className="shrink-0 text-[10px] font-medium uppercase text-slate-500">Off</span>
        ) : (
          <span className="shrink-0 text-[11px] text-slate-500">
            {formatTimeRangeShort(session.start_time, session.end_time)}
          </span>
        )}
      </div>

      {!session.cancelled && (
        <>
          <p className="truncate text-[11px] font-medium leading-tight text-slate-700">
            {session.location_name}
          </p>
          <p className="truncate text-[10px] leading-tight">
            <span className="text-slate-500">D:</span>{" "}
            <span className={drop.open ? "font-medium text-amber-700" : "font-medium text-emerald-700"}>
              {drop.text}
            </span>
            <span className="text-slate-300"> · </span>
            <span className="text-slate-500">P:</span>{" "}
            <span className={pick.open ? "font-medium text-amber-700" : "font-medium text-emerald-700"}>
              {pick.text}
            </span>
          </p>
        </>
      )}
    </button>
  );
}
