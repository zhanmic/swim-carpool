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
      <div className="mx-auto max-w-lg px-3 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            aria-label="All teams"
            className="touch-target-sm shrink-0 flex items-center justify-center text-slate-600 active:text-slate-900 dark:text-slate-400 dark:active:text-slate-100"
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
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <div className="flex min-w-0 items-center justify-center gap-1">
              {onManageTeam ? (
                <button
                  type="button"
                  onClick={onManageTeam}
                  className="min-w-0 truncate text-base font-semibold text-sky-700 underline decoration-sky-400/70 underline-offset-2 active:text-sky-900 dark:text-sky-400 dark:decoration-sky-500/70 dark:active:text-sky-300"
                >
                  {teamName}
                </button>
              ) : (
                <span className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                  {teamName}
                </span>
              )}
              <ShareTeamButton slug={teamSlug} teamName={teamName} variant="icon" />
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
            </div>
            {scheduleUrl && (
              <a
                href={scheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[11px] font-normal text-sky-600 active:text-sky-800 dark:text-sky-400 dark:active:text-sky-300"
              >
                Official schedule →
              </a>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
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
      </div>
    </header>
  );
}
