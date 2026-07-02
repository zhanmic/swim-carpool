"use client";

interface HeaderProps {
  teamName: string;
  familyName: string | null;
  onSwitchFamily: () => void;
}

export function Header({ teamName, familyName, onSwitchFamily }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur pt-[max(0.25rem,var(--safe-top))]">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-1.5">
        <h1 className="min-w-0 truncate text-sm font-semibold text-slate-900">{teamName}</h1>
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
