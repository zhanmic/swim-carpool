import { adminPasswordFromRequest, verifyAdminPassword } from "@/lib/admin";
import { getTeamBySlug, updateTeam, verifyTeamDeletePassword } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Set or clear a team's deletion password.
 *
 * Auth (either):
 * - Admin (Bearer / adminPassword) — home admin flow; no current password needed
 * - Current deletion password (`current_password`) when one is already set
 * - If none is set yet, anyone with the team link may set the first password
 *
 * Body: { delete_password: string, current_password?: string, adminPassword?: string }
 * Empty `delete_password` clears it.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = (await request.json()) as {
      delete_password?: string;
      current_password?: string;
      old_password?: string;
      adminPassword?: string;
    };

    if (typeof body.delete_password !== "string") {
      return NextResponse.json({ error: "delete_password is required" }, { status: 400 });
    }

    const existing = await getTeamBySlug(slug);
    if (!existing) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const adminCandidate = adminPasswordFromRequest(request, body.adminPassword);
    const isAdmin = !!adminCandidate && verifyAdminPassword(adminCandidate);

    if (!isAdmin && existing.has_delete_password) {
      const current = (body.current_password ?? body.old_password ?? "").trim();
      if (!current || !(await verifyTeamDeletePassword(slug, current))) {
        return NextResponse.json(
          { error: "Incorrect current deletion password" },
          { status: 403 }
        );
      }
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
