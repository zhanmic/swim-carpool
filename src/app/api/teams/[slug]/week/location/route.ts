import { applyLocationToWeek, ensureSchema, ensureWeekSessions, getTeamBySlug } from "@/lib/db";
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

    const body = (await request.json()) as { weekStart?: string; locationName?: string };
    const { weekStart, locationName } = body;

    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json({ error: "weekStart required (YYYY-MM-DD)" }, { status: 400 });
    }
    if (!locationName?.trim()) {
      return NextResponse.json({ error: "locationName is required" }, { status: 400 });
    }

    await ensureWeekSessions(team.id, weekStart, undefined, team.visible_days);
    const updated = await applyLocationToWeek(team.id, weekStart, locationName, team.visible_days);

    return NextResponse.json({ updated, locationName: locationName.trim() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to apply location to week" }, { status: 500 });
  }
}
