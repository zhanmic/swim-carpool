import { createTeam, ensureSchema } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const body = await request.json();
    const { name, families, location_name, location_address, start_time, end_time, delete_password } = body as {
      name?: string;
      families?: string[];
      location_name?: string;
      location_address?: string;
      start_time?: string;
      end_time?: string;
      delete_password?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    const familyNames = (families ?? []).map((f) => f.trim()).filter(Boolean);
    if (familyNames.length === 0) {
      return NextResponse.json({ error: "At least one family is required" }, { status: 400 });
    }

    if (!location_name?.trim()) {
      return NextResponse.json({ error: "Practice location is required" }, { status: 400 });
    }

    if (!start_time?.trim() || !end_time?.trim()) {
      return NextResponse.json({ error: "Practice start and end times are required" }, { status: 400 });
    }

    const result = await createTeam(name.trim(), familyNames, {
      location_name: location_name.trim(),
      location_address: location_address?.trim() || null,
      start_time: start_time.trim(),
      end_time: end_time.trim(),
    }, {
      delete_password: delete_password?.trim() || null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to create team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
