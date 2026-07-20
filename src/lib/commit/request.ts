import type { ScheduleIntegration, Team } from "@/lib/types";
import { parseScheduleIntegration } from "./config";

/**
 * Resolve the integration to use for a request. When a `superTeamId` query
 * param is present, build an ad-hoc integration from the query (used by the
 * settings UI to preview groups before saving); otherwise fall back to the
 * team's saved config.
 */
export function integrationFromParams(
  params: URLSearchParams,
  team: Pick<Team, "schedule_integration">
): ScheduleIntegration | null {
  const superTeamId = params.get("superTeamId");
  if (!superTeamId) return team.schedule_integration;

  const fields = params.get("fields");
  return parseScheduleIntegration({
    provider: "commit",
    superTeamId,
    timezone: params.get("timezone") ?? undefined,
    group: params.get("group"),
    includeMeets: params.get("includeMeets") === "true",
    nameFormat: {
      mode: params.get("mode") ?? undefined,
      separator: params.get("separator") ?? undefined,
      fields: fields
        ? fields
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean)
        : undefined,
    },
  });
}
