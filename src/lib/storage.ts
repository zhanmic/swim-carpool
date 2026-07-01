const PREFIX = "swim-carpool:family:";

export function getActiveFamilyId(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${PREFIX}${slug}`);
}

export function setActiveFamilyId(slug: string, familyId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFIX}${slug}`, familyId);
}

export function clearActiveFamilyId(slug: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${PREFIX}${slug}`);
}
