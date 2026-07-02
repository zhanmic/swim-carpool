"use client";

import type { SavedLocation } from "@/lib/types";
import { FormEvent, useState } from "react";

interface LocationsSheetProps {
  locations: SavedLocation[];
  slug: string;
  onClose: () => void;
  onUpdated: (locations: SavedLocation[]) => void;
}

export function LocationsSheet({ locations, slug, onClose, onUpdated }: LocationsSheetProps) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${slug}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add location");
        return;
      }
      onUpdated(data.locations);
      setNewName("");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${slug}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not remove location");
        return;
      }
      onUpdated(data.locations);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white safe-bottom">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h2 className="text-lg font-semibold">Saved locations</h2>
          <button type="button" onClick={onClose} className="text-sky-600 font-medium">
            Done
          </button>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto">
          <ul className="space-y-2">
            {locations.map((loc) => (
              <li
                key={loc.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="font-medium text-slate-800">{loc.name}</span>
                <button
                  type="button"
                  disabled={busy || locations.length <= 1}
                  onClick={() => handleDelete(loc.id)}
                  className="text-sm text-red-600 disabled:opacity-30"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New location name"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="rounded-lg bg-sky-500 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              Add
            </button>
          </form>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
