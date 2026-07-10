import {
  clearWeekAssignments,
  copyScheduleFromPreviousWeek,
  ensureSchema,
  getTeamBySlug,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await ensureSchema();
    const team = await getTeamBySlug(slug);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const body = (await request.json()) as { action?: string; weekStart?: string };
    const { action, weekStart } = body;

    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json({ error: "weekStart required (YYYY-MM-DD)" }, { status: 400 });
    }

    if (action === "clear") {
      const cleared = await clearWeekAssignments(team.id, weekStart, team.visible_days, {
        notesAndPickups: true,
      });
      return NextResponse.json({ cleared });
    }

    if (action === "copy_previous") {
      const result = await copyScheduleFromPreviousWeek(team.id, weekStart, team.visible_days);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update assignments" }, { status: 500 });
  }
}
