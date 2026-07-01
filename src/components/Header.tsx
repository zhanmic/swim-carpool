"use client";

interface HeaderProps {
  teamName: string;
  familyName: string | null;
  onSwitchFamily: () => void;
}

export function Header({ teamName, familyName, onSwitchFamily }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur safe-top">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-slate-900">{teamName}</h1>
          <button
            type="button"
            onClick={onSwitchFamily}
            className="touch-target-sm text-sm text-sky-600 font-medium"
          >
            Acting as: {familyName ?? "Select family"} ›
          </button>
        </div>
      </div>
    </header>
  );
}
