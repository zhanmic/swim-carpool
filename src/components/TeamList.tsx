"use client";

import type { Team } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface TeamListProps {
  teams: Team[];
}

export function TeamList({ teams: initialTeams }: TeamListProps) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(e: FormEvent) {
    e.preventDefault();
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${deleteTarget.secret_slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete team");
        return;
      }
      setTeams((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      setAdminPassword("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (teams.length === 0) return null;

  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Teams
        </h2>
        <ul className="space-y-2">
          {teams.map((team) => (
            <li
              key={team.id}
              className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <Link
                href={`/c/${team.secret_slug}`}
                className="flex min-w-0 flex-1 items-center justify-between px-4 py-3 active:bg-slate-50 dark:active:bg-slate-700"
              >
                <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{team.name}</span>
                <span className="shrink-0 text-sm font-medium text-sky-600 dark:text-sky-400">Open ›</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(team);
                  setAdminPassword("");
                  setError(null);
                }}
                className="border-l border-slate-200 px-3 text-sm font-medium text-red-600 active:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:active:bg-red-950"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

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
                Permanently delete <span className="font-medium">{deleteTarget.name}</span>? This
                cannot be undone.
              </p>
            </div>
            <form onSubmit={handleDelete} className="max-w-md mx-auto p-4 space-y-4">
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
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium dark:border-slate-600 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !adminPassword}
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
