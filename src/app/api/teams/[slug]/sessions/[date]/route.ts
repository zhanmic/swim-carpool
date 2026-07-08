import { assertTeamScheduleAccess, isTeamAccessError } from "@/lib/apiAuth";
import {
  ensureSchema,
  getFamilies,
  getSessionByDateForTeam,
  updateSession,
} from "@/lib/db";
import {
  finalizeDropoffPickupsForSession,
  isValidSessionDate,
  normalizeSessionUpdate,
} from "@/lib/scheduleApi";
import type { SessionUpdate } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ slug: string; date: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    return NextResponse.json({ session });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { slug, date } = await params;

  try {
    await ensureSchema();
    const access = await assertTeamScheduleAccess(request, slug);
    if (isTeamAccessError(access)) return access;

    if (!isValidSessionDate(date)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }

    const existing = await getSessionByDateForTeam(
      access.team.id,
      date,
      access.team.created_at,
      access.team.visible_days
    );
    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = (await request.json()) as SessionUpdate & { dropoff_pickups?: Record<string, string> };
    const normalized = await normalizeSessionUpdate(access.team.id, body);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    if (normalized.update.dropoff_pickups !== undefined) {
      normalized.update.dropoff_pickups = finalizeDropoffPickupsForSession(
        existing,
        normalized.update.dropoff_pickups
      );
    }

    const session = await updateSession(existing.id, normalized.update);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const full = await getSessionByDateForTeam(
      access.team.id,
      date,
      access.team.created_at,
      access.team.visible_days
    );
    return NextResponse.json({ session: full });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
