import { isAdminConfigured } from "@/lib/admin";
import { redactScheduleIntegration } from "@/lib/commit/config";
import { ensureSchema, getWeekData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const start = request.nextUrl.searchParams.get("start");

  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return NextResponse.json({ error: "start query param required (YYYY-MM-DD)" }, { status: 400 });
  }

  try {
    await ensureSchema();
    const data = await getWeekData(slug, start);
    if (!data) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Hide Commit Super Team IDs from anyone with the share link.
    if (isAdminConfigured() && data.team.schedule_integration) {
      return NextResponse.json({
        ...data,
        team: {
          ...data.team,
          schedule_integration: redactScheduleIntegration(data.team.schedule_integration),
        },
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load week data" }, { status: 500 });
  }
}
