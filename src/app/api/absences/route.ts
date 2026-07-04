import { clearAbsence, ensureSchema, getTeamBySlug, markAbsence } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const body = await request.json();
    const { sessionId, familyId, action, slug } = body as {
      sessionId?: string;
      familyId?: string;
      action?: "mark" | "clear";
      slug?: string;
    };

    if (!sessionId || !familyId || !action || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (action !== "mark" && action !== "clear") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const team = await getTeamBySlug(slug);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const result = action === "mark" ? await markAbsence(sessionId, familyId) : await clearAbsence(sessionId, familyId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update skip status" }, { status: 500 });
  }
}
