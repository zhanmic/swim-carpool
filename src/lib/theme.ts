export type Theme = "light" | "dark";

const THEME_KEY = "swim-carpool:theme";

/** Local hour (0–23) when light mode starts. */
export const LIGHT_START_HOUR = 7;
/** Local hour (0–23) when dark mode starts. */
export const DARK_START_HOUR = 19;

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(THEME_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function getThemeByLocalTime(date: Date = new Date()): Theme {
  const hour = date.getHours();
  return hour >= DARK_START_HOUR || hour < LIGHT_START_HOUR ? "dark" : "light";
}

export function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = getStoredTheme();
  if (stored) return stored;
  return getThemeByLocalTime();
}

export function msUntilNextThemeBoundary(from: Date = new Date()): number {
  const hour = from.getHours();
  const next = new Date(from);
  if (hour < LIGHT_START_HOUR) {
    next.setHours(LIGHT_START_HOUR, 0, 0, 0);
  } else if (hour < DARK_START_HOUR) {
    next.setHours(DARK_START_HOUR, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(LIGHT_START_HOUR, 0, 0, 0);
  }
  return Math.max(0, next.getTime() - from.getTime());
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function buildThemeInitScript(): string {
  return `(function(){try{var k="swim-carpool:theme",t=localStorage.getItem(k),h=new Date().getHours(),d=t==="dark"||(t!=="light"&&(h>=${DARK_START_HOUR}||h<${LIGHT_START_HOUR}));document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
}
