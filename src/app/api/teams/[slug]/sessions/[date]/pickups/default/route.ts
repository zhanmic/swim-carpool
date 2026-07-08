import { assertTeamScheduleAccess, isTeamAccessError } from "@/lib/apiAuth";
import { ensureSchema, getFamilies, getSessionByDateForTeam, updateSession } from "@/lib/db";
import { buildDefaultHomePickups, finalizeDropoffPickupsForSession, isValidSessionDate } from "@/lib/scheduleApi";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ slug: string; date: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug, date } = await params;

  try {
    await ensureSchema();
    const access = await assertTeamScheduleAccess(request, slug);
    if (isTeamAccessError(access)) return access;

    if (!isValidSessionDate(date)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }

    const session = await getSessionByDateForTeam(
      access.team.id,
      date,
      access.team.created_at,
      access.team.visible_days
    );
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const families = await getFamilies(access.team.id);
    const pickups = finalizeDropoffPickupsForSession(
      session,
      buildDefaultHomePickups(families, session, session.dropoff_pickups)
    );

    await updateSession(session.id, { dropoff_pickups: pickups });

    const updated = await getSessionByDateForTeam(
      access.team.id,
      date,
      access.team.created_at,
      access.team.visible_days
    );
    return NextResponse.json({ ok: true, session: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to set default pickups" }, { status: 500 });
  }
}
