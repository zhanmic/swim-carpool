"use client";

import { applyTheme, getPreferredTheme, setStoredTheme, type Theme } from "@/lib/theme";
import { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const initial = getPreferredTheme();
    setThemeState(initial);
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      if (localStorage.getItem("swim-carpool:theme")) return;
      const next = media.matches ? "dark" : "light";
      setThemeState(next);
      applyTheme(next);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    applyTheme(next);
    setStoredTheme(next);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
