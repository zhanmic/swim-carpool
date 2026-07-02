"use client";

import type { Family } from "@/lib/types";

interface FamilyPickerProps {
  families: Family[];
  onSelect: (familyId: string) => void;
  title?: string;
}

export function FamilyPicker({ families, onSelect, title = "Who are you?" }: FamilyPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4 safe-bottom">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 mb-1 dark:text-slate-100">{title}</h2>
        <p className="text-sm text-slate-500 mb-4 dark:text-slate-400">Pick your family. Saved on this phone only.</p>
        <ul className="flex flex-col gap-2">
          {families.map((family) => (
            <li key={family.id}>
              <button
                type="button"
                onClick={() => onSelect(family.id)}
                className="touch-target w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-lg font-medium text-slate-900 active:bg-sky-50 active:border-sky-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:active:bg-sky-950 dark:active:border-sky-600"
              >
                {family.name}
                {family.home_label ? (
                  <span className="block text-sm font-normal text-slate-500 dark:text-slate-400">{family.home_label}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
