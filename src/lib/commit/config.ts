import type {
  NameField,
  PracticeNameFormat,
  PracticeParseMode,
  ScheduleIntegration,
} from "@/lib/types";

export const COMMIT_API_BASE = "https://utility.commitswimming.com";

export const DEFAULT_TIMEZONE = "America/New_York";

export const DEFAULT_PRACTICE_NAME_FORMAT: PracticeNameFormat = {
  mode: "fields",
  separator: "-",
  fields: ["group", "location", "time"],
};

function isParseMode(value: unknown): value is PracticeParseMode {
  return value === "fields" || value === "keywords";
}

function isNameField(value: unknown): value is NameField {
  return (
    value === "group" ||
    value === "location" ||
    value === "time" ||
    value === "ignore"
  );
}

export function normalizePracticeNameFormat(value: unknown): PracticeNameFormat {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PRACTICE_NAME_FORMAT };
  }
  const raw = value as Partial<PracticeNameFormat>;
  const fields = Array.isArray(raw.fields)
    ? raw.fields.filter(isNameField)
    : DEFAULT_PRACTICE_NAME_FORMAT.fields;
  return {
    mode: isParseMode(raw.mode) ? raw.mode : DEFAULT_PRACTICE_NAME_FORMAT.mode,
    separator:
      typeof raw.separator === "string" && raw.separator.length > 0
        ? raw.separator
        : DEFAULT_PRACTICE_NAME_FORMAT.separator,
    fields: fields.length ? fields : [...DEFAULT_PRACTICE_NAME_FORMAT.fields],
  };
}

/**
 * Parse/validate a raw JSON value (from the DB or an API request) into a
 * ScheduleIntegration, or null when it is missing/invalid. A blank superTeamId
 * is treated as "not configured".
 */
export function parseScheduleIntegration(value: unknown): ScheduleIntegration | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ScheduleIntegration> & Record<string, unknown>;

  const superTeamId =
    typeof raw.superTeamId === "string" ? raw.superTeamId.trim() : "";
  if (!superTeamId) return null;

  const timezone =
    typeof raw.timezone === "string" && raw.timezone.trim()
      ? raw.timezone.trim()
      : DEFAULT_TIMEZONE;

  const group =
    typeof raw.group === "string" && raw.group.trim() ? raw.group.trim() : null;

  return {
    provider: "commit",
    superTeamId,
    timezone,
    group,
    nameFormat: normalizePracticeNameFormat(raw.nameFormat),
    includeMeets: raw.includeMeets === true,
  };
}
