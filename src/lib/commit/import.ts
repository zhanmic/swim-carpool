import { formatTime12 } from "@/lib/dates";
import { groupMatches } from "./parse";
import type { CommitOccurrence } from "./types";

/** A resolved plan for one calendar day, ready to apply to a practice_session. */
export interface SessionPlanItem {
  date: string;
  /** True when the selected group has no practice that day. */
  noPractice: boolean;
  /** True when the day's only practice(s) are cancelled. */
  cancelled: boolean;
  startTime?: string;
  endTime?: string;
  location?: string | null;
  /** Note describing additional same-day practices (when a group has >1). */
  extraNote?: string | null;
  /** All practice occurrences that matched the group on this day. */
  matched: CommitOccurrence[];
}

function describeOccurrence(occ: CommitOccurrence): string {
  const parts = [formatTime12(occ.startTime)];
  if (occ.location) parts.push(occ.location);
  return parts.join(" ");
}

/**
 * Map a week's Commit practice occurrences onto a per-day plan for the given
 * visible dates and selected group. Pure: does no I/O so it can be unit-tested
 * and reused by both preview and import.
 *
 * Rules:
 * - No matching practice that day -> mark the day "no practice".
 * - One or more practices -> use the earliest non-cancelled one for time and
 *   location; if every match is cancelled, keep the time but mark it cancelled.
 * - Multiple same-day practices -> the extra ones are summarized in a note
 *   (carpool has a single session per day).
 */
export function planWeekImport(
  occurrences: CommitOccurrence[],
  visibleDates: string[],
  selectedGroup: string | null
): SessionPlanItem[] {
  const practices = occurrences
    .filter((occ) => occ.label === "practice" && groupMatches(occ.group, selectedGroup))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const byDate = new Map<string, CommitOccurrence[]>();
  for (const occ of practices) {
    const list = byDate.get(occ.date) ?? [];
    list.push(occ);
    byDate.set(occ.date, list);
  }

  return visibleDates.map((date) => {
    const matched = byDate.get(date) ?? [];
    if (matched.length === 0) {
      return { date, noPractice: true, cancelled: false, matched };
    }

    const active = matched.filter((occ) => !occ.cancelled);
    if (active.length === 0) {
      const primary = matched[0];
      return {
        date,
        noPractice: false,
        cancelled: true,
        startTime: primary.startTime,
        endTime: primary.endTime,
        location: primary.location,
        matched,
      };
    }

    const primary = active[0];
    const extras = active.slice(1);
    const extraNote =
      extras.length > 0 ? `Also: ${extras.map(describeOccurrence).join(", ")}` : null;

    return {
      date,
      noPractice: false,
      cancelled: false,
      startTime: primary.startTime,
      endTime: primary.endTime,
      location: primary.location,
      extraNote,
      matched,
    };
  });
}
