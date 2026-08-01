import { requireAdmin } from "@/lib/admin";
import { getTeamBySlug, updateTeam } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Set or clear a team's deletion password. Admin only when ADMIN_PASSWORD is set.
 * Body: { delete_password: string } — empty string clears it.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = (await request.json()) as {
      delete_password?: string;
      adminPassword?: string;
    };

    const denied = requireAdmin(request, body.adminPassword);
    if (denied) return denied;

    if (typeof body.delete_password !== "string") {
      return NextResponse.json({ error: "delete_password is required" }, { status: 400 });
    }

    const existing = await getTeamBySlug(slug);
    if (!existing) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const team = await updateTeam(slug, {
      name: existing.name,
      schedule_url: existing.schedule_url,
      delete_password: body.delete_password,
    });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({
      team: {
        secret_slug: team.secret_slug,
        name: team.name,
        has_delete_password: team.has_delete_password,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update deletion password" }, { status: 500 });
  }
}
