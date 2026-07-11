import { assertTeamScheduleAccess, isTeamAccessError } from "@/lib/apiAuth";
import { runAgentConfirmation, runAgentTurn } from "@/lib/agent/run";
import type { AgentRequestBody } from "@/lib/agent/types";
import { ensureSchema } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await ensureSchema();
    const access = await assertTeamScheduleAccess(request, slug);
    if (isTeamAccessError(access)) return access;

    const body = (await request.json()) as AgentRequestBody;

    if (body.confirm) {
      if (!body.week_start || !/^\d{4}-\d{2}-\d{2}$/.test(body.week_start)) {
        return NextResponse.json({ error: "week_start required (YYYY-MM-DD)" }, { status: 400 });
      }
      const result = await runAgentConfirmation({
        slug,
        weekStart: body.week_start,
        activeFamilyId: body.active_family_id ?? null,
        token: body.confirm.token,
        approved: body.confirm.approved,
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json(result);
    }

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    if (!body.week_start || !/^\d{4}-\d{2}-\d{2}$/.test(body.week_start)) {
      return NextResponse.json({ error: "week_start required (YYYY-MM-DD)" }, { status: 400 });
    }

    const result = await runAgentTurn({
      slug,
      weekStart: body.week_start,
      message,
      activeFamilyId: body.active_family_id ?? null,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Agent request failed";
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 500 });
  }
}
