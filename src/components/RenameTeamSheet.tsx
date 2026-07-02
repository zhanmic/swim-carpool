"use client";

import { FormEvent, useState } from "react";

interface RenameTeamSheetProps {
  teamName: string;
  slug: string;
  onClose: () => void;
  onRenamed: (name: string) => void;
}

export function RenameTeamSheet({ teamName, slug, onClose, onRenamed }: RenameTeamSheetProps) {
  const [name, setName] = useState(teamName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
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

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="rounded-t-2xl bg-white safe-bottom">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold">Rename team</h2>
          <button type="button" onClick={onClose} className="text-sky-600 font-medium">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Team name</span>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
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
      </div>
    </div>
  );
}
