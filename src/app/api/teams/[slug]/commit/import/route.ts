import { assertTeamScheduleAccess, isTeamAccessError } from "@/lib/apiAuth";
import { getWeekOccurrences, planWeekImport } from "@/lib/commit";
import { ensureSchema, getSessionByDateForTeam, updateSession } from "@/lib/db";
import type { SessionUpdate } from "@/lib/types";
import { visibleSessionDates } from "@/lib/visibleDays";
import { NextRequest, NextResponse } from "next/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await ensureSchema();
    const access = await assertTeamScheduleAccess(request, slug);
    if (isTeamAccessError(access)) return access;

    const team = access.team;
    const integration = team.schedule_integration;
    if (!integration) {
      return NextResponse.json(
        { error: "Schedule integration is not configured for this team" },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      week_start?: string;
      group?: string | null;
    };
    const weekStart = body.week_start;
    if (!weekStart || !DATE_RE.test(weekStart)) {
      return NextResponse.json({ error: "week_start required (YYYY-MM-DD)" }, { status: 400 });
    }

    const group = body.group !== undefined ? body.group : integration.group;
    const visibleDates = visibleSessionDates(weekStart, team.visible_days);
    const { practices } = await getWeekOccurrences(integration, weekStart);
    const plan = planWeekImport(practices, visibleDates, group);

    let updated = 0;
    const results: Array<{ date: string; no_practice: boolean; cancelled: boolean }> = [];

    for (const item of plan) {
      const session = await getSessionByDateForTeam(
        team.id,
        item.date,
        team.created_at,
        team.visible_days
      );
      if (!session) continue;

      const update: SessionUpdate = {
        no_practice: item.noPractice,
        // Never leave a stale "cancelled" flag on a no-practice day.
        cancelled: item.noPractice ? false : item.cancelled,
      };
      if (!item.noPractice) {
        if (item.startTime) update.start_time = item.startTime;
        if (item.endTime) update.end_time = item.endTime;
        if (item.location) update.location_name = item.location;
        // Only overwrite notes when there are extra same-day practices to record.
        if (item.extraNote) update.location_notes = item.extraNote;
      }

      await updateSession(session.id, update);
      updated += 1;
      results.push({ date: item.date, no_practice: item.noPractice, cancelled: update.cancelled ?? false });
    }

    return NextResponse.json({ week_start: weekStart, group, updated, results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to import Commit schedule" }, { status: 502 });
  }
}
