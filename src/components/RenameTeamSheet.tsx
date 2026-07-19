"use client";

import type { Family } from "@/lib/types";
import {
  DEFAULT_VISIBLE_DAYS,
  normalizeVisibleDays,
  visibleDaysEqual,
  WEEKDAY_LABELS,
} from "@/lib/visibleDays";
import { getTeamUrl } from "@/lib/shareTeam";
import { clearActiveFamilyId, removeKnownTeam } from "@/lib/storage";
import { ShareTeamButton } from "@/components/ShareTeamButton";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

interface RenameTeamSheetProps {
  teamName: string;
  scheduleUrl?: string | null;
  visibleDays?: number[];
  hasDeletePassword?: boolean;
  families: Family[];
  slug: string;
  onClose: () => void;
  onUpdated: (team: {
    name: string;
    schedule_url: string | null;
    visible_days: number[];
    has_delete_password: boolean;
  }) => void;
  onFamiliesUpdated: (families: Family[]) => void;
}

export function RenameTeamSheet({
  teamName,
  scheduleUrl,
  visibleDays: initialVisibleDays = [...DEFAULT_VISIBLE_DAYS],
  hasDeletePassword: initialHasDeletePassword = false,
  families: initialFamilies,
  slug,
  onClose,
  onUpdated,
  onFamiliesUpdated,
}: RenameTeamSheetProps) {
  const router = useRouter();
  const [name, setName] = useState(teamName);
  const [scheduleLink, setScheduleLink] = useState(scheduleUrl ?? "");
  const [visibleDays, setVisibleDays] = useState<number[]>(initialVisibleDays);
  const [hasDeletePassword, setHasDeletePassword] = useState(initialHasDeletePassword);
  const [newDeletePassword, setNewDeletePassword] = useState("");
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
    !visibleDaysEqual(visibleDays, initialVisibleDays) ||
    newDeletePassword.trim().length > 0;

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
        const payload: {
          name: string;
          schedule_url: string | null;
          visible_days: number[];
          delete_password?: string;
        } = {
          name: name.trim(),
          schedule_url: scheduleLink.trim() || null,
          visible_days: visibleDays,
        };
        if (newDeletePassword.trim()) {
          payload.delete_password = newDeletePassword.trim();
        }
        const res = await fetch(`/api/teams/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not save team");
          return;
        }
        if (newDeletePassword.trim()) {
          setNewDeletePassword("");
        }
        setHasDeletePassword(data.team.has_delete_password ?? hasDeletePassword);
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

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white safe-bottom dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold dark:text-slate-100">Team settings</h2>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy || !name.trim() || !isDirty}
              className="touch-target-sm rounded-lg px-3 text-sm font-semibold text-sky-600 disabled:opacity-35 dark:text-sky-400"
            >
              {busy ? "Saving…" : "Save"}
            </button>
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
                    className="shrink-0 touch-target-compact rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:active:bg-slate-700"
                    title="Copy schedule link"
                  >
                    Copy
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

            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Deletion password</span>
              <input
                type="password"
                value={newDeletePassword}
                onChange={(e) => setNewDeletePassword(e.target.value)}
                placeholder={hasDeletePassword ? "Enter new password to change" : "Optional — set a deletion password"}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {hasDeletePassword
                  ? "A deletion password is set. It is never shown — enter a new one here to change it."
                  : "Optional. Used to delete this team (admin password also works)."}
              </p>
            </label>

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

          <form onSubmit={handleDelete} className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Remove team</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Permanently delete <span className="font-medium">{teamName}</span> and all schedule data.
                This cannot be undone.
              </p>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Team or admin password</span>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600"
                autoComplete="current-password"
              />
            </label>

            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

            <button
              type="submit"
              disabled={deleteBusy || !deletePassword}
              className="w-full rounded-lg bg-red-600 py-2.5 font-medium text-white disabled:opacity-50"
            >
              {deleteBusy ? "Deleting…" : "Delete team"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
