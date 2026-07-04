import type { SessionAbsence } from "./types";

export function sessionAbsences(session: { absences?: SessionAbsence[] }): SessionAbsence[] {
  return session.absences ?? [];
}

export function isFamilySkipping(session: { absences?: SessionAbsence[] }, familyId: string): boolean {
  return sessionAbsences(session).some((a) => a.family_id === familyId);
}

export function skippingFamilyNames(session: { absences?: SessionAbsence[] }): string[] {
  return sessionAbsences(session)
    .map((a) => a.family_name)
    .filter((name): name is string => !!name)
    .sort((a, b) => a.localeCompare(b));
}

export function skippingFamilyIds(session: { absences?: SessionAbsence[] }): Set<string> {
  return new Set(sessionAbsences(session).map((a) => a.family_id));
}
