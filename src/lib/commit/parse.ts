import type { NameField, PracticeNameFormat } from "@/lib/types";

export interface ParsedPracticeName {
  group: string | null;
  location: string | null;
}

/** Split a title on the configured separator and drop empty segments. */
export function splitNameParts(name: string, separator: string): string[] {
  const sep = separator || "-";
  const escaped = sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return name
    .split(new RegExp(`\\s*${escaped}\\s*`))
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Canonicalize a swim training-group label from free text. Returns a stable
 * label ("Sr", "Jr", "Jr Prep", "DEVO", "Sr/Jr") when a common pattern matches,
 * otherwise null so callers can fall back to the raw segment text.
 */
export function canonicalGroupLabel(text: string): string | null {
  const lower = text.trim().toLowerCase();
  if (!lower) return null;

  if (
    /\bjr\s*prep\b/.test(lower) ||
    /\bjrprep\b/.test(lower) ||
    /\bjunior\s*prep\b/.test(lower)
  ) {
    return "Jr Prep";
  }

  if (/\bdevo\b/.test(lower) || /\bdevelopmental\b/.test(lower)) {
    return "DEVO";
  }

  const hasSr = /\bsr\b/.test(lower) || /\bsenior\b/.test(lower);
  const hasJr = /\bjr\b/.test(lower) || /\bjunior\b/.test(lower);

  if (hasSr && hasJr) return "Sr/Jr";
  if (hasSr) return "Sr";
  if (hasJr) return "Jr";

  return null;
}

/**
 * Merge accidental group splits created by the separator:
 * "Jr- Prep- BCMS" -> group "Jr Prep", rest ["BCMS"]
 * "Sr-Jr- Academy" -> group "Sr/Jr", rest ["Academy"]
 */
function coalesceGroupParts(parts: string[]): { groupText: string; rest: string[] } {
  if (parts.length === 0) return { groupText: "", rest: [] };

  let groupText = parts[0];
  let index = 1;

  const first = parts[0].toLowerCase();
  const second = parts[1]?.toLowerCase() ?? "";

  if (index < parts.length && /^(jr|junior)$/.test(first) && /^prep\b/.test(second)) {
    groupText = `${parts[0]} ${parts[1]}`;
    index = 2;
  } else if (
    index < parts.length &&
    /^(sr|senior)$/.test(first) &&
    /^(jr|junior)$/.test(second)
  ) {
    groupText = `${parts[0]}/${parts[1]}`;
    index = 2;
  }

  return { groupText, rest: parts.slice(index) };
}

function cleanLocationText(raw: string): string {
  // Drop trailing clock fragments that leaked into the location segment.
  return raw
    .replace(/\b\d{1,2}([:.]\d{2})?\s*(am|pm)\b.*$/i, "")
    .replace(/\b\d{1,2}([:.]\d{2})\b.*$/i, "")
    .trim();
}

/** Map ordered segments to their configured field meanings. */
function mapPartsToFields(
  parts: string[],
  fields: NameField[]
): Partial<Record<"group" | "location", string>> {
  const mapped: Partial<Record<"group" | "location", string>> = {};
  let partIndex = 0;

  for (const field of fields) {
    if (partIndex >= parts.length) break;
    const value = parts[partIndex];
    partIndex += 1;
    if (field === "time" || field === "ignore") continue;
    mapped[field] = value;
  }

  return mapped;
}

/** Keyword scan of the full title (no separator assumptions). */
function parseKeywords(name: string): ParsedPracticeName {
  return { group: canonicalGroupLabel(name), location: null };
}

/**
 * Field parser: split on the separator, then assign segments to the configured
 * roles (group / location / time). Group text is canonicalized when it matches
 * a common swim pattern, otherwise the raw segment text is used verbatim.
 */
function parseFields(name: string, format: PracticeNameFormat): ParsedPracticeName {
  const parts = splitNameParts(name, format.separator);
  if (parts.length === 0) return { group: null, location: null };

  const fields = format.fields.length
    ? format.fields
    : (["group", "location", "time"] as NameField[]);

  let workingParts = parts;
  if (fields[0] === "group") {
    const coalesced = coalesceGroupParts(parts);
    workingParts = [coalesced.groupText, ...coalesced.rest].filter(Boolean);
  }

  const mapped = mapPartsToFields(workingParts, fields);
  const groupText = (mapped.group ?? workingParts[0] ?? "").trim();
  const locationRaw = mapped.location ? cleanLocationText(mapped.location) : "";

  return {
    group: groupText ? canonicalGroupLabel(groupText) ?? groupText : null,
    location: locationRaw || null,
  };
}

export function parsePracticeName(
  name: string,
  format: PracticeNameFormat
): ParsedPracticeName {
  if (format.mode === "keywords") return parseKeywords(name);
  return parseFields(name, format);
}

/**
 * Whether an occurrence's parsed group matches the selected group. A null
 * selection matches everything; the shared "Sr/Jr" group matches when either
 * "Sr" or "Jr" is selected.
 */
export function groupMatches(occurrenceGroup: string | null, selected: string | null): boolean {
  if (!selected) return true;
  if (!occurrenceGroup) return false;
  if (occurrenceGroup === selected) return true;
  if (occurrenceGroup === "Sr/Jr" && (selected === "Sr" || selected === "Jr")) {
    return true;
  }
  return false;
}
