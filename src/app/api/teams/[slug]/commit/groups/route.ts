import { assertTeamScheduleAccess, isTeamAccessError } from "@/lib/apiAuth";
import { fetchTeamMeta, listGroups } from "@/lib/commit";
import { integrationFromParams } from "@/lib/commit/request";
import { ensureSchema } from "@/lib/db";
import { defaultWeekStartStr } from "@/lib/dates";
import { NextRequest, NextResponse } from "next/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await ensureSchema();
    const access = await assertTeamScheduleAccess(request, slug);
    if (isTeamAccessError(access)) return access;

    const url = new URL(request.url);
    const integration = integrationFromParams(url.searchParams, access.team);
    if (!integration) {
      return NextResponse.json({ configured: false, groups: [] });
    }

    const weekStartParam = url.searchParams.get("week_start");
    const weekStart = weekStartParam && DATE_RE.test(weekStartParam) ? weekStartParam : defaultWeekStartStr();

    const [groups, meta] = await Promise.all([
      listGroups(integration, weekStart, 6),
      fetchTeamMeta(integration.superTeamId).catch(() => ({ name: null, timezone: null })),
    ]);

    return NextResponse.json({
      configured: true,
      groups,
      selectedGroup: integration.group,
      teamName: meta.name,
      timezone: meta.timezone ?? integration.timezone,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load Commit groups" }, { status: 502 });
  }
}
