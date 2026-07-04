"use client";

import { formatTimeRangeCompact, isToday, parseDateOnly } from "@/lib/dates";
import {
  hasHomePickupNotes,
  hasOtherDriverNotes,
  homePickupPreviewCompact,
  otherNotesPreview,
} from "@/lib/dropoffPickups";
import { getFamilyColor, OPEN_SLOT_PILL, type FamilyColorClasses } from "@/lib/familyColors";
import type { AssignmentRole, Family, SessionWithAssignments } from "@/lib/types";

interface DayCardProps {
  session: SessionWithAssignments;
  families: Family[];
  familyColors: Map<string, FamilyColorClasses>;
  onOpen: () => void;
}

function assignmentLabel(
  session: SessionWithAssignments,
  role: AssignmentRole
): { text: string; open: boolean; familyId?: string } {
  const a = session.assignments.find((x) => x.role === role);
  if (a?.family_name) return { text: a.family_name, open: false, familyId: a.family_id };
  return { text: "N/A", open: true };
}

function slotClass(open: boolean, familyId: string | undefined, familyColors: Map<string, FamilyColorClasses>) {
  if (open) return OPEN_SLOT_PILL;
  return getFamilyColor(familyColors, familyId)?.pill ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

const noteBadgeClass =
  "shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide";

export function DayCard({ session, families, familyColors, onOpen }: DayCardProps) {
  const date = parseDateOnly(session.session_date);
  const today = isToday(session.session_date);
  const drop = assignmentLabel(session, "dropoff");
  const pick = assignmentLabel(session, "pickup");
  const showHomePickup = hasHomePickupNotes(session, families);
  const showOtherNote = hasOtherDriverNotes(session);
  const homePickupLine = homePickupPreviewCompact(session, families);
  const otherNoteLine = otherNotesPreview(session);
  const hasNotes = showHomePickup || showOtherNote;

  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const dateLabel = date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex shrink-0 flex-col rounded-2xl border px-3 py-2.5 text-left transition-colors active:scale-[0.99] ${
        session.cancelled
          ? "border-slate-200 bg-slate-100 opacity-70 dark:border-slate-700 dark:bg-slate-800/60"
          : today
            ? "border-sky-400 bg-sky-50 shadow-sm dark:border-sky-500 dark:bg-sky-950"
            : "border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      {session.cancelled ? (
        <div className="flex items-center gap-2 text-base">
          <span className={`font-semibold ${today ? "text-sky-800 dark:text-sky-200" : "text-slate-900 dark:text-slate-100"}`}>
            {weekday} {dateLabel}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Cancelled</span>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-1.5 text-sm leading-snug">
            <span className={`shrink-0 font-semibold ${today ? "text-sky-800 dark:text-sky-200" : "text-slate-900 dark:text-slate-100"}`}>
              {weekday}
            </span>
            <span className="shrink-0 text-slate-500 dark:text-slate-400">{dateLabel}</span>
            <span className="shrink-0 text-slate-300 dark:text-slate-600">·</span>
            <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-200">{session.location_name}</span>
            <span className="shrink-0 text-slate-300 dark:text-slate-600">·</span>
            <span className="shrink-0 text-xs text-slate-600 dark:text-slate-400">
              {formatTimeRangeCompact(session.start_time, session.end_time)}
            </span>
          </div>

          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
              <span className="whitespace-nowrap">
                <span className="text-slate-500 dark:text-slate-400">Drop </span>
                <span className={`rounded-full px-1.5 py-px text-xs font-medium ${slotClass(drop.open, drop.familyId, familyColors)}`}>
                  {drop.text}
                </span>
              </span>
              <span className="whitespace-nowrap">
                <span className="text-slate-500 dark:text-slate-400">Pick </span>
                <span className={`rounded-full px-1.5 py-px text-xs font-medium ${slotClass(pick.open, pick.familyId, familyColors)}`}>
                  {pick.text}
                </span>
              </span>
            </div>
            {hasNotes && (
              <div className="flex shrink-0 items-center gap-1">
                {showHomePickup && (
                  <span
                    className={`${noteBadgeClass} bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300`}
                    title={homePickupLine ? `Home pickup: ${homePickupLine}` : undefined}
                    aria-label={homePickupLine ? `Home pickup: ${homePickupLine}` : "Home pickup"}
                  >
                    Home
                  </span>
                )}
                {showOtherNote && (
                  <span
                    className={`${noteBadgeClass} bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300`}
                    title={otherNoteLine ?? undefined}
                    aria-label={otherNoteLine ? `Note: ${otherNoteLine}` : "Note"}
                  >
                    Note
                  </span>
                )}
              </div>
            )}
          </div>

          {hasNotes && (homePickupLine || otherNoteLine) && (
            <p className="mt-1 line-clamp-1 text-xs leading-snug">
              {homePickupLine && (
                <span className="text-sky-800 dark:text-sky-300">{homePickupLine}</span>
              )}
              {homePickupLine && otherNoteLine && (
                <span className="text-slate-300 dark:text-slate-600"> · </span>
              )}
              {otherNoteLine && (
                <span className="text-violet-800 dark:text-violet-300">{otherNoteLine}</span>
              )}
            </p>
          )}
        </>
      )}
    </button>
  );
}
