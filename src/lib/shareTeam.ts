export function getTeamUrl(slug: string): string {
  if (typeof window === "undefined") {
    return `/c/${slug}`;
  }
  return `${window.location.origin}/c/${slug}`;
}

export async function shareTeamLink(slug: string, teamName: string): Promise<"shared" | "copied" | "cancelled"> {
  const url = getTeamUrl(slug);
  const title = `${teamName} — Swim Carpool`;
  const text = `Join our swim carpool: ${teamName}`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return "cancelled";
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return "copied";
  }

  throw new Error("Could not share link");
}
