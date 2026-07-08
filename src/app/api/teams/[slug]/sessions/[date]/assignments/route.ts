import { assertTeamScheduleAccess, isTeamAccessError } from "@/lib/apiAuth";
import {
  claimAssignment,
  ensureSchema,
  getSessionByDateForTeam,
  releaseAssignment,
  unclaimAssignment,
} from "@/lib/db";
import { isValidSessionDate, resolveFamilyId } from "@/lib/scheduleApi";
import type { AssignmentRole } from "@/lib/types";
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
      role?: AssignmentRole;
      action?: "claim" | "release" | "unclaim";
    };

    if (!body.role || (body.role !== "dropoff" && body.role !== "pickup")) {
      return NextResponse.json({ error: "role must be dropoff or pickup" }, { status: 400 });
    }
    if (!body.action || !["claim", "release", "unclaim"].includes(body.action)) {
      return NextResponse.json({ error: "action must be claim, release, or unclaim" }, { status: 400 });
    }

    let result: { ok: boolean; error?: string };
    if (body.action === "release") {
      result = await releaseAssignment(session.id, body.role);
    } else {
      const family = await resolveFamilyId(access.team.id, body);
      if ("error" in family) {
        return NextResponse.json({ error: family.error }, { status: 400 });
      }
      result =
        body.action === "claim"
          ? await claimAssignment(session.id, family.familyId, body.role)
          : await unclaimAssignment(session.id, family.familyId, body.role);
    }

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
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}
