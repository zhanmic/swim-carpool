import { COMMIT_API_BASE } from "./config";
import type { WebsiteData2a, WebsiteData2b } from "./types";

/** Cache Commit responses server-side; data is public and changes infrequently. */
const REVALIDATE_SECONDS = 300;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${COMMIT_API_BASE}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Commit API ${res.status}: ${path}`);
  }
  return (await res.json()) as T;
}

export function fetchTeamConfig(superTeamId: string): Promise<WebsiteData2a> {
  return getJson<WebsiteData2a>(
    `/website-data-2a?superTeamId=${encodeURIComponent(superTeamId)}`
  );
}

export function fetchScheduleData(
  superTeamId: string,
  includeMeets = false
): Promise<WebsiteData2b> {
  return getJson<WebsiteData2b>(
    `/website-data-2b?superTeamId=${encodeURIComponent(superTeamId)}&includeMeets=${
      includeMeets ? "true" : "false"
    }`
  );
}
