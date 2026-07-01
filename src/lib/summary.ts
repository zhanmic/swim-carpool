import { formatDayLabel, formatTime12, parseDateOnly } from "./dates";
import type { SessionWithAssignments, Team } from "./types";

function roleLabel(role: "dropoff" | "pickup"): string {
  return role === "dropoff" ? "Drop-off" : "Pick-up";
}

function familyForRole(session: SessionWithAssignments, role: "dropoff" | "pickup"): string {
  const a = session.assignments.find((x) => x.role === role);
  return a?.family_name ?? "OPEN";
}

export function formatWeekSummary(team: Team, sessions: SessionWithAssignments[], weekStart: string): string {
  const lines: string[] = [`🏊 ${team.name} — week of ${weekStart}`, ""];

  for (const session of sessions) {
    const date = parseDateOnly(session.session_date);
    const day = formatDayLabel(date);

    if (session.cancelled) {
      lines.push(`${day}: CANCELLED`);
      continue;
    }

    const time = `${formatTime12(session.start_time)}–${formatTime12(session.end_time)}`;
    const drop = familyForRole(session, "dropoff");
    const pick = familyForRole(session, "pickup");
    lines.push(`${day}: ${time} @ ${session.location_name}`);
    lines.push(`  Drop-off: ${drop} | Pick-up: ${pick}`);
    if (session.location_notes) {
      lines.push(`  Note: ${session.location_notes}`);
    }
    lines.push("");
  }

  lines.push("— Swim Carpool");
  return lines.join("\n").trim();
}
