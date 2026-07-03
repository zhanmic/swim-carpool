"use client";

import { exportSessionToCalendar } from "@/lib/calendar";
import {
  cleanDropoffPickups,
  parseDropoffPickups,
  subtractMinutes,
  type DropoffPickups,
} from "@/lib/dropoffPickups";
import { formatDayLabel, parseDateOnly, snapTimeToStep } from "@/lib/dates";
import { getFamilyColor, OPEN_SLOT_BUTTON, type FamilyColorClasses } from "@/lib/familyColors";
import type { AssignmentRole, Family, SavedLocation, SessionWithAssignments } from "@/lib/types";
import { useMemo, useState } from "react";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { TimeInput } from "./TimeInput";

interface DaySheetProps {
  session: SessionWithAssignments;
  teamName: string;
  families: Family[];
  familyColors: Map<string, FamilyColorClasses>;
  locations: SavedLocation[];
  activeFamilyId: string | null;
  activeFamilyName: string | null;
  onClose: () => void;
  onManageLocations: () => void;
  onSaveSchedule: (data: {
    start_time: string;
    end_time: string;
    location_name: string;
    location_notes: string | null;
    dropoff_pickups: DropoffPickups;
    cancelled: boolean;
  }) => Promise<void>;
  onClaim: (role: AssignmentRole, action: "claim" | "release") => Promise<void>;
}

