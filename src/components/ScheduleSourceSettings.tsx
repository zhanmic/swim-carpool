"use client";

import type { NameField, PracticeNameFormat, ScheduleIntegration } from "@/lib/types";
import { useMemo, useState } from "react";

const DEFAULT_TIMEZONE = "America/New_York";
const DEFAULT_FIELDS: NameField[] = ["group", "location", "time"];

interface ScheduleSourceSettingsProps {
  teamName: string;
  slug: string;
  integration: ScheduleIntegration | null;
  onSaved: (integration: ScheduleIntegration | null) => void;
}

function fieldsToText(fields: NameField[]): string {
  return (fields.length ? fields : DEFAULT_FIELDS).join(", ");
}

function textToFields(text: string): NameField[] {
  const valid: NameField[] = ["group", "location", "time", "ignore"];
  const parsed = text
    .split(",")
    .map((f) => f.trim().toLowerCase())
    .filter((f): f is NameField => (valid as string[]).includes(f));
  return parsed.length ? parsed : DEFAULT_FIELDS;
}

interface JsonResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * Fetch JSON with a hard timeout and tolerant parsing. A request can otherwise
 * hang forever (leaving the button stuck on "Loading…") or throw on a non-JSON
 * body — e.g. a protected preview URL that redirects to an HTML SSO page.
 */
