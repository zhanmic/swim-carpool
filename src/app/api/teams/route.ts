import { ensureSchema, listTeams } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await ensureSchema();
    const teams = await listTeams();
    return NextResponse.json({ teams });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to list teams" }, { status: 500 });
  }
}
