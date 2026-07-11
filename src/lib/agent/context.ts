import { formatDayLabel, formatDateOnly, formatTime12, parseDateOnly } from "@/lib/dates";
import { skippingFamilyNames } from "@/lib/absences";
import { dropoffDriverFamilyId, cleanDropoffPickups, formatDropoffPickupsLine, parseDropoffPickups } from "@/lib/dropoffPickups";
import { getWeekData } from "@/lib/db";
import { visibleSessionDates } from "@/lib/visibleDays";
import type { AgentContext } from "./types";
import type { Family, SessionWithAssignments } from "@/lib/types";

function familyForRole(session: SessionWithAssignments, role: "dropoff" | "pickup"): string {
  const assignment = session.assignments.find((item) => item.role === role);
  return assignment?.family_name ?? "OPEN";
}

function formatSessionLine(session: SessionWithAssignments, families: Family[]): string {
  if (session.cancelled) {
    return `${formatDayLabel(parseDateOnly(session.session_date))} (${session.session_date}): CANCELLED`;
  }

  const day = formatDayLabel(parseDateOnly(session.session_date));
  const time = `${formatTime12(session.start_time)}–${formatTime12(session.end_time)}`;
  const drop = familyForRole(session, "dropoff");
  const pick = familyForRole(session, "pickup");
  const dropoffFamilyId = dropoffDriverFamilyId(session);
  const skipIds = new Set(session.absences.map((a) => a.family_id));
  const pickupLine = formatDropoffPickupsLine(
    cleanDropoffPickups(parseDropoffPickups(session.dropoff_pickups), dropoffFamilyId, skipIds),
    families,
    dropoffFamilyId,
    skipIds
  );
  const notes = session.location_notes?.trim() ? `notes="${session.location_notes.trim()}"` : "notes=none";
  const skipping = skippingFamilyNames(session);
  const skipPart = skipping.length > 0 ? ` | skip: ${skipping.join(", ")}` : "";
  const pickupPart = pickupLine ? ` | ${pickupLine}` : " | home pickups: none";
  return `${day} (${session.session_date}): ${time} @ ${session.location_name} | drop: ${drop} | pick: ${pick}${pickupPart} | ${notes}${skipPart}`;
}

export function buildDateLexicon(weekStart: string, visibleDays: number[]): string {
  const today = formatDateOnly(new Date());
  const lines = visibleSessionDates(weekStart, visibleDays).map((date) => {
    const label = parseDateOnly(date).toLocaleDateString("en-US", { weekday: "long" });
    const markers = date === today ? " (today)" : "";
    return `${label} -> ${date}${markers}`;
  });
  return lines.join("\n");
}

export async function loadAgentScheduleContext(
  slug: string,
  weekStart: string,
  activeFamilyId: string | null
): Promise<{ context: AgentContext; scheduleText: string; locationNames: string[] } | null> {
  const data = await getWeekData(slug, weekStart);
  if (!data) return null;

  const activeFamily = activeFamilyId
    ? data.families.find((family) => family.id === activeFamilyId) ?? null
    : null;

  const context: AgentContext = {
    slug,
    teamId: data.team.id,
    teamName: data.team.name,
    weekStart: data.weekStart,
    visibleDays: data.team.visible_days,
    teamCreatedAt: data.team.created_at,
    activeFamilyId: activeFamily?.id ?? null,
    activeFamilyName: activeFamily?.name ?? null,
  };

  const familyNames = data.families.map((family) => family.name).join(", ");
  const sessionLines = data.sessions.map((session) => formatSessionLine(session, data.families));
  const dateLexicon = buildDateLexicon(data.weekStart, data.team.visible_days);
  const locationNames = data.locations.map((location) => location.name);

  const scheduleText = [
    `Team: ${data.team.name}`,
    `Week start (Sunday): ${data.weekStart}`,
    `Families: ${familyNames}`,
    `Saved locations: ${locationNames.join(", ") || "none"}`,
    `Active family on this device: ${activeFamily?.name ?? "not set"}`,
    `Today: ${formatDateOnly(new Date())}`,
    `Date map:\n${dateLexicon}`,
    "Schedule:",
    ...sessionLines,
  ].join("\n");

  return { context, scheduleText, locationNames };
}

export function buildAgentSystemPrompt(scheduleText: string): string {
  return `You are the Swim Carpool schedule assistant. You help parents update swim practice carpools using tools.

Rules:
- Use YYYY-MM-DD dates from the date map only.
- Use exact family names from the schedule context.
- dropoff = drive to pool; pickup = pick up from pool after practice.
- If the user says "I" or "me" and active family is set, use that family.
- If date or family is unclear, ask a short question instead of calling tools.
- For destructive actions (clear_week, copy_previous_week), call the tool when the user clearly asks; the server will ask them to confirm before running.
- Safe changes run immediately. Destructive week actions wait for confirmation.
- Times use HH:MM 24-hour format. Locations should match saved location names when possible.
- You can combine steps in one turn (e.g. skip a family and set default home pickups).
- After tools run, reply in one or two short friendly sentences.
- Do not invent schedule data; use tools to change the schedule.

Current schedule:
${scheduleText}`;
}