async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 20000
): Promise<JsonResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let data: T | null = null;
    try {
      data = text ? (JSON.parse(text) as T) : null;
    } catch {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `Unexpected response (HTTP ${res.status}). If you opened a preview link, use the live site instead.`,
      };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return {
      ok: false,
      status: 0,
      data: null,
      error: aborted
        ? "Timed out reaching Commit. Please try again."
        : "Network error. Check your connection and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function ScheduleSourceSettings({
  teamName,
  slug,
  integration,
  onSaved,
}: ScheduleSourceSettingsProps) {
  const [superTeamId, setSuperTeamId] = useState(integration?.superTeamId ?? "");
  const [timezone, setTimezone] = useState(integration?.timezone ?? DEFAULT_TIMEZONE);
  const [group, setGroup] = useState<string | null>(integration?.group ?? null);
  const [includeMeets, setIncludeMeets] = useState(integration?.includeMeets ?? false);
  const [mode, setMode] = useState<PracticeNameFormat["mode"]>(
    integration?.nameFormat.mode ?? "fields"
  );
  const [separator, setSeparator] = useState(integration?.nameFormat.separator ?? "-");
  const [fieldsText, setFieldsText] = useState(
    fieldsToText(integration?.nameFormat.fields ?? DEFAULT_FIELDS)
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [groups, setGroups] = useState<string[]>(
    integration?.group ? [integration.group] : []
  );
  const [commitTeamName, setCommitTeamName] = useState<string | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const nameFormat: PracticeNameFormat = useMemo(
    () => ({ mode, separator, fields: textToFields(fieldsText) }),
    [mode, separator, fieldsText]
  );

  function buildIntegration(): ScheduleIntegration | null {
    const id = superTeamId.trim();
    if (!id) return null;
    return {
      provider: "commit",
      superTeamId: id,
      timezone: timezone.trim() || DEFAULT_TIMEZONE,
      group: group?.trim() || null,
      nameFormat,
      includeMeets,
    };
  }

  async function loadGroups() {
    const id = superTeamId.trim();
    if (!id) {
      setError("Enter a Super Team ID first");
      return;
    }
    setLoadingGroups(true);
    setError(null);
    setStatus(null);
    try {
      const params = new URLSearchParams({
        superTeamId: id,
        timezone: timezone.trim() || DEFAULT_TIMEZONE,
        mode,
        separator,
        fields: textToFields(fieldsText).join(","),
        includeMeets: includeMeets ? "true" : "false",
      });
      const { ok, data, error: fetchError } = await fetchJson<{
        groups?: string[];
        teamName?: string | null;
        timezone?: string | null;
        error?: string;
      }>(`/api/teams/${slug}/commit/groups?${params.toString()}`);
      if (!ok || !data) {
        setError(fetchError ?? data?.error ?? "Could not load groups. Check the Super Team ID.");
        return;
      }
      const loaded = data.groups ?? [];
      setGroups(loaded);
      setCommitTeamName(data.teamName ?? null);
      if (data.timezone && !integration) setTimezone(data.timezone);
      if (loaded.length === 0) {
        setStatus("Connected, but no groups were detected for the next few weeks.");
      }
    } finally {
      setLoadingGroups(false);
    }
  }

  async function persist(next: ScheduleIntegration | null) {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const { ok, data, error: fetchError } = await fetchJson<{
        team?: { schedule_integration?: ScheduleIntegration | null };
        error?: string;
      }>(`/api/teams/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, schedule_integration: next }),
      });
      if (!ok || !data) {
        setError(fetchError ?? data?.error ?? "Could not save");
        return;
      }
      const saved = data.team?.schedule_integration ?? null;
      onSaved(saved);
      setStatus(next ? "Schedule source saved." : "Schedule source disconnected.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Commit Swimming
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Fill the weekly schedule from your club&apos;s Commit calendar. Set the Super Team ID,
          load groups, then pick the group this carpool follows.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Super Team ID</span>
        <input
          type="text"
          value={superTeamId}
          onChange={(e) => setSuperTeamId(e.target.value)}
          placeholder="e.g. g8g7f3rkF8N23vXs4"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Timezone</span>
        <input
          type="text"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder={DEFAULT_TIMEZONE}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        onClick={() => void loadGroups()}
        disabled={loadingGroups || !superTeamId.trim()}
        className="touch-target-compact w-full rounded-lg border border-sky-300 bg-sky-50 px-3 text-sm font-semibold text-sky-700 disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300"
      >
        {loadingGroups ? "Loading…" : "Load groups"}
      </button>

      {commitTeamName && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Connected to <span className="font-medium">{commitTeamName}</span>.
        </p>
      )}

      {groups.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Group to import</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGroup(null)}
              className={`touch-target-compact rounded-full px-3 text-xs font-semibold ${
                group === null
                  ? "bg-sky-500 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              All practices
            </button>
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={`touch-target-compact rounded-full px-3 text-xs font-semibold ${
                  group === g
                    ? "bg-sky-500 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Include meets</span>
        <input
          type="checkbox"
          checked={includeMeets}
          onChange={(e) => setIncludeMeets(e.target.checked)}
          className="h-4 w-4"
        />
      </label>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-xs font-medium text-sky-600 dark:text-sky-400"
      >
        {showAdvanced ? "Hide" : "Show"} advanced parsing
      </button>

      {showAdvanced && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
          <label className="block">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Parse mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PracticeNameFormat["mode"])}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="fields">Fields (split by separator)</option>
              <option value="keywords">Keywords (scan whole title)</option>
            </select>
          </label>
          {mode === "fields" && (
            <>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Separator</span>
                <input
                  type="text"
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Field order
                </span>
                <input
                  type="text"
                  value={fieldsText}
                  onChange={(e) => setFieldsText(e.target.value)}
                  placeholder="group, location, time"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Comma-separated: group, location, time, ignore
                </span>
              </label>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status && <p className="text-sm text-emerald-600 dark:text-emerald-400">{status}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => void persist(buildIntegration())}
          disabled={saving || !superTeamId.trim()}
          className="touch-target flex-1 rounded-lg bg-sky-500 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save schedule source"}
        </button>
        {integration && (
          <button
            type="button"
            onClick={() => void persist(null)}
            disabled={saving}
            className="touch-target rounded-lg border border-red-300 px-3 text-sm font-semibold text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
          >
            Disconnect
          </button>
        )}
      </div>
    </section>
  );
}
