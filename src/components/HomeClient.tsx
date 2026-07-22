"use client";

import {
  clearActiveFamilyId,
  clearAdminSession,
  getAdminSessionPassword,
  getKnownTeams,
  isAdminUnlocked,
  removeKnownTeam,
  setAdminSession,
  type KnownTeam,
} from "@/lib/storage";
import type { Team } from "@/lib/types";
import { defaultWeekStartStr } from "@/lib/dates";
import { ShareTeamButton } from "@/components/ShareTeamButton";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

interface HomeClientProps {
  adminEnabled: boolean;
}

type ListedTeam = Team | (KnownTeam & { id: string; secret_slug: string });

function toListedTeam(team: KnownTeam): ListedTeam {
  return {
    id: team.slug,
    name: team.name,
    secret_slug: team.slug,
    schedule_url: null,
    visible_days: [0, 1, 2, 3, 4, 5, 6],
    has_delete_password: false,
    has_api_key: false,
    schedule_integration: null,
    created_at: team.lastAccessedAt,
  };
}

export function HomeClient({ adminEnabled }: HomeClientProps) {
  const [recentTeams, setRecentTeams] = useState<KnownTeam[]>([]);
  const [allTeams, setAllTeams] = useState<Team[] | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [showAdminSheet, setShowAdminSheet] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ListedTeam | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRecent = useCallback(() => {
    setRecentTeams(getKnownTeams());
  }, []);

  const fetchAllTeams = useCallback(async (password: string) => {
    const res = await fetch("/api/teams", {
      headers: { Authorization: `Bearer ${password}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Could not load teams");
    }
    setAllTeams(data.teams as Team[]);
  }, []);

  useEffect(() => {
    refreshRecent();
    const start = defaultWeekStartStr();
    void (async () => {
      const teams = getKnownTeams();
      if (teams.length === 0) return;
      const results = await Promise.all(
        teams.map(async (team) => ({
          slug: team.slug,
          exists: (await fetch(`/api/teams/${team.slug}/week?start=${start}`)).ok,
        }))
      );
      let changed = false;
      for (const { slug, exists } of results) {
        if (exists) continue;
        removeKnownTeam(slug);
        clearActiveFamilyId(slug);
        changed = true;
      }
      if (changed) refreshRecent();
    })();
    if (adminEnabled && isAdminUnlocked()) {
      const password = getAdminSessionPassword();
      if (password) {
        setAdminMode(true);
        void fetchAllTeams(password).catch(() => {
          clearAdminSession();
          setAdminMode(false);
          setAllTeams(null);
        });
      }
    }
  }, [adminEnabled, fetchAllTeams, refreshRecent]);

  const displayedTeams: ListedTeam[] = adminMode && allTeams ? allTeams : recentTeams.map(toListedTeam);
  const sectionTitle = adminMode ? "All teams" : "Recent teams";

  async function handleAdminUnlock(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Incorrect admin password");
        return;
      }
      setAdminSession(adminPassword);
      setAdminMode(true);
      await fetchAllTeams(adminPassword);
      setShowAdminSheet(false);
      setAdminPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock admin");
    } finally {
      setBusy(false);
    }
  }

  function handleLockAdmin() {
    clearAdminSession();
    setAdminMode(false);
    setAllTeams(null);
    setAdminPassword("");
    setError(null);
  }

  async function handleDelete(e: FormEvent) {
    e.preventDefault();
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${deleteTarget.secret_slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete team");
        return;
      }
      removeKnownTeam(deleteTarget.secret_slug);
      clearActiveFamilyId(deleteTarget.secret_slug);
      refreshRecent();
      setAllTeams((current) => current?.filter((team) => team.secret_slug !== deleteTarget.secret_slug) ?? null);
      setDeleteTarget(null);
      setDeletePassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {sectionTitle}
        </h2>
        {displayedTeams.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
            Teams you open or create on this device appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {displayedTeams.map((team) => (
              <li
                key={team.secret_slug}
                className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <Link
                  href={`/c/${team.secret_slug}`}
                  className="flex min-w-0 flex-1 items-center truncate px-4 py-3 font-semibold text-slate-900 active:bg-slate-50 dark:text-slate-100 dark:active:bg-slate-700"
                >
                  {team.name}
                </Link>
                <Link
                  href={`/c/${team.secret_slug}`}
                  className="shrink-0 border-l border-slate-200 px-3 py-3 text-sm font-medium text-sky-600 active:bg-slate-50 dark:border-slate-700 dark:text-sky-400 dark:active:bg-slate-700"
                >
                  Open ›
                </Link>
                <ShareTeamButton
                  slug={team.secret_slug}
                  teamName={team.name}
                  variant="icon"
                  className="border-l border-slate-200 px-3 dark:border-slate-700"
                />
                {adminMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(team);
                      setDeletePassword("");
                      setError(null);
                    }}
                    className="border-l border-slate-200 px-3 text-sm font-medium text-red-600 active:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:active:bg-red-950"
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/setup"
        className="touch-target flex w-full items-center justify-center rounded-2xl bg-sky-500 px-6 text-lg font-semibold text-white shadow-sm active:bg-sky-600 dark:bg-sky-600 dark:active:bg-sky-500"
      >
        Create a team
      </Link>

      {adminEnabled && (
        <footer className="pt-4 text-center">
          {adminMode ? (
            <button
              type="button"
              onClick={handleLockAdmin}
              className="text-sm font-medium text-slate-500 active:text-slate-700 dark:text-slate-400 dark:active:text-slate-200"
            >
              Lock admin
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowAdminSheet(true);
                setAdminPassword("");
                setError(null);
              }}
              className="text-sm font-medium text-slate-500 active:text-slate-700 dark:text-slate-400 dark:active:text-slate-200"
            >
              Admin
            </button>
          )}
        </footer>
      )}

      {showAdminSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <button
            type="button"
            className="flex-1"
            aria-label="Close"
            onClick={() => setShowAdminSheet(false)}
          />
          <div className="rounded-t-2xl bg-white safe-bottom dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Admin</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Enter the admin password to see all teams on this device.
              </p>
            </div>
            <form onSubmit={handleAdminUnlock} className="mx-auto max-w-md space-y-4 p-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Admin password</span>
                <input
                  type="password"
                  required
                  autoFocus
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600"
                  autoComplete="current-password"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminSheet(false)}
                  className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium dark:border-slate-600 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !adminPassword}
                  className="flex-1 rounded-lg bg-sky-500 py-2.5 font-medium text-white disabled:opacity-50"
                >
                  {busy ? "Checking…" : "Unlock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <button
            type="button"
            className="flex-1"
            aria-label="Close"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="rounded-t-2xl bg-white safe-bottom dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete team</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Permanently delete <span className="font-medium">{deleteTarget.name}</span>? This cannot be undone.
              </p>
            </div>
            <form onSubmit={handleDelete} className="mx-auto max-w-md space-y-4 p-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Team or admin password</span>
                <input
                  type="password"
                  required
                  autoFocus
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600"
                  autoComplete="current-password"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium dark:border-slate-600 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !deletePassword}
                  className="flex-1 rounded-lg bg-red-600 py-2.5 font-medium text-white disabled:opacity-50"
                >
                  {busy ? "Deleting…" : "Delete team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
