"use client";

import type { Family, ScheduleIntegration, Team } from "@/lib/types";
import {
  DEFAULT_VISIBLE_DAYS,
  normalizeVisibleDays,
  visibleDaysEqual,
  WEEKDAY_LABELS,
} from "@/lib/visibleDays";
import { getTeamUrl } from "@/lib/shareTeam";
import {
  clearActiveFamilyId,
  isAdminUnlocked,
  removeKnownTeam,
  setAdminSession,
} from "@/lib/storage";
import { ScheduleSourceSettings } from "@/components/ScheduleSourceSettings";
import { ShareTeamButton } from "@/components/ShareTeamButton";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type TeamPatch = Partial<
  Pick<Team, "name" | "schedule_url" | "visible_days" | "has_delete_password" | "schedule_integration">
>;

type SettingsTab = "team" | "schedule";

interface RenameTeamSheetProps {
  teamName: string;
  scheduleUrl?: string | null;
  visibleDays?: number[];
  hasDeletePassword?: boolean;
  scheduleIntegration?: ScheduleIntegration | null;
  families: Family[];
  slug: string;
  /** When true, Schedule source requires admin unlock (ADMIN_PASSWORD is set). */
  adminEnabled?: boolean;
  initialTab?: SettingsTab;
  onClose: () => void;
  onUpdated: (team: TeamPatch) => void;
  onFamiliesUpdated: (families: Family[]) => void;
}

