import { getTeamApiKeyHash, getTeamBySlug } from "@/lib/db";
import { verifyTeamApiKey } from "@/lib/apiKey";
import type { Team } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/** Slug access always works for the web app. Bearer token is optional extra auth for integrations. */
export async function assertTeamScheduleAccess(
  request: NextRequest,
  slug: string
): Promise<{ team: Team } | NextResponse> {
  const team = await getTeamBySlug(slug);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const bearer = getBearerToken(request);
  if (!bearer) {
    return { team };
  }

  const hash = await getTeamApiKeyHash(slug);
  if (!hash || !verifyTeamApiKey(bearer, hash)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
  }

  return { team };
}

export function isTeamAccessError(result: { team: Team } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
