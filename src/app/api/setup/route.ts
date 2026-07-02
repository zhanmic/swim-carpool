import { createTeam, ensureSchema } from "@/lib/db";
import type { CreateTeamTemplate } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const body = await request.json();
    const { name, families, templates } = body as {
      name?: string;
      families?: string[];
      templates?: CreateTeamTemplate[];
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    const familyNames = (families ?? []).map((f) => f.trim()).filter(Boolean);
    if (familyNames.length === 0) {
      return NextResponse.json({ error: "At least one family is required" }, { status: 400 });
    }

    const result = await createTeam(name.trim(), familyNames, templates);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to create team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
