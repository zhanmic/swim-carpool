import { deleteTeamBySlug, updateTeam } from "@/lib/db";
import { verifyAdminPassword } from "@/lib/admin";
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
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    const team = await updateTeam(slug, {
      name: body.name,
      schedule_url: body.schedule_url ?? null,
      visible_days: body.visible_days,
    });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
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
    const body = (await request.json()) as { adminPassword?: string };
    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Admin delete is not configured" }, { status: 503 });
    }
    if (!body.adminPassword || !verifyAdminPassword(body.adminPassword)) {
      return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 });
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
