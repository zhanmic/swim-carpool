import { getWeekOccurrences, planWeekImport } from "@/lib/commit";
import { getSessionByDateForTeam, updateSession } from "@/lib/db";
import type { ScheduleIntegration, SessionUpdate } from "@/lib/types";
import { visibleSessionDates } from "@/lib/visibleDays";

export interface ApplyCommitImportParams {
  teamId: string;
  teamCreatedAt: string;
  visibleDays: number[];
  integration: ScheduleIntegration;
  weekStart: string;
  /** Group override; defaults to the integration's configured group. */
  group?: string | null;
}

export interface CommitImportDayResult {
  date: string;
  no_practice: boolean;
  cancelled: boolean;
}

export interface CommitImportResult {
  group: string | null;
  updated: number;
  results: CommitImportDayResult[];
}

/**
 * Fetch and expand the given week from Commit, then apply the resulting plan to
 * this team's practice_sessions (times, location, cancelled/no-practice).
 * Driver assignments, absences, and home pickups are intentionally untouched.
 * Shared by the import route and the AI agent tool.
 */
export async function applyCommitWeekImport(
  params: ApplyCommitImportParams
): Promise<CommitImportResult> {
  const group = params.group !== undefined ? params.group : params.integration.group;
  const visibleDates = visibleSessionDates(params.weekStart, params.visibleDays);
  const { practices } = await getWeekOccurrences(params.integration, params.weekStart);
  const plan = planWeekImport(practices, visibleDates, group);

  let updated = 0;
  const results: CommitImportDayResult[] = [];

  for (const item of plan) {
    const session = await getSessionByDateForTeam(
      params.teamId,
      item.date,
      params.teamCreatedAt,
      params.visibleDays
    );
    if (!session) continue;

    const update: SessionUpdate = {
      no_practice: item.noPractice,
      cancelled: item.noPractice ? false : item.cancelled,
    };
    if (!item.noPractice) {
      if (item.startTime) update.start_time = item.startTime;
      if (item.endTime) update.end_time = item.endTime;
      if (item.location) update.location_name = item.location;
      if (item.extraNote) update.location_notes = item.extraNote;
    }

    await updateSession(session.id, update);
    updated += 1;
    results.push({ date: item.date, no_practice: item.noPractice, cancelled: update.cancelled ?? false });
  }

  return { group, updated, results };
}
