const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday of the week containing `date` (local time). */
export function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Practice runs Monday–Saturday (no Sunday). */
export const PRACTICE_DAYS_PER_WEEK = 6;

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: PRACTICE_DAYS_PER_WEEK }, (_, i) => addDays(weekStart, i));
}

export function getWeekEnd(weekStart: Date): Date {
  return addDays(weekStart, PRACTICE_DAYS_PER_WEEK - 1);
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export const TIME_STEP_MINUTES = 5;
export const TIME_STEP_SECONDS = TIME_STEP_MINUTES * 60;

/** Snap HH:MM to the nearest increment (default 5 minutes). */
export function snapTimeToStep(time: string, stepMinutes = TIME_STEP_MINUTES): string {
  const [hStr, mStr] = time.split(":");
  const totalMinutes = Number(hStr) * 60 + Number(mStr?.slice(0, 2) ?? 0);
  const snapped = Math.round(totalMinutes / stepMinutes) * stepMinutes;
  const hours = Math.floor(snapped / 60) % 24;
  const minutes = snapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTime12(time: string): string {
  const [hStr, mStr] = time.split(":");
  let h = Number(hStr);
  const m = mStr?.slice(0, 2) ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatTimeCompact(time: string): { label: string; period: "AM" | "PM" } {
  const [hStr, mStr] = time.split(":");
  let h = Number(hStr);
  const m = Number(mStr?.slice(0, 2) ?? "0");
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const label = m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;
  return { label, period };
}

export function formatTimeRangeCompact(start: string, end: string): string {
  const s = formatTimeCompact(start);
  const e = formatTimeCompact(end);
  if (s.period === e.period) {
    return `${s.label}–${e.label} ${s.period}`;
  }
  return `${s.label} ${s.period}–${e.label} ${e.period}`;
}

export function isToday(dateStr: string): boolean {
  return formatDateOnly(new Date()) === dateStr;
}

export function defaultWeekStartStr(): string {
  return formatDateOnly(getMonday(new Date()));
}

/** Monday of the week containing `date` (local time). */
export function weekStartForDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDateOnly(getMonday(d));
}
