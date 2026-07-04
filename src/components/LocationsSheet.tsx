"use client";

import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import type { PlaceSuggestion, SavedLocation } from "@/lib/types";
import { FormEvent, useState } from "react";

interface LocationsSheetProps {
  locations: SavedLocation[];
  slug: string;
  weekStart: string;
  onClose: () => void;
  onUpdated: (locations: SavedLocation[]) => void;
  onWeekApplied: () => void;
}

export function LocationsSheet({
  locations,
  slug,
  weekStart,
  onClose,
  onUpdated,
  onWeekApplied,
}: LocationsSheetProps) {
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  function startEdit(loc: SavedLocation) {
    setEditingId(loc.id);
    setEditName(loc.name);
    setEditAddress(loc.address);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditAddress(null);
  }

  function handleNewSelect(place: PlaceSuggestion) {
    setNewName(place.name);
    setNewAddress(place.address);
  }

  function handleEditSelect(place: PlaceSuggestion) {
    setEditName(place.name);
    setEditAddress(place.address);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${slug}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), address: newAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add location");
        return;
      }
      onUpdated(data.locations);
      setNewName("");
      setNewAddress(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${slug}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: editingId,
          name: editName.trim(),
          address: editAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save location");
        return;
      }
      onUpdated(data.locations);
      cancelEdit();
    } finally {
      setBusy(false);
    }
  }

  async function handleApplyWeek(loc: SavedLocation) {
    setBusy(true);
    setError(null);
    setAppliedId(null);
    try {
      const res = await fetch(`/api/teams/${slug}/week/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, locationName: loc.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not apply location to week");
        return;
      }
      setAppliedId(loc.id);
      onWeekApplied();
      setTimeout(() => setAppliedId(null), 2000);
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
      if (editingId === id) cancelEdit();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white safe-bottom dark:bg-slate-900">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold dark:text-slate-100">Locations</h2>
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

        <div className="p-4 space-y-4 max-w-lg mx-auto">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Save places here. Set all days is a shortcut for the whole week — tap any day on the schedule to set that day only.
          </p>
          <ul className="space-y-3">
            {locations.map((loc) => (
              <li key={loc.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                {editingId === loc.id ? (
                  <div className="space-y-2">
                    <LocationAutocomplete
                      value={editName}
                      onChange={setEditName}
                      onSelect={handleEditSelect}
                      placeholder="Search place name or address"
                      autoFocus
                    />
                    {editAddress && (
                      <p className="text-xs text-slate-500 line-clamp-2 dark:text-slate-400">{editAddress}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy || !editName.trim()}
                        onClick={handleSaveEdit}
                        className="flex-1 rounded-lg bg-sky-500 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{loc.name}</p>
                        {loc.address && (
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">{loc.address}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startEdit(loc)}
                          className="text-sm font-medium text-sky-600 dark:text-sky-400"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy || locations.length <= 1}
                          onClick={() => handleDelete(loc.id)}
                          className="text-sm text-red-600 disabled:opacity-30 dark:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleApplyWeek(loc)}
                      className={`w-full rounded-lg py-2 text-sm font-medium ${
                        appliedId === loc.id
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-sky-100 text-sky-800 active:bg-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:active:bg-sky-900"
                      } disabled:opacity-50`}
                    >
                      {appliedId === loc.id ? "Applied to all days" : "Set all days this week"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handleAdd} className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Add location</p>
            <LocationAutocomplete
              value={newName}
              onChange={(v) => {
                setNewName(v);
                if (!v.trim()) setNewAddress(null);
              }}
              onSelect={handleNewSelect}
              placeholder="e.g. Bethlehem Central High School"
            />
            {newAddress && (
              <p className="text-xs text-slate-500 line-clamp-2 dark:text-slate-400">{newAddress}</p>
            )}
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="w-full rounded-lg bg-sky-500 py-2.5 font-medium text-white disabled:opacity-50"
            >
              Add location
            </button>
          </form>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
