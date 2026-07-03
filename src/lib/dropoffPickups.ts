import { formatTime12, snapTimeToStep } from "./dates";
import type { Family } from "./types";

export type DropoffPickups = Record<string, string>;

export const DEFAULT_HOME_PICKUP_MINUTES_BEFORE = 30;

export function parseDropoffPickups(value: unknown): DropoffPickups {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as DropoffPickups;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as DropoffPickups;
  }
  return {};
}

export function cleanDropoffPickups(pickups: DropoffPickups): DropoffPickups {
  const cleaned: DropoffPickups = {};
  for (const [familyId, time] of Object.entries(pickups)) {
    const trimmed = time.trim();
    if (trimmed) cleaned[familyId] = snapTimeToStep(trimmed);
  }
  return cleaned;
}

export function subtractMinutes(time: string, minutes: number): string {
  const [hourStr, minuteStr] = time.split(":");
  let total = Number(hourStr) * 60 + Number(minuteStr) - minutes;
  if (total < 0) total = 0;
  const hours = Math.floor(total / 60) % 24;
  const mins = total % 60;
  return snapTimeToStep(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
}

export function defaultDropoffPickups(startTime: string, families: Family[]): DropoffPickups {
  const pickupTime = subtractMinutes(startTime, DEFAULT_HOME_PICKUP_MINUTES_BEFORE);
  return Object.fromEntries(families.map((family) => [family.id, pickupTime]));
}

export function resolveDropoffPickups(
  stored: DropoffPickups | null | undefined,
  startTime: string,
  families: Family[]
): DropoffPickups {
  const parsed = cleanDropoffPickups(parseDropoffPickups(stored));
  const defaultTime = subtractMinutes(startTime, DEFAULT_HOME_PICKUP_MINUTES_BEFORE);
  const resolved: DropoffPickups = {};

  for (const family of families) {
    const saved = parsed[family.id]?.trim();
    resolved[family.id] = saved ? snapTimeToStep(saved) : defaultTime;
  }

  return resolved;
}

export function formatDropoffPickupsLine(pickups: DropoffPickups, families: Family[]): string | null {
  const cleaned = cleanDropoffPickups(pickups);
  const parts = [...families]
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((family) => {
      const time = cleaned[family.id];
      return time ? [`${family.name} ${formatTime12(time)}`] : [];
    });

  if (parts.length === 0) return null;
  return `Home pickup: ${parts.join(", ")}`;
}

export function formatDriverNotesPreview(
  session: {
    start_time: string;
    location_notes?: string | null;
    dropoff_pickups?: DropoffPickups | null;
  },
  families: Family[]
): string | null {
  const parts: string[] = [];
  const pickupLine = formatDropoffPickupsLine(
    resolveDropoffPickups(session.dropoff_pickups, session.start_time, families),
    families
  );
  if (pickupLine) parts.push(pickupLine);
  if (session.location_notes?.trim()) parts.push(session.location_notes.trim());
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function hasDriverNotes(
  session: {
    start_time: string;
    location_notes?: string | null;
    dropoff_pickups?: DropoffPickups | null;
  },
  families: Family[]
): boolean {
  return formatDriverNotesPreview(session, families) !== null;
}
