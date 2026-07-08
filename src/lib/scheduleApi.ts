import { skippingFamilyIds } from "@/lib/absences";
import {
  cleanDropoffPickups,
  DEFAULT_HOME_PICKUP_MINUTES_BEFORE,
  dropoffDriverFamilyId,
  subtractMinutes,
  type DropoffPickups,
} from "@/lib/dropoffPickups";
import { getFamilies } from "@/lib/db";
import type { Family, SessionUpdate, SessionWithAssignments } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidSessionDate(value: string): boolean {
  return DATE_RE.test(value);
}

export async function resolveFamilyId(
  teamId: string,
  ref: { family_id?: string; family_name?: string }
): Promise<{ familyId: string } | { error: string }> {
  const families = await getFamilies(teamId);

  if (ref.family_id) {
    const match = families.find((family) => family.id === ref.family_id);
    if (!match) return { error: "Family not found" };
    return { familyId: match.id };
  }

  const name = ref.family_name?.trim();
  if (name) {
    const match = families.find((family) => family.name.toLowerCase() === name.toLowerCase());
    if (!match) return { error: `Family not found: ${name}` };
    return { familyId: match.id };
  }

  return { error: "family_id or family_name is required" };
}

export async function resolveDropoffPickupsInput(
  teamId: string,
  pickups: Record<string, string>
): Promise<{ pickups: DropoffPickups } | { error: string }> {
  const families = await getFamilies(teamId);
  const resolved: DropoffPickups = {};

  for (const [key, time] of Object.entries(pickups)) {
    const family =
      families.find((item) => item.id === key) ??
      families.find((item) => item.name.toLowerCase() === key.trim().toLowerCase());
    if (!family) return { error: `Unknown family: ${key}` };
    resolved[family.id] = time;
  }

  return { pickups: resolved };
}

export function buildDefaultHomePickups(
  families: Family[],
  session: Pick<SessionWithAssignments, "start_time" | "assignments" | "absences">,
  existing: DropoffPickups = {}
): DropoffPickups {
  const dropoffFamilyId = dropoffDriverFamilyId(session);
  const skipIds = skippingFamilyIds(session);
  const pickupTime = subtractMinutes(session.start_time, DEFAULT_HOME_PICKUP_MINUTES_BEFORE);
  const next: DropoffPickups = { ...existing };

  for (const family of families) {
    if (family.id === dropoffFamilyId || skipIds.has(family.id)) {
      delete next[family.id];
      continue;
    }
    next[family.id] = pickupTime;
  }

  return next;
}

export async function normalizeSessionUpdate(
  teamId: string,
  body: SessionUpdate & { dropoff_pickups?: Record<string, string> }
): Promise<{ update: SessionUpdate } | { error: string }> {
  const update: SessionUpdate = {};

  if (body.start_time !== undefined) update.start_time = body.start_time;
  if (body.end_time !== undefined) update.end_time = body.end_time;
  if (body.location_name !== undefined) update.location_name = body.location_name;
  if (body.location_notes !== undefined) update.location_notes = body.location_notes;
  if (body.cancelled !== undefined) update.cancelled = body.cancelled;

  if (body.dropoff_pickups !== undefined) {
    const resolved = await resolveDropoffPickupsInput(teamId, body.dropoff_pickups);
    if ("error" in resolved) return resolved;
    update.dropoff_pickups = resolved.pickups;
  }

  return { update };
}

export function finalizeDropoffPickupsForSession(
  session: SessionWithAssignments,
  pickups: DropoffPickups | undefined
): DropoffPickups | undefined {
  if (pickups === undefined) return undefined;
  const dropoffFamilyId = dropoffDriverFamilyId(session);
  const skipIds = skippingFamilyIds(session);
  return cleanDropoffPickups(pickups, dropoffFamilyId, skipIds);
}
