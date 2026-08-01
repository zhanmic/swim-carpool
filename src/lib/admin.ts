import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export function isAdminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;

  const provided = Buffer.from(password);
  const secret = Buffer.from(expected);
  if (provided.length !== secret.length) return false;

  return timingSafeEqual(provided, secret);
}

/** Admin password from `Authorization: Bearer …` and/or a body field. */
export function adminPasswordFromRequest(
  request: NextRequest,
  bodyPassword?: string | null
): string | null {
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token) return token;
  }
  const fromBody = bodyPassword?.trim();
  return fromBody || null;
}

/** When admin is configured, require a valid admin password. Otherwise allow. */
export function requireAdmin(
  request: NextRequest,
  bodyPassword?: string | null
): NextResponse | null {
  if (!isAdminConfigured()) return null;
  const password = adminPasswordFromRequest(request, bodyPassword);
  if (!password || !verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Admin password required" }, { status: 403 });
  }
  return null;
}
