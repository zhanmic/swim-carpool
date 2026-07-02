"use client";

import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`touch-target-sm rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-sm font-medium text-slate-700 backdrop-blur active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200 dark:active:bg-slate-700 ${className}`}
    >
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
