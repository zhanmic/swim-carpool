"use client";

import { formatDayLabel, parseDateOnly } from "@/lib/dates";
import type { AssignmentRole, Family, SessionWithAssignments } from "@/lib/types";
import { useState } from "react";

interface DaySheetProps {
  session: SessionWithAssignments;
  families: Family[];
  activeFamilyId: string | null;
  activeFamilyName: string | null;
  onClose: () => void;
  onSaveSchedule: (data: {
    start_time: string;
    end_time: string;
    location_name: string;
    location_notes: string;
    cancelled: boolean;
  }) => Promise<void>;
  onClaim: (role: AssignmentRole, action: "claim" | "unclaim") => Promise<void>;
}

export function DaySheet({
  session,
  activeFamilyId,
  activeFamilyName,
  onClose,
  onSaveSchedule,
  onClaim,
}: DaySheetProps) {
  const [startTime, setStartTime] = useState(session.start_time);
  const [endTime, setEndTime] = useState(session.end_time);
  const [locationName, setLocationName] = useState(session.location_name);
  const [locationNotes, setLocationNotes] = useState(session.location_notes ?? "");
  const [cancelled, setCancelled] = useState(session.cancelled);
  const [saving, setSaving] = useState(false);
  const [confirmRole, setConfirmRole] = useState<AssignmentRole | null>(null);
  const [busy, setBusy] = useState(false);

  const date = parseDateOnly(session.session_date);
  const drop = session.assignments.find((a) => a.role === "dropoff");
  const pick = session.assignments.find((a) => a.role === "pickup");

  async function handleSave() {
    setSaving(true);
    try {
      await onSaveSchedule({
        start_time: startTime,
        end_time: endTime,
        location_name: locationName,
        location_notes: locationNotes,
        cancelled,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleClaim(role: AssignmentRole) {
    if (!activeFamilyId) return;
    setBusy(true);
    try {
      const mine = session.assignments.find((a) => a.role === role && a.family_id === activeFamilyId);
      await onClaim(role, mine ? "unclaim" : "claim");
      setConfirmRole(null);
    } finally {
      setBusy(false);
    }
  }

  function renderClaimButton(role: AssignmentRole, label: string, currentName?: string) {
    const isMine = session.assignments.some((a) => a.role === role && a.family_id === activeFamilyId);
    const taken = !!currentName && !isMine;

    return (
      <div>
        {confirmRole === role ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2">
            <p className="text-sm text-slate-700">
              {isMine
                ? `Release ${label.toLowerCase()} as ${activeFamilyName}?`
                : `Claim ${label.toLowerCase()} as ${activeFamilyName}?`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleClaim(role)}
                className="touch-target flex-1 rounded-lg bg-sky-500 text-white font-medium disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmRole(null)}
                className="touch-target flex-1 rounded-lg border border-slate-300 bg-white font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={!activeFamilyId || taken || busy}
            onClick={() => setConfirmRole(role)}
            className={`touch-target w-full rounded-xl px-4 font-semibold disabled:opacity-50 ${
              isMine
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : taken
                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                  : "bg-amber-100 text-amber-900 border border-amber-300"
            }`}
          >
            {isMine
              ? `✓ ${label} — ${activeFamilyName} (tap to release)`
              : taken
                ? `${label}: ${currentName}`
                : `I'll do ${label.toLowerCase()}`}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white safe-bottom">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h2 className="text-lg font-semibold">{formatDayLabel(date)}</h2>
          <button type="button" onClick={onClose} className="touch-target-sm text-sky-600 font-medium">
            Done
          </button>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={cancelled}
              onChange={(e) => setCancelled(e.target.checked)}
              className="h-5 w-5"
            />
            Cancelled (no practice)
          </label>

          {!cancelled && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-slate-600">Start</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-600">End</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className="text-sm text-slate-600">Location</span>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-600">Notes</span>
            <input
              type="text"
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              placeholder="e.g. North pool today"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="touch-target w-full rounded-xl bg-slate-800 text-white font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save schedule"}
          </button>

          {!cancelled && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-600">Driver spots</p>
              {renderClaimButton("dropoff", "Drop-off", drop?.family_name)}
              {renderClaimButton("pickup", "Pick-up", pick?.family_name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
