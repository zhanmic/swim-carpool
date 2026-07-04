"use client";

import { getFamilyColor, type FamilyColorClasses } from "@/lib/familyColors";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  teamName: string;
  scheduleUrl?: string | null;
  familyName: string | null;
  familyId?: string | null;
  familyColors?: Map<string, FamilyColorClasses>;
  onSwitchFamily: () => void;
  onManageTeam?: () => void;
}

export function Header({
  teamName,
  scheduleUrl,
  familyName,
  familyId,
  familyColors,
  onSwitchFamily,
  onManageTeam,
}: HeaderProps) {
  const familyColor = getFamilyColor(familyColors ?? new Map(), familyId);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur pt-[max(0.25rem,var(--safe-top))] dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {onManageTeam ? (
            <button
              type="button"
              onClick={onManageTeam}
              className="group flex min-w-0 w-fit max-w-full items-center gap-1 truncate text-left text-base font-semibold text-sky-700 underline decoration-sky-400/70 underline-offset-2 active:text-sky-900 dark:text-sky-400 dark:decoration-sky-500/70 dark:active:text-sky-300"
            >
              <span className="truncate">{teamName}</span>
            </button>
          ) : (
            <span className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{teamName}</span>
          )}
          <Link
            href="/"
            className="w-fit text-[11px] font-normal text-slate-500 active:text-sky-600 dark:text-slate-400 dark:active:text-sky-400"
          >
            ‹ All teams
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {scheduleUrl && (
            <a
              href={scheduleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap text-xs font-medium text-sky-600 active:text-sky-800 dark:text-sky-400 dark:active:text-sky-300"
            >
              Team Schedule
            </a>
          )}
          <ThemeToggle />
          <button
            type="button"
            onClick={onSwitchFamily}
            className={`rounded-full px-2.5 py-1 text-xs font-medium active:opacity-80 ${
              familyColor?.pill ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {familyName ?? "Select family"} ›
          </button>
        </div>
      </div>
    </header>
  );
}
