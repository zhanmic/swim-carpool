import { assertTeamScheduleAccess, isTeamAccessError } from "@/lib/apiAuth";
import { clearAbsence, ensureSchema, getSessionByDateForTeam, markAbsence } from "@/lib/db";
import { isValidSessionDate, resolveFamilyId } from "@/lib/scheduleApi";
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

    const body = (await request.json()) as {
      family_id?: string;
      family_name?: string;
      action?: "mark" | "clear";
    };

    if (!body.action || (body.action !== "mark" && body.action !== "clear")) {
      return NextResponse.json({ error: "action must be mark or clear" }, { status: 400 });
    }

    const family = await resolveFamilyId(access.team.id, body);
    if ("error" in family) {
      return NextResponse.json({ error: family.error }, { status: 400 });
    }

    const result =
      body.action === "mark"
        ? await markAbsence(session.id, family.familyId)
        : await clearAbsence(session.id, family.familyId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    const updated = await getSessionByDateForTeam(
      access.team.id,
      date,
      access.team.created_at,
      access.team.visible_days
    );
    return NextResponse.json({ ok: true, session: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update skip status" }, { status: 500 });
  }
}
