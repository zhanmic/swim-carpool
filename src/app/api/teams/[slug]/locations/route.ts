import {
  addSavedLocation,
  deleteSavedLocation,
  ensureSchema,
  getSavedLocations,
  getTeamBySlug,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    await ensureSchema();
    const team = await getTeamBySlug(slug);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    const locations = await getSavedLocations(team.id);
    return NextResponse.json({ locations });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load locations" }, { status: 500 });
  }
}

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

    const body = (await request.json()) as { name?: string; action?: string; id?: string };

    if (body.action === "delete" && body.id) {
      const ok = await deleteSavedLocation(team.id, body.id);
      if (!ok) {
        return NextResponse.json({ error: "Cannot remove the last location" }, { status: 400 });
      }
      const locations = await getSavedLocations(team.id);
      return NextResponse.json({ locations });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Location name is required" }, { status: 400 });
    }

    const location = await addSavedLocation(team.id, body.name);
    const locations = await getSavedLocations(team.id);
    return NextResponse.json({ location, locations }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update locations" }, { status: 500 });
  }
}
