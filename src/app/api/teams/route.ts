import { ensureSchema, listTeams } from "@/lib/db";
import { verifyAdminPassword } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Admin is not configured" }, { status: 503 });
    }

    const auth = request.headers.get("Authorization");
    const password = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!password || !verifyAdminPassword(password)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await ensureSchema();
    const teams = await listTeams();
    return NextResponse.json({ teams });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to list teams" }, { status: 500 });
  }
}
