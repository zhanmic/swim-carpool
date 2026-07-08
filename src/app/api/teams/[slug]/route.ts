import { verifyAdminPassword } from "@/lib/admin";
import { deleteTeamBySlug, updateTeam, verifyTeamDeletePassword } from "@/lib/db";
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
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    const team = await updateTeam(slug, {
      name: body.name,
      schedule_url: body.schedule_url ?? null,
      visible_days: body.visible_days,
      ...(body.delete_password !== undefined ? { delete_password: body.delete_password } : {}),
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
