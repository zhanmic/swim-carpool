import { dropoffDriverFamilyId, formatDropoffPickupsLine, resolveDropoffPickups } from "./dropoffPickups";
import { parseDateOnly } from "./dates";
import type { Family, SessionWithAssignments } from "./types";

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcsLocal(date: string, time: string): string {
  const [year, month, day] = date.split("-");
  const [hour, minute] = time.split(":");
  return `${year}${month}${day}T${hour}${minute}00`;
}

function formatIcsUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function assignmentLine(session: SessionWithAssignments, role: "dropoff" | "pickup", label: string): string {
  const name = session.assignments.find((a) => a.role === role)?.family_name ?? "Open";
  return `${label}: ${name}`;
}

export function buildSessionCalendarEvent(
  session: SessionWithAssignments,
  teamName: string,
  families: Family[] = []
): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  const summary = escapeIcsText(`${teamName} — Swim Practice`);
  const location = escapeIcsText(session.location_name);

  const descriptionParts = [
    assignmentLine(session, "dropoff", "Drop-off"),
    assignmentLine(session, "pickup", "Pick-up"),
  ];
  const dropoffFamilyId = dropoffDriverFamilyId(session);
  const pickupLine = formatDropoffPickupsLine(
    resolveDropoffPickups(session.dropoff_pickups, session.start_time, families, dropoffFamilyId),
    families,
    dropoffFamilyId
  );
  if (pickupLine) descriptionParts.push(pickupLine);
  if (session.location_notes?.trim()) {
    descriptionParts.push(`Note: ${session.location_notes.trim()}`);
  }
  const description = escapeIcsText(descriptionParts.join("\n"));

  const dtStart = formatIcsLocal(session.session_date, session.start_time);
  const dtEnd = formatIcsLocal(session.session_date, session.end_time);
  const dtStamp = formatIcsUtcStamp(new Date());
  const uid = `${session.id}@swim-carpool`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Swim Carpool//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=${tz}:${dtStart}`,
    `DTEND;TZID=${tz}:${dtEnd}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadCalendarEvent(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function calendarFilename(session: SessionWithAssignments, teamName: string): string {
  const safeTeam = teamName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "swim";
  return `${safeTeam}-${session.session_date}.ics`;
}

export function exportSessionToCalendar(
  session: SessionWithAssignments,
  teamName: string,
  families: Family[] = []
): void {
  const ics = buildSessionCalendarEvent(session, teamName, families);
  downloadCalendarEvent(ics, calendarFilename(session, teamName));
}
