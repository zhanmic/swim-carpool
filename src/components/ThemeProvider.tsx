"use client";

import {
  applyTheme,
  getPreferredTheme,
  getStoredTheme,
  getThemeByLocalTime,
  msUntilNextThemeBoundary,
  setStoredTheme,
  type Theme,
} from "@/lib/theme";
import { createContext, useContext, useEffect, useRef, useState } from "react";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const boundaryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    function clearBoundaryTimeout() {
      if (boundaryTimeoutRef.current !== null) {
        window.clearTimeout(boundaryTimeoutRef.current);
        boundaryTimeoutRef.current = null;
      }
    }

    function syncAutoTheme() {
      if (getStoredTheme()) return;
      const next = getThemeByLocalTime();
      setThemeState(next);
      applyTheme(next);
    }

    function scheduleBoundarySync() {
      clearBoundaryTimeout();
      if (getStoredTheme()) return;
      boundaryTimeoutRef.current = window.setTimeout(() => {
        syncAutoTheme();
        scheduleBoundarySync();
      }, msUntilNextThemeBoundary());
    }

    const initial = getPreferredTheme();
    // getPreferredTheme reads localStorage / matchMedia, which are only
    // available after mount; setting it here avoids a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(initial);
    applyTheme(initial);
    scheduleBoundarySync();

    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      syncAutoTheme();
      scheduleBoundarySync();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearBoundaryTimeout();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    applyTheme(next);
    setStoredTheme(next);
    if (boundaryTimeoutRef.current !== null) {
      window.clearTimeout(boundaryTimeoutRef.current);
      boundaryTimeoutRef.current = null;
    }
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
