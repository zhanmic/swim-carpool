import type { Family } from "./types";

export interface FamilyColorClasses {
  text: string;
  pill: string;
  button: string;
  swatch: string;
}

const PALETTE: FamilyColorClasses[] = [
  {
    text: "text-sky-700 dark:text-sky-300",
    pill: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    button:
      "bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-700",
    swatch: "bg-sky-500",
  },
  {
    text: "text-violet-700 dark:text-violet-300",
    pill: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    button:
      "bg-violet-100 text-violet-800 border border-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-700",
    swatch: "bg-violet-500",
  },
  {
    text: "text-rose-700 dark:text-rose-300",
    pill: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    button:
      "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-700",
    swatch: "bg-rose-500",
  },
  {
    text: "text-teal-700 dark:text-teal-300",
    pill: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
    button:
      "bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-700",
    swatch: "bg-teal-500",
  },
  {
    text: "text-orange-700 dark:text-orange-300",
    pill: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
    button:
      "bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-700",
    swatch: "bg-orange-500",
  },
  {
    text: "text-indigo-700 dark:text-indigo-300",
    pill: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
    button:
      "bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-700",
    swatch: "bg-indigo-500",
  },
  {
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    pill: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300",
    button:
      "bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-700",
    swatch: "bg-fuchsia-500",
  },
  {
    text: "text-lime-700 dark:text-lime-300",
    pill: "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300",
    button:
      "bg-lime-100 text-lime-800 border border-lime-300 dark:bg-lime-950 dark:text-lime-300 dark:border-lime-700",
    swatch: "bg-lime-500",
  },
];

export const OPEN_SLOT_TEXT = "font-medium text-amber-700 dark:text-amber-400";
export const OPEN_SLOT_PILL = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
export const OPEN_SLOT_BUTTON =
  "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700";

export function buildFamilyColorMap(families: Family[]): Map<string, FamilyColorClasses> {
  const sorted = [...families].sort((a, b) => a.name.localeCompare(b.name));
  return new Map(sorted.map((family, index) => [family.id, PALETTE[index % PALETTE.length]]));
}

export function getFamilyColor(
  familyColors: Map<string, FamilyColorClasses>,
  familyId?: string | null
): FamilyColorClasses | undefined {
  if (!familyId) return undefined;
  return familyColors.get(familyId);
}
