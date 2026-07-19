import { assertTeamScheduleAccess, isTeamAccessError } from "@/lib/apiAuth";
import {
  applyCancelledToDates,
  applyLocationToWeek,
  applyNoPracticeToDates,
  applyNotesToDates,
  applyTimeToWeek,
  clearWeekAssignments,
  copyScheduleFromPreviousWeek,
  ensureSchema,
  getFamilies,
  getSessionByDateForTeam,
  updateSession,
} from "@/lib/db";
import { buildDefaultHomePickups, finalizeDropoffPickupsForSession } from "@/lib/scheduleApi";
import { visibleSessionDates } from "@/lib/visibleDays";
import { NextRequest, NextResponse } from "next/server";

type BatchOperation =
  | { op: "set_time"; start_time: string; end_time: string }
  | { op: "set_location"; location_name: string }
  | { op: "clear_assignments" }
  | { op: "copy_previous_week" }
  | { op: "set_cancelled"; cancelled: boolean; dates?: string[] }
  | { op: "set_no_practice"; no_practice: boolean; dates?: string[] }
  | { op: "set_notes"; location_notes: string | null; dates?: string[] }
  | { op: "set_pickups_default"; dates?: string[] };

function resolveDates(weekStart: string, visibleDays: number[], dates?: string[]): string[] {
  const allowed = new Set(visibleSessionDates(weekStart, visibleDays));
  if (!dates || dates.length === 0) {
    return [...allowed];
  }
  return dates.filter((date) => allowed.has(date));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await ensureSchema();
    const access = await assertTeamScheduleAccess(request, slug);
    if (isTeamAccessError(access)) return access;

    const body = (await request.json()) as { week_start?: string; operations?: BatchOperation[] };
    const weekStart = body.week_start;
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json({ error: "week_start required (YYYY-MM-DD)" }, { status: 400 });
    }
    if (!Array.isArray(body.operations) || body.operations.length === 0) {
      return NextResponse.json({ error: "operations array is required" }, { status: 400 });
    }

    const results: Record<string, unknown>[] = [];
    const team = access.team;

    for (const operation of body.operations) {
      switch (operation.op) {
        case "set_time": {
          if (!operation.start_time?.trim() || !operation.end_time?.trim()) {
            return NextResponse.json({ error: "set_time requires start_time and end_time" }, { status: 400 });
          }
          const updated = await applyTimeToWeek(
            team.id,
            weekStart,
            operation.start_time,
            operation.end_time,
            team.visible_days
          );
          results.push({ op: operation.op, updated });
          break;
        }
        case "set_location": {
          if (!operation.location_name?.trim()) {
            return NextResponse.json({ error: "set_location requires location_name" }, { status: 400 });
          }
          const updated = await applyLocationToWeek(
            team.id,
            weekStart,
            operation.location_name,
            team.visible_days
          );
          results.push({ op: operation.op, updated });
          break;
        }
        case "clear_assignments": {
          const cleared = await clearWeekAssignments(team.id, weekStart, team.visible_days);
          results.push({ op: operation.op, cleared });
          break;
        }
        case "copy_previous_week": {
          const copied = await copyScheduleFromPreviousWeek(team.id, weekStart, team.visible_days);
          results.push({ op: operation.op, ...copied });
          break;
        }
        case "set_cancelled": {
          const dates = resolveDates(weekStart, team.visible_days, operation.dates);
          const updated = await applyCancelledToDates(team.id, dates, operation.cancelled);
          results.push({ op: operation.op, updated, dates });
          break;
        }
        case "set_no_practice": {
          const dates = resolveDates(weekStart, team.visible_days, operation.dates);
          const updated = await applyNoPracticeToDates(team.id, dates, operation.no_practice);
          results.push({ op: operation.op, updated, dates });
          break;
        }
        case "set_notes": {
          const dates = resolveDates(weekStart, team.visible_days, operation.dates);
          const updated = await applyNotesToDates(team.id, dates, operation.location_notes);
          results.push({ op: operation.op, updated, dates });
          break;
        }
        case "set_pickups_default": {
          const dates = resolveDates(weekStart, team.visible_days, operation.dates);
          const families = await getFamilies(team.id);
          let updated = 0;
          for (const date of dates) {
            const session = await getSessionByDateForTeam(
              team.id,
              date,
              team.created_at,
              team.visible_days
            );
            if (!session) continue;
            const pickups = finalizeDropoffPickupsForSession(
              session,
              buildDefaultHomePickups(families, session, session.dropoff_pickups)
            );
            await updateSession(session.id, { dropoff_pickups: pickups });
            updated += 1;
          }
          results.push({ op: operation.op, updated, dates });
          break;
        }
        default:
          return NextResponse.json({ error: `Unknown operation: ${(operation as BatchOperation).op}` }, { status: 400 });
      }
    }

    return NextResponse.json({ week_start: weekStart, results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to run batch operations" }, { status: 500 });
  }
}
