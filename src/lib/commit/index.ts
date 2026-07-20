import { fromZonedTime } from "date-fns-tz";
import type { ScheduleIntegration } from "@/lib/types";
import { fetchScheduleData, fetchTeamConfig } from "./client";
import { expandMeets, expandPractices } from "./expand";
import type { CommitOccurrence } from "./types";

export * from "./types";
export {
  COMMIT_API_BASE,
  DEFAULT_PRACTICE_NAME_FORMAT,
  DEFAULT_TIMEZONE,
  normalizePracticeNameFormat,
  parseScheduleIntegration,
} from "./config";
export { fetchScheduleData, fetchTeamConfig } from "./client";
export { expandEvents, expandMeets, expandPractices } from "./expand";
export { canonicalGroupLabel, groupMatches, parsePracticeName } from "./parse";
export { planWeekImport, type SessionPlanItem } from "./import";

/**
 * Absolute [start, end) instants for a calendar week defined in the team
 * timezone. `weekStartStr` is a YYYY-MM-DD date (Sunday in carpool's model).
 */
export function weekRangeInTz(
  weekStartStr: string,
  days: number,
  timeZone: string
): { rangeStart: Date; rangeEnd: Date } {
  const [y, m, d] = weekStartStr.split("-").map(Number);
  const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endLocal = new Date(y, m - 1, d + days, 0, 0, 0, 0);
  return {
    rangeStart: fromZonedTime(startLocal, timeZone),
    rangeEnd: fromZonedTime(endLocal, timeZone),
  };
}

export interface WeekOccurrences {
  practices: CommitOccurrence[];
  meets: CommitOccurrence[];
}

/** Fetch and expand a week's practices (and optionally meets) for a team. */
export async function getWeekOccurrences(
  integration: ScheduleIntegration,
  weekStartStr: string,
  days = 7
): Promise<WeekOccurrences> {
  const { rangeStart, rangeEnd } = weekRangeInTz(weekStartStr, days, integration.timezone);
  const data = await fetchScheduleData(integration.superTeamId, integration.includeMeets);

  const practices = expandPractices(
    data.events ?? [],
    rangeStart,
    rangeEnd,
    integration.timezone,
    integration.nameFormat
  );

  const meets = integration.includeMeets
    ? expandMeets(data.meets ?? [], rangeStart, rangeEnd, integration.timezone)
    : [];

  return { practices, meets };
}

/**
 * Distinct group labels found across practices in a date window. Used to
 * populate the group picker. Scans a multi-week window so groups that don't run
 * every week are still discovered.
 */
export async function listGroups(
  integration: ScheduleIntegration,
  weekStartStr: string,
  weeks = 4
): Promise<string[]> {
  const { rangeStart } = weekRangeInTz(weekStartStr, 0, integration.timezone);
  const { rangeEnd } = weekRangeInTz(weekStartStr, weeks * 7, integration.timezone);
  const data = await fetchScheduleData(integration.superTeamId, false);

  const practices = expandPractices(
    data.events ?? [],
    rangeStart,
    rangeEnd,
    integration.timezone,
    integration.nameFormat
  );

  const groups = new Set<string>();
  for (const occ of practices) {
    if (occ.group) groups.add(occ.group);
  }
  return [...groups].sort((a, b) => a.localeCompare(b));
}

/** Resolve the team name/timezone advertised by Commit for a super team id. */
export async function fetchTeamMeta(
  superTeamId: string
): Promise<{ name: string | null; timezone: string | null }> {
  const data = await fetchTeamConfig(superTeamId);
  return {
    name: data.superTeam?.name ?? null,
    timezone: data.superTeam?.timezone ?? null,
  };
}
