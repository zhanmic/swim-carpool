export type Theme = "light" | "dark";

const THEME_KEY = "swim-carpool:theme";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(THEME_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}
