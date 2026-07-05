import { applyTimeToWeek, ensureSchema, ensureWeekSessions, getTeamBySlug } from "@/lib/db";
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

    const body = (await request.json()) as {
      weekStart?: string;
      start_time?: string;
      end_time?: string;
    };
    const { weekStart, start_time, end_time } = body;

    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json({ error: "weekStart required (YYYY-MM-DD)" }, { status: 400 });
    }
    if (!start_time || !end_time) {
      return NextResponse.json({ error: "start_time and end_time are required" }, { status: 400 });
    }

    await ensureWeekSessions(team.id, weekStart, undefined, team.visible_days);
    const updated = await applyTimeToWeek(team.id, weekStart, start_time, end_time, team.visible_days);

    return NextResponse.json({ updated, start_time, end_time });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to apply time to week" }, { status: 500 });
  }
}
