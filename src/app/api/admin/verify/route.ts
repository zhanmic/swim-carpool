import { verifyAdminPassword } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Admin is not configured" }, { status: 503 });
    }

    const body = (await request.json()) as { adminPassword?: string };
    if (!body.adminPassword || !verifyAdminPassword(body.adminPassword)) {
      return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to verify admin password" }, { status: 500 });
  }
}
