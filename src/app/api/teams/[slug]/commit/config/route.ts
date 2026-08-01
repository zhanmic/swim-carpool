import { requireAdmin } from "@/lib/admin";
import { assertTeamScheduleAccess, isTeamAccessError } from "@/lib/apiAuth";
import { ensureSchema } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/** Full schedule-source config including Super Team ID — admin only. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const denied = requireAdmin(request);
    if (denied) return denied;

    await ensureSchema();
    const access = await assertTeamScheduleAccess(request, slug);
    if (isTeamAccessError(access)) return access;

    return NextResponse.json({
      schedule_integration: access.team.schedule_integration,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load schedule source" }, { status: 500 });
  }
}