export function DaySheet({
  session,
  teamName,
  families,
  familyColors,
  locations,
  activeFamilyId,
  activeFamilyName,
  onClose,
  onManageLocations,
  onSaveSchedule,
  onClaim,
}: DaySheetProps) {
  const [startTime, setStartTime] = useState(() => snapTimeToStep(session.start_time));
  const [endTime, setEndTime] = useState(() => snapTimeToStep(session.end_time));
  const [locationName, setLocationName] = useState(session.location_name);
  const [locationNotes, setLocationNotes] = useState(session.location_notes ?? "");
  const [dropoffPickups, setDropoffPickups] = useState<DropoffPickups>(() =>
    parseDropoffPickups(session.dropoff_pickups)
  );
  const [cancelled, setCancelled] = useState(session.cancelled);
  const [saving, setSaving] = useState(false);
  const [confirmRole, setConfirmRole] = useState<AssignmentRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");

  const date = parseDateOnly(session.session_date);
  const drop = session.assignments.find((a) => a.role === "dropoff");
  const pick = session.assignments.find((a) => a.role === "pickup");
  const sortedFamilies = useMemo(
    () => [...families].sort((a, b) => a.name.localeCompare(b.name)),
    [families]
  );

  function setFamilyPickup(familyId: string, time: string) {
    setDropoffPickups((current) => {
      const next = { ...current };
      if (!time.trim()) {
        delete next[familyId];
        return next;
      }
      next[familyId] = time;
      return next;
    });
  }

  function fillPickupsBeforePractice(minutes: number) {
    const pickupTime = subtractMinutes(startTime, minutes);
    setDropoffPickups((current) => {
      const next = { ...current };
      for (const family of sortedFamilies) {
        if (!next[family.id]?.trim()) {
          next[family.id] = pickupTime;
        }
      }
      return next;
    });
  }

  function handleAddToCalendar() {
    exportSessionToCalendar(
      {
        ...session,
        start_time: startTime,
        end_time: endTime,
        location_name: locationName,
        location_notes: locationNotes.trim() || null,
        dropoff_pickups: cleanDropoffPickups(dropoffPickups),
      },
      teamName,
      families
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSaveSchedule({
        start_time: startTime,
        end_time: endTime,
        location_name: locationName,
        location_notes: locationNotes.trim() || null,
        dropoff_pickups: cleanDropoffPickups(dropoffPickups),
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
      const assignment = session.assignments.find((a) => a.role === role);
      const action = assignment ? "release" : "claim";
      await onClaim(role, action);
      setConfirmRole(null);
    } finally {
      setBusy(false);
    }
  }

  function renderClaimButton(role: AssignmentRole, label: string, currentName?: string) {
    const assignment = session.assignments.find((a) => a.role === role);
    const isMine = assignment?.family_id === activeFamilyId;
    const takenByOther = !!assignment && !isMine;
    const claimedColor = getFamilyColor(familyColors, assignment?.family_id)?.button;
    const mineColor = getFamilyColor(familyColors, activeFamilyId)?.button;

    return (
      <div>
        {confirmRole === role ? (
          <div
            className={`rounded-xl border p-3 space-y-2 ${
              takenByOther
                ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
                : "border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950"
            }`}
          >
            {takenByOther ? (
              <>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Release {label.toLowerCase()} for {currentName}?
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  This clears their slot for the whole team. Only do this if {currentName} asked you to change it.
                </p>
              </>
            ) : isMine ? (
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Release {label.toLowerCase()} as {activeFamilyName}?
              </p>
            ) : (
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Claim {label.toLowerCase()} as {activeFamilyName}?
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleClaim(role)}
                className={`touch-target flex-1 rounded-lg font-medium text-white disabled:opacity-50 ${
                  takenByOther ? "bg-red-600" : "bg-sky-500"
                }`}
              >
                {takenByOther ? "Release slot" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRole(null)}
                className="touch-target flex-1 rounded-lg border border-slate-300 bg-white font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={!activeFamilyId || busy}
            onClick={() => setConfirmRole(role)}
            className={`touch-target w-full rounded-xl px-4 font-semibold disabled:opacity-50 ${
              isMine
                ? mineColor ?? claimedColor ?? OPEN_SLOT_BUTTON
                : takenByOther
                  ? claimedColor ?? "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  : OPEN_SLOT_BUTTON
            }`}
          >
            {isMine
              ? `✓ ${label} — ${activeFamilyName} (tap to release)`
              : takenByOther
                ? `${label}: ${currentName} (tap to release)`
                : `I'll do ${label.toLowerCase()}`}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white safe-bottom dark:bg-slate-900">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <h2 className="truncate text-lg font-semibold dark:text-slate-100">{formatDayLabel(date)}</h2>
              <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={cancelled}
                  onChange={(e) => setCancelled(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                Cancelled
              </label>
            </div>
            <button type="button" onClick={onClose} className="touch-target-sm shrink-0 text-sky-600 font-medium dark:text-sky-400">
              Done
            </button>
          </div>
          {!cancelled && (
            <button
              type="button"
              onClick={handleAddToCalendar}
              className="mt-2 text-sm font-medium text-sky-600 dark:text-sky-400"
            >
              Add to iPhone Calendar
            </button>
          )}
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {!cancelled && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-slate-600 dark:text-slate-400">Start</span>
                <TimeInput
                  value={startTime}
                  onChange={setStartTime}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600"
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-600 dark:text-slate-400">End</span>
                <TimeInput
                  value={endTime}
                  onChange={setEndTime}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600"
                />
              </label>
            </div>
          )}

          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-800 dark:bg-violet-950/40">
            <span className="text-sm font-semibold text-violet-900 dark:text-violet-200">Notes for drivers</span>
            {!cancelled && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-violet-800 dark:text-violet-300">
                    Drop-off: pick up from home
                  </p>
                  <button
                    type="button"
                    onClick={() => fillPickupsBeforePractice(15)}
                    className="shrink-0 text-xs font-medium text-sky-600 dark:text-sky-400"
                  >
                    15 min before practice
                  </button>
                </div>
                <ul className="space-y-2">
                  {sortedFamilies.map((family) => (
                    <li key={family.id} className="flex items-center gap-2">
                      <span
                        className={`w-20 shrink-0 truncate text-sm font-medium ${getFamilyColor(familyColors, family.id)?.text ?? "text-slate-700 dark:text-slate-300"}`}
                      >
                        {family.name}
                      </span>
                      <TimeInput
                        value={dropoffPickups[family.id] ?? ""}
                        onChange={(time) => setFamilyPickup(family.id, time)}
                        className="w-28 rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm dark:border-violet-700 dark:bg-slate-900"
                      />
                      {family.home_label && (
                        <span className="min-w-0 truncate text-xs text-violet-700/70 dark:text-violet-300/70">
                          {family.home_label}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <label className={`block ${!cancelled ? "mt-3" : "mt-2"}`}>
              <span className="text-xs font-medium text-violet-800 dark:text-violet-300">Other notes</span>
              <input
                type="text"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                placeholder="e.g. extra kids on pickup only"
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-base dark:border-violet-700 dark:bg-slate-900"
              />
            </label>
          </div>

          {!cancelled && (
          <div className="block">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Location this day</span>
              <button
                type="button"
                onClick={onManageLocations}
                className="text-xs font-medium text-sky-600 dark:text-sky-400"
              >
                Edit locations
              </button>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Each day can be different — changes here affect only this day.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    setLocationName(loc.name);
                    setLocationSearchQuery("");
                    setShowLocationSearch(false);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    locationName === loc.name
                      ? "bg-sky-500 text-white"
                      : "bg-slate-100 text-slate-700 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700"
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
            <div className="mt-2">
              {showLocationSearch ? (
                <LocationAutocomplete
                  value={locationSearchQuery}
                  onChange={setLocationSearchQuery}
                  onSelect={(place) => {
                    setLocationName(place.name);
                    setLocationSearchQuery("");
                    setShowLocationSearch(false);
                  }}
                  placeholder="Search another place for this day"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setLocationSearchQuery("");
                    setShowLocationSearch(true);
                  }}
                  className="text-sm font-medium text-sky-600 dark:text-sky-400"
                >
                  Search another place
                </button>
              )}
            </div>
          </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="touch-target w-full rounded-xl bg-slate-800 text-white font-semibold disabled:opacity-50 dark:bg-slate-700"
          >
            {saving ? "Saving…" : "Save schedule"}
          </button>

          {!cancelled && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Driver spots</p>
              {renderClaimButton("dropoff", "Drop-off", drop?.family_name)}
              {renderClaimButton("pickup", "Pick-up", pick?.family_name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
