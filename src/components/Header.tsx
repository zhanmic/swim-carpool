"use client";

import Link from "next/link";

interface HeaderProps {
  teamName: string;
  familyName: string | null;
  onSwitchFamily: () => void;
  onRenameTeam?: () => void;
}

export function Header({ teamName, familyName, onSwitchFamily, onRenameTeam }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur pt-[max(0.25rem,var(--safe-top))]">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href="/"
            className="min-w-0 truncate text-sm font-semibold text-slate-900 active:text-sky-700"
          >
            {teamName}
          </Link>
          {onRenameTeam && (
            <button
              type="button"
              onClick={onRenameTeam}
              className="shrink-0 text-xs font-medium text-sky-600"
            >
              Rename
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onSwitchFamily}
          className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 active:bg-sky-100"
        >
          {familyName ?? "Pick family"} ›
        </button>
      </div>
    </header>
  );
}
