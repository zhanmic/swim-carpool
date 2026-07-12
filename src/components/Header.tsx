"use client";

import { getFamilyColor, type FamilyColorClasses } from "@/lib/familyColors";
import Link from "next/link";
import { ShareTeamButton } from "./ShareTeamButton";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  teamName: string;
  teamSlug: string;
  scheduleUrl?: string | null;
  familyName: string | null;
  familyId?: string | null;
  familyColors?: Map<string, FamilyColorClasses>;
  weekStart?: string;
  onSwitchFamily: () => void;
  onManageTeam?: () => void;
}

export function Header({
  teamName,
  teamSlug,
  scheduleUrl,
  familyName,
  familyId,
  familyColors,
  weekStart,
  onSwitchFamily,
  onManageTeam,
}: HeaderProps) {
  const familyColor = getFamilyColor(familyColors ?? new Map(), familyId);

  function handlePrint() {
    const printUrl = `/c/${teamSlug}/print${weekStart ? `?start=${weekStart}` : ""}`;
    window.open(printUrl, "_blank");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur pt-[max(0.25rem,var(--safe-top))] dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {onManageTeam ? (
              <button
                type="button"
                onClick={onManageTeam}
                className="group flex min-w-0 max-w-full items-center gap-1 truncate text-left text-base font-semibold text-sky-700 underline decoration-sky-400/70 underline-offset-2 active:text-sky-900 dark:text-sky-400 dark:decoration-sky-500/70 dark:active:text-sky-300"
              >
                <span className="truncate">{teamName}</span>
              </button>
            ) : (
              <span className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{teamName}</span>
            )}
            <ShareTeamButton slug={teamSlug} teamName={teamName} variant="icon" />
          </div>
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
              Schedule
            </a>
          )}
          <button
            type="button"
            onClick={handlePrint}
            aria-label="Print schedule"
            title="Print schedule"
            className="touch-target-sm flex items-center justify-center text-slate-600 active:text-slate-900 dark:text-slate-400 dark:active:text-slate-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>
          </button>
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
