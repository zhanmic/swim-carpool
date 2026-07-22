import { addDays, formatDateOnly, parseDateOnly } from "./dates";

/** Offsets from Sunday week start: Sunday = 0 … Saturday = 6 */
export const DEFAULT_VISIBLE_DAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function dateToDayOfWeek(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Convert stored offsets from old Monday-start weeks to Sunday-start offsets. */
export function migrateVisibleDaysFromMondayStart(days: number[]): number[] {
  return [...new Set(days.map((day) => (day === 6 ? 0 : day + 1)))].sort((a, b) => a - b);
}

export function parseVisibleDays(value: unknown): number[] {
  if (value == null) return [...DEFAULT_VISIBLE_DAYS];
  let raw: unknown;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      return [...DEFAULT_VISIBLE_DAYS];
    }
  } else {
    raw = value;
  }
  if (!Array.isArray(raw)) return [...DEFAULT_VISIBLE_DAYS];
  return normalizeVisibleDays(raw);
}

export function normalizeVisibleDays(days: unknown[]): number[] {
  const nums = [
    ...new Set(
      days.filter((d): d is number => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6)
    ),
  ].sort((a, b) => a - b);
  if (nums.length === 0) return [...DEFAULT_VISIBLE_DAYS];
  return nums;
}

export function getVisibleWeekDates(weekStart: Date, visibleDays: number[]): Date[] {
  return [...visibleDays].sort((a, b) => a - b).map((offset) => addDays(weekStart, offset));
}

export function getWeekEndForVisibleDays(weekStart: Date, visibleDays: number[]): Date {
  const maxOffset = Math.max(...visibleDays);
  return addDays(weekStart, maxOffset);
}

export function visibleSessionDates(weekStartStr: string, visibleDays: number[]): string[] {
  return getVisibleWeekDates(parseDateOnly(weekStartStr), visibleDays).map(formatDateOnly);
}

export function visibleDaysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((day, i) => day === b[i]);
}
