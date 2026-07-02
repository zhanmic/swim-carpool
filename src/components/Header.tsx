"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  teamName: string;
  familyName: string | null;
  onSwitchFamily: () => void;
  onManageTeam?: () => void;
}

export function Header({ teamName, familyName, onSwitchFamily, onManageTeam }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur pt-[max(0.25rem,var(--safe-top))] dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            href="/"
            className="min-w-0 truncate text-base font-semibold text-slate-900 active:text-sky-700 dark:text-slate-100 dark:active:text-sky-400"
          >
            {teamName}
          </Link>
          {onManageTeam && (
            <button
              type="button"
              onClick={onManageTeam}
              className="w-fit text-[11px] font-normal text-slate-500 active:text-sky-600 dark:text-slate-400 dark:active:text-sky-400"
            >
              Rename/remove
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <button
            type="button"
            onClick={onSwitchFamily}
            className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 active:bg-sky-100 dark:bg-sky-950 dark:text-sky-300 dark:active:bg-sky-900"
          >
            {familyName ?? "Pick family"} ›
          </button>
        </div>
      </div>
    </header>
  );
}
