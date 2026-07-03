import { claimAssignment, getTeamBySlug, releaseAssignment, unclaimAssignment } from "@/lib/db";
import type { AssignmentRole } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, familyId, role, action, slug } = body as {
      sessionId?: string;
      familyId?: string;
      role?: AssignmentRole;
      action?: "claim" | "unclaim" | "release";
      slug?: string;
    };

    if (!sessionId || !familyId || !role || !action || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (role !== "dropoff" && role !== "pickup") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const team = await getTeamBySlug(slug);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const result =
      action === "claim"
        ? await claimAssignment(sessionId, familyId, role)
        : action === "release"
          ? await releaseAssignment(sessionId, role)
          : await unclaimAssignment(sessionId, familyId, role);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}
