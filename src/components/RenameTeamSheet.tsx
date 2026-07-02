"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface RenameTeamSheetProps {
  teamName: string;
  slug: string;
  onClose: () => void;
  onRenamed: (name: string) => void;
}

export function RenameTeamSheet({ teamName, slug, onClose, onRenamed }: RenameTeamSheetProps) {
  const router = useRouter();
  const [name, setName] = useState(teamName);
  const [adminPassword, setAdminPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not rename team");
        return;
      }
      onRenamed(data.team.name);
      onClose();
    } finally {
      setBusy(false);
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
        body: JSON.stringify({ adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Could not delete team");
        return;
      }
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
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold dark:text-slate-100">Rename or remove team</h2>
          <button type="button" onClick={onClose} className="text-sky-600 font-medium dark:text-sky-400">
            Done
          </button>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-6">
          <form onSubmit={handleRename} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Team name</span>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="w-full rounded-lg bg-sky-500 py-2.5 font-medium text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save name"}
            </button>
          </form>

          <form onSubmit={handleDelete} className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Remove team</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Permanently delete <span className="font-medium">{teamName}</span> and all schedule data.
                This cannot be undone.
              </p>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Admin password</span>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600"
                autoComplete="current-password"
              />
            </label>

            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

            <button
              type="submit"
              disabled={deleteBusy || !adminPassword}
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
