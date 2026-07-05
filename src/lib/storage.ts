const FAMILY_PREFIX = "swim-carpool:family:";
const KNOWN_TEAMS_KEY = "swim-carpool:known-teams";
const ADMIN_UNLOCKED_KEY = "swim-carpool:admin-unlocked";
const ADMIN_PASSWORD_KEY = "swim-carpool:admin-password";

export interface KnownTeam {
  slug: string;
  name: string;
  lastAccessedAt: string;
}

export function getActiveFamilyId(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${FAMILY_PREFIX}${slug}`);
}

export function setActiveFamilyId(slug: string, familyId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${FAMILY_PREFIX}${slug}`, familyId);
}

export function clearActiveFamilyId(slug: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${FAMILY_PREFIX}${slug}`);
}

export function getKnownTeams(): KnownTeam[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KNOWN_TEAMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is KnownTeam =>
          !!item &&
          typeof item === "object" &&
          typeof (item as KnownTeam).slug === "string" &&
          typeof (item as KnownTeam).name === "string"
      )
      .sort((a, b) => b.lastAccessedAt.localeCompare(a.lastAccessedAt));
  } catch {
    return [];
  }
}

export function recordKnownTeam(slug: string, name: string): void {
  if (typeof window === "undefined") return;
  const trimmedName = name.trim();
  if (!slug || !trimmedName) return;

  const existing = getKnownTeams().filter((team) => team.slug !== slug);
  const next: KnownTeam[] = [
    { slug, name: trimmedName, lastAccessedAt: new Date().toISOString() },
    ...existing,
  ];
  localStorage.setItem(KNOWN_TEAMS_KEY, JSON.stringify(next));
}

export function removeKnownTeam(slug: string): void {
  if (typeof window === "undefined") return;
  const next = getKnownTeams().filter((team) => team.slug !== slug);
  localStorage.setItem(KNOWN_TEAMS_KEY, JSON.stringify(next));
}

export function isAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_UNLOCKED_KEY) === "1";
}

export function getAdminSessionPassword(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_PASSWORD_KEY);
}

export function setAdminSession(password: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_UNLOCKED_KEY, "1");
  sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_UNLOCKED_KEY);
  sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
}