export function RenameTeamSheet({
  teamName,
  scheduleUrl,
  visibleDays: initialVisibleDays = [...DEFAULT_VISIBLE_DAYS],
  hasDeletePassword: initialHasDeletePassword = false,
  scheduleIntegration = null,
  families: initialFamilies,
  slug,
  adminEnabled = false,
  initialTab = "team",
  onClose,
  onUpdated,
  onFamiliesUpdated,
}: RenameTeamSheetProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [adminUnlocked, setAdminUnlocked] = useState(
    () => !adminEnabled || isAdminUnlocked()
  );
  const [adminPassword, setAdminPassword] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [integration, setIntegration] = useState<ScheduleIntegration | null>(scheduleIntegration);
  const [name, setName] = useState(teamName);
  const [scheduleLink, setScheduleLink] = useState(scheduleUrl ?? "");
  const [visibleDays, setVisibleDays] = useState<number[]>(initialVisibleDays);
  const [hasDeletePassword, setHasDeletePassword] = useState(initialHasDeletePassword);
  const [currentDeletePassword, setCurrentDeletePassword] = useState("");
  const [newDeletePassword, setNewDeletePassword] = useState("");
  const [deletePwdBusy, setDeletePwdBusy] = useState(false);
  const [deletePwdError, setDeletePwdError] = useState<string | null>(null);
  const [deletePwdStatus, setDeletePwdStatus] = useState<string | null>(null);
  const [families, setFamilies] = useState(initialFamilies);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [familyBusyId, setFamilyBusyId] = useState<string | null>(null);
  const [addFamilyBusy, setAddFamilyBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [teamUrl, setTeamUrl] = useState("");

  useEffect(() => {
    setTeamUrl(getTeamUrl(slug));
  }, [slug]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setFamilies(initialFamilies);
  }, [initialFamilies]);

  useEffect(() => {
    setName(teamName);
    setScheduleLink(scheduleUrl ?? "");
    setVisibleDays(initialVisibleDays);
    setHasDeletePassword(initialHasDeletePassword);
  }, [teamName, scheduleUrl, initialVisibleDays, initialHasDeletePassword]);

  const teamDirty =
    name.trim() !== teamName.trim() ||
    (scheduleLink.trim() || null) !== (scheduleUrl?.trim() || null) ||
    !visibleDaysEqual(visibleDays, initialVisibleDays);

  const familiesDirty = families.some((family) => {
    const original = initialFamilies.find((item) => item.id === family.id);
    return !!original && original.name !== family.name.trim();
  });

  const isDirty = teamDirty || familiesDirty;

  function toggleVisibleDay(day: number) {
    setVisibleDays((current) => {
      if (current.includes(day)) {
        const next = current.filter((d) => d !== day);
        return next.length > 0 ? next : current;
      }
      return normalizeVisibleDays([...current, day]);
    });
  }

  async function handleSave() {
    if (!name.trim() || !isDirty) return;
    setBusy(true);
    setError(null);
    setFamilyError(null);
    try {
      if (teamDirty) {
        const res = await fetch(`/api/teams/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            schedule_url: scheduleLink.trim() || null,
            visible_days: visibleDays,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not save team");
          return;
        }
        onUpdated({
          name: data.team.name,
          schedule_url: data.team.schedule_url ?? null,
          visible_days: data.team.visible_days ?? visibleDays,
          has_delete_password: data.team.has_delete_password ?? hasDeletePassword,
        });
      }

      let latestFamilies = families;
      for (const family of families) {
        const original = initialFamilies.find((item) => item.id === family.id);
        const trimmed = family.name.trim();
        if (!original || original.name === trimmed) continue;
        if (!trimmed) {
          setFamilyError("Family name is required");
          setFamilies(initialFamilies);
          return;
        }

        const res = await fetch(`/api/teams/${slug}/families`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rename", id: family.id, name: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFamilyError(data.error ?? "Could not rename family");
          setFamilies(initialFamilies);
          return;
        }
        latestFamilies = data.families as Family[];
      }

      if (familiesDirty) {
        setFamilies(latestFamilies);
        onFamiliesUpdated(latestFamilies);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleAddFamily(e: FormEvent) {
    e.preventDefault();
    const trimmed = newFamilyName.trim();
    if (!trimmed) return;

    setAddFamilyBusy(true);
    setFamilyError(null);
    try {
      const res = await fetch(`/api/teams/${slug}/families`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFamilyError(data.error ?? "Could not add family");
        return;
      }
      setNewFamilyName("");
      setFamilies(data.families as Family[]);
      onFamiliesUpdated(data.families as Family[]);
    } finally {
      setAddFamilyBusy(false);
    }
  }

  async function handleRemoveFamily(family: Family) {
    if (
      !confirm(
        `Remove ${family.name}? Their driver slots and home pickup times will be cleared.`
      )
    ) {
      return;
    }

    setFamilyBusyId(family.id);
    setFamilyError(null);
    try {
      const res = await fetch(`/api/teams/${slug}/families`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: family.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFamilyError(data.error ?? "Could not remove family");
        return;
      }
      setFamilies(data.families as Family[]);
      onFamiliesUpdated(data.families as Family[]);
    } finally {
      setFamilyBusyId(null);
    }
  }

  async function handleDelete(e: FormEvent) {
    e.preventDefault();
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/teams/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Could not delete team");
        return;
      }
      removeKnownTeam(slug);
      clearActiveFamilyId(slug);
      router.push("/");
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleAdminUnlock(e: FormEvent) {
    e.preventDefault();
    setAdminBusy(true);
    setAdminError(null);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error ?? "Incorrect admin password");
        return;
      }
      setAdminSession(adminPassword);
      setAdminUnlocked(true);
      setAdminPassword("");
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Could not unlock admin");
    } finally {
      setAdminBusy(false);
    }
  }

  async function persistDeletePassword(nextPassword: string) {
    if (hasDeletePassword && !currentDeletePassword.trim()) {
      setDeletePwdError("Enter the current deletion password");
      return;
    }
    setDeletePwdBusy(true);
    setDeletePwdError(null);
    setDeletePwdStatus(null);
    try {
      const res = await fetch(`/api/teams/${slug}/delete-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delete_password: nextPassword,
          ...(hasDeletePassword
            ? { current_password: currentDeletePassword.trim() }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeletePwdError(data.error ?? "Could not save deletion password");
        return;
      }
      const nextHas = !!data.team?.has_delete_password;
      setHasDeletePassword(nextHas);
      setCurrentDeletePassword("");
      setNewDeletePassword("");
      setDeletePwdStatus(nextHas ? "Deletion password saved." : "Deletion password cleared.");
      onUpdated({ has_delete_password: nextHas });
    } finally {
      setDeletePwdBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="h-[90vh] overflow-y-auto rounded-t-2xl bg-white safe-bottom dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold dark:text-slate-100">Team settings</h2>
          <div className="flex shrink-0 items-center gap-1">
            {activeTab === "team" && (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={busy || !name.trim() || !isDirty}
                className="touch-target-sm rounded-lg px-3 text-sm font-semibold text-sky-600 disabled:opacity-35 dark:text-sky-400"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="touch-target-sm rounded-full text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="sticky top-[57px] z-10 flex gap-1 border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
          {(["team", "schedule"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`touch-target-compact -mb-px border-b-2 px-3 text-sm font-semibold ${
                activeTab === tab
                  ? "border-sky-500 text-sky-600 dark:text-sky-400"
                  : "border-transparent text-slate-500 dark:text-slate-400"
              }`}
            >
              {tab === "team" ? "Team" : "Schedule source"}
            </button>
          ))}
        </div>

        {activeTab === "schedule" ? (
          <div className="max-w-lg mx-auto p-4">
            {adminEnabled && !adminUnlocked ? (
              <form onSubmit={handleAdminUnlock} className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Admin required
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Enter the admin password to view and edit the schedule source (including team
                    IDs).
                  </p>
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Admin password
                  </span>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    autoComplete="current-password"
                  />
                </label>
                {adminError && <p className="text-sm text-red-600">{adminError}</p>}
                <button
                  type="submit"
                  disabled={adminBusy || !adminPassword}
                  className="touch-target w-full rounded-lg bg-sky-500 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {adminBusy ? "Checking…" : "Unlock"}
                </button>
              </form>
            ) : (
              <ScheduleSourceSettings
                teamName={teamName}
                slug={slug}
                integration={integration}
                adminEnabled={adminEnabled}
                onSaved={(next) => {
                  setIntegration(next);
                  onUpdated({ schedule_integration: next });
                }}
              />
            )}
          </div>
        ) : (
        <div className="max-w-lg mx-auto space-y-6 p-4">
          <section className="space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Team</p>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600"
              />
            </label>

            <div className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Schedule Link</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="url"
                  value={scheduleLink}
                  onChange={(e) => setScheduleLink(e.target.value)}
                  placeholder="https://…"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600"
                />
                {scheduleUrl && scheduleUrl.trim() && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(scheduleUrl);
                      } catch (err) {
                        console.error('Failed to copy:', err);
                      }
                    }}
                    className="shrink-0 touch-target-compact rounded-lg border border-slate-300 bg-white p-2 text-slate-700 active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:active:bg-slate-700"
                    title="Copy schedule link"
                    aria-label="Copy schedule link"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Optional. Shows as Schedule in the week view.
              </p>
            </div>

            <div className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Team link</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={teamUrl}
                  className="min-w-0 flex-1 truncate rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  onFocus={(e) => e.target.select()}
                />
                <ShareTeamButton
                  slug={slug}
                  teamName={name.trim() || teamName}
                  variant="icon"
                  className="shrink-0"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Share this link with your carpool group.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Week days shown</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose which days appear in the week view. Sunday is off by default.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map((label, day) => {
                const on = visibleDays.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleVisibleDay(day)}
                    className={`touch-target-compact min-w-[2.75rem] rounded-full px-2.5 text-xs font-semibold transition-colors ${
                      on
                        ? "bg-sky-500 text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Families</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Family renames save with Save. Add and remove save immediately.
            </p>
            <ul className="space-y-2">
              {families.map((family) => (
                <li key={family.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={family.name}
                    disabled={familyBusyId === family.id}
                    onChange={(e) => {
                      setFamilies((current) =>
                        current.map((item) =>
                          item.id === family.id ? { ...item, name: e.target.value } : item
                        )
                      );
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
                  />
                  <button
                    type="button"
                    disabled={families.length <= 1 || familyBusyId === family.id}
                    onClick={() => void handleRemoveFamily(family)}
                    className="shrink-0 text-xs font-medium text-red-600 disabled:opacity-40 dark:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={handleAddFamily} className="flex items-center gap-2">
              <input
                type="text"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                placeholder="New family name"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
              />
              <button
                type="submit"
                disabled={addFamilyBusy || !newFamilyName.trim()}
                className="touch-target-compact shrink-0 rounded-lg bg-slate-800 px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-700"
              >
                {addFamilyBusy ? "…" : "Add"}
              </button>
            </form>

            {familyError && <p className="text-sm text-red-600">{familyError}</p>}
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Remove team</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Set a deletion password, or permanently delete{" "}
                <span className="font-medium text-slate-600 dark:text-slate-300">{teamName}</span>.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Deletion password
              </p>
              {hasDeletePassword && (
                <label className="block">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Current password</span>
                  <input
                    type="password"
                    value={currentDeletePassword}
                    onChange={(e) => {
                      setCurrentDeletePassword(e.target.value);
                      setDeletePwdError(null);
                      setDeletePwdStatus(null);
                    }}
                    placeholder="Current deletion password"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    autoComplete="current-password"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {hasDeletePassword ? "New password" : "Password"}
                </span>
                <input
                  type="password"
                  value={newDeletePassword}
                  onChange={(e) => {
                    setNewDeletePassword(e.target.value);
                    setDeletePwdError(null);
                    setDeletePwdStatus(null);
                  }}
                  placeholder={
                    hasDeletePassword
                      ? "Enter new deletion password"
                      : "Optional — set a deletion password"
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                  autoComplete="new-password"
                />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hasDeletePassword
                  ? "Enter the current password to change or clear it."
                  : "Used with Delete team below (admin password also works)."}
              </p>
              {deletePwdError && <p className="text-sm text-red-600">{deletePwdError}</p>}
              {deletePwdStatus && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{deletePwdStatus}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void persistDeletePassword(newDeletePassword.trim())}
                  disabled={
                    deletePwdBusy ||
                    !newDeletePassword.trim() ||
                    (hasDeletePassword && !currentDeletePassword.trim())
                  }
                  className="touch-target-compact flex-1 rounded-lg bg-sky-500 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {deletePwdBusy ? "Saving…" : "Save password"}
                </button>
                {hasDeletePassword && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm("Clear the deletion password for this team?")) return;
                      void persistDeletePassword("");
                    }}
                    disabled={deletePwdBusy || !currentDeletePassword.trim()}
                    className="touch-target-compact rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleDelete} className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Delete this team
                </span>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Team or admin password"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                  autoComplete="current-password"
                />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Permanently deletes all schedule data. This cannot be undone.
              </p>
              {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
              <button
                type="submit"
                disabled={deleteBusy || !deletePassword}
                className="touch-target w-full rounded-lg bg-red-600 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleteBusy ? "Deleting…" : "Delete team"}
              </button>
            </form>
          </section>
        </div>
        )}
      </div>
    </div>
  );
}
