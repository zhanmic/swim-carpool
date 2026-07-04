import {
  addFamily,
  deleteFamily,
  ensureSchema,
  getFamilies,
  getTeamBySlug,
  updateFamily,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    await ensureSchema();
    const team = await getTeamBySlug(slug);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      action?: string;
      id?: string;
      name?: string;
    };

    if (body.action === "delete" && body.id) {
      const result = await deleteFamily(team.id, body.id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error ?? "Could not remove family" }, { status: 400 });
      }
      const families = await getFamilies(team.id);
      return NextResponse.json({ families });
    }

    if (body.action === "rename" && body.id) {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: "Family name is required" }, { status: 400 });
      }
      const result = await updateFamily(team.id, body.id, body.name);
      if (!result.family) {
        return NextResponse.json({ error: result.error ?? "Could not rename family" }, { status: 400 });
      }
      const families = await getFamilies(team.id);
      return NextResponse.json({ family: result.family, families });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Family name is required" }, { status: 400 });
    }

    const result = await addFamily(team.id, body.name);
    if (!result.family) {
      return NextResponse.json({ error: result.error ?? "Could not add family" }, { status: 400 });
    }
    const families = await getFamilies(team.id);
    return NextResponse.json({ family: result.family, families }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update families" }, { status: 500 });
  }
}
