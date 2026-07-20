import { assertTeamScheduleAccess, isTeamAccessError } from "@/lib/apiAuth";
import { applyCommitWeekImport } from "@/lib/commitImport";
import { ensureSchema } from "@/lib/db";
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

    const result = await applyCommitWeekImport({
      teamId: team.id,
      teamCreatedAt: team.created_at,
      visibleDays: team.visible_days,
      integration,
      weekStart,
      ...(body.group !== undefined ? { group: body.group } : {}),
    });

    return NextResponse.json({ week_start: weekStart, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to import Commit schedule" }, { status: 502 });
  }
}
