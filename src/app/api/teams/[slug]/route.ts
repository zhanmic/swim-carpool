import { isAdminConfigured, requireAdmin, verifyAdminPassword } from "@/lib/admin";
import { parseScheduleIntegration, redactScheduleIntegration } from "@/lib/commit/config";
import { deleteTeamBySlug, updateTeam, verifyTeamDeletePassword } from "@/lib/db";
import type { ScheduleIntegration } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = (await request.json()) as {
      name?: string;
      schedule_url?: string | null;
      visible_days?: number[];
      delete_password?: string;
      schedule_integration?: unknown;
      adminPassword?: string;
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    // Only touch schedule_integration when the key is present. An empty/invalid
    // value clears it (disables the integration). Admin-only when configured.
    let integration: ScheduleIntegration | null | undefined;
    if ("schedule_integration" in body) {
      const denied = requireAdmin(request, body.adminPassword);
      if (denied) return denied;
      integration = body.schedule_integration
        ? parseScheduleIntegration(body.schedule_integration)
        : null;
    }

    const team = await updateTeam(slug, {
      name: body.name,
      schedule_url: body.schedule_url ?? null,
      visible_days: body.visible_days,
      ...(body.delete_password !== undefined ? { delete_password: body.delete_password } : {}),
      ...(integration !== undefined ? { schedule_integration: integration } : {}),
    });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Never return the Super Team ID on a non-admin schedule write path; admin
    // writes already verified above when schedule_integration was present.
    if (
      isAdminConfigured() &&
      team.schedule_integration &&
      !("schedule_integration" in body)
    ) {
      return NextResponse.json({
        team: {
          ...team,
          schedule_integration: redactScheduleIntegration(team.schedule_integration),
        },
      });
    }

    return NextResponse.json({ team });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to rename team" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = (await request.json()) as { password?: string; adminPassword?: string };
    const password = body.password ?? body.adminPassword;
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const adminOk = verifyAdminPassword(password);
    const teamOk = !adminOk && (await verifyTeamDeletePassword(slug, password));
    if (!adminOk && !teamOk) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
    }

    const deleted = await deleteTeamBySlug(slug);
    if (!deleted) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 });
  }
}
