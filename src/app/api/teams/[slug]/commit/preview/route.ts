import { assertTeamScheduleAccess, isTeamAccessError } from "@/lib/apiAuth";
import { getWeekOccurrences, planWeekImport } from "@/lib/commit";
import { integrationFromParams } from "@/lib/commit/request";
import { ensureSchema } from "@/lib/db";
import { visibleSessionDates } from "@/lib/visibleDays";
import { NextRequest, NextResponse } from "next/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await ensureSchema();
    const access = await assertTeamScheduleAccess(request, slug);
    if (isTeamAccessError(access)) return access;

    const url = new URL(request.url);
    const integration = integrationFromParams(url.searchParams, access.team);
    if (!integration) {
      return NextResponse.json(
        { error: "Schedule integration is not configured for this team" },
        { status: 400 }
      );
    }

    const weekStart = url.searchParams.get("week_start");
    if (!weekStart || !DATE_RE.test(weekStart)) {
      return NextResponse.json({ error: "week_start required (YYYY-MM-DD)" }, { status: 400 });
    }

    const group = url.searchParams.get("group") ?? integration.group;
    const visibleDates = visibleSessionDates(weekStart, access.team.visible_days);
    const { practices, meets } = await getWeekOccurrences(integration, weekStart);
    const plan = planWeekImport(practices, visibleDates, group);

    return NextResponse.json({
      week_start: weekStart,
      group,
      days: plan.map((item) => ({
        date: item.date,
        no_practice: item.noPractice,
        cancelled: item.cancelled,
        start_time: item.startTime ?? null,
        end_time: item.endTime ?? null,
        location: item.location ?? null,
        extra_note: item.extraNote ?? null,
        matches: item.matched.map((occ) => ({
          name: occ.name,
          group: occ.group,
          location: occ.location,
          start_time: occ.startTime,
          end_time: occ.endTime,
          cancelled: occ.cancelled,
        })),
      })),
      meets: meets.map((occ) => ({
        date: occ.date,
        name: occ.name,
        location: occ.location,
        start_time: occ.startTime,
        end_time: occ.endTime,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to preview Commit schedule" }, { status: 502 });
  }
}
