"use client";

import { exportSessionToCalendar } from "@/lib/calendar";
import {
  cleanDropoffPickups,
  DEFAULT_HOME_PICKUP_MINUTES_BEFORE,
  parseDropoffPickups,
  subtractMinutes,
  type DropoffPickups,
} from "@/lib/dropoffPickups";
import { formatDayLabel, parseDateOnly, snapTimeToStep } from "@/lib/dates";
import { getFamilyColor, OPEN_SLOT_BUTTON, type FamilyColorClasses } from "@/lib/familyColors";
import type { AssignmentRole, Family, SavedLocation, SessionWithAssignments } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
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
  const date = parseDateOnly(session.session_date);
  const drop = session.assignments.find((a) => a.role === "dropoff");
  const pick = session.assignments.find((a) => a.role === "pickup");
  const dropoffFamilyId = drop?.family_id ?? null;
  const sortedFamilies = useMemo(
    () => [...families].sort((a, b) => a.name.localeCompare(b.name)),
    [families]
  );
  const familiesNeedingPickup = useMemo(
    () => sortedFamilies.filter((family) => family.id !== dropoffFamilyId),
    [sortedFamilies, dropoffFamilyId]
  );

  const [dropoffPickups, setDropoffPickups] = useState<DropoffPickups>(() =>
    cleanDropoffPickups(parseDropoffPickups(session.dropoff_pickups), drop?.family_id ?? null)
  );
  const [cancelled, setCancelled] = useState(session.cancelled);
  const [saving, setSaving] = useState(false);
  const [confirmRole, setConfirmRole] = useState<AssignmentRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");

  useEffect(() => {
    if (!dropoffFamilyId) return;
    setDropoffPickups((current) => {
      if (!current[dropoffFamilyId]) return current;
      const next = { ...current };
      delete next[dropoffFamilyId];
      return next;
    });
  }, [dropoffFamilyId]);

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

  function handleStartTimeChange(next: string) {
    setDropoffPickups((current) => {
      const oldDefault = subtractMinutes(startTime, DEFAULT_HOME_PICKUP_MINUTES_BEFORE);
      const newDefault = subtractMinutes(next, DEFAULT_HOME_PICKUP_MINUTES_BEFORE);
      const updated = { ...current };
      let changed = false;
      for (const family of familiesNeedingPickup) {
        const currentTime = updated[family.id]?.trim();
        if (currentTime && currentTime === oldDefault) {
          updated[family.id] = newDefault;
          changed = true;
        }
      }
      return changed ? updated : current;
    });
    setStartTime(next);
  }

  function fillPickupsBeforePractice() {
    const pickupTime = subtractMinutes(startTime, DEFAULT_HOME_PICKUP_MINUTES_BEFORE);
    setDropoffPickups((current) => {
      const next = { ...current };
      for (const family of familiesNeedingPickup) {
        next[family.id] = pickupTime;
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
        dropoff_pickups: cleanDropoffPickups(dropoffPickups, dropoffFamilyId),
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
        dropoff_pickups: cleanDropoffPickups(dropoffPickups, dropoffFamilyId),
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
            className={`rounded-lg border p-2 space-y-1.5 ${
              takenByOther
                ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
                : "border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950"
            }`}
          >
            {takenByOther ? (
              <>
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Release {label.toLowerCase()} for {currentName}?
                </p>
                <p className="text-xs leading-snug text-amber-800 dark:text-amber-300">
                  Only if {currentName} asked you to change it.
                </p>
              </>
            ) : isMine ? (
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Release {label.toLowerCase()} as {activeFamilyName}?
              </p>
            ) : (
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Claim {label.toLowerCase()} as {activeFamilyName}?
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleClaim(role)}
                className={`touch-target-compact flex-1 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
                  takenByOther ? "bg-red-600" : "bg-sky-500"
                }`}
              >
                {takenByOther ? "Release slot" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRole(null)}
                className="touch-target-compact flex-1 rounded-lg border border-slate-300 bg-white text-sm font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
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
            className={`touch-target-compact w-full rounded-xl px-3 text-sm font-semibold disabled:opacity-50 ${
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
      <div className="max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-white safe-bottom dark:bg-slate-900">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h2 className="truncate text-base font-semibold dark:text-slate-100">{formatDayLabel(date)}</h2>
              <label className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={cancelled}
                  onChange={(e) => setCancelled(e.target.checked)}
                  className="h-3.5 w-3.5 rounded"
                />
                Cancelled
              </label>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!cancelled && (
                <button
                  type="button"
                  onClick={handleAddToCalendar}
                  className="text-xs font-medium text-sky-600 dark:text-sky-400"
                >
                  Calendar
                </button>
              )}
              <button type="button" onClick={onClose} className="touch-target-sm text-xs font-medium text-sky-600 dark:text-sky-400">
                Done
              </button>
            </div>
          </div>
        </div>

        <div className="px-3 py-2 space-y-2 max-w-lg mx-auto">
          {!cancelled && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-slate-600 dark:text-slate-400">Start</span>
                <TimeInput
                  value={startTime}
                  onChange={handleStartTimeChange}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600 dark:text-slate-400">End</span>
                <TimeInput
                  value={endTime}
                  onChange={setEndTime}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600"
                />
              </label>
            </div>
          )}

          <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-2 dark:border-violet-800 dark:bg-violet-950/40">
            <span className="text-xs font-semibold text-violet-900 dark:text-violet-200">Notes for drivers</span>
            {!cancelled && familiesNeedingPickup.length > 0 && (
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-violet-800 dark:text-violet-300">Home pickups</p>
                  <button
                    type="button"
                    onClick={fillPickupsBeforePractice}
                    className="shrink-0 text-[11px] font-medium text-sky-600 dark:text-sky-400"
                  >
                    30 min default
                  </button>
                </div>
                {dropoffFamilyId && (
                  <p className="text-[11px] leading-tight text-violet-700/80 dark:text-violet-300/80">
                    {drop?.family_name} driving — same house
                  </p>
                )}
                <ul className="space-y-1">
                  {familiesNeedingPickup.map((family) => (
                    <li key={family.id} className="flex items-center gap-1.5">
                      <span
                        title={family.home_label ?? undefined}
                        className={`w-14 shrink-0 truncate text-xs font-medium ${getFamilyColor(familyColors, family.id)?.text ?? "text-slate-700 dark:text-slate-300"}`}
                      >
                        {family.name}
                      </span>
                      <TimeInput
                        value={dropoffPickups[family.id] ?? ""}
                        onChange={(time) => setFamilyPickup(family.id, time)}
                        className="w-[5.5rem] shrink-0 rounded-md border border-violet-200 bg-white px-1.5 py-1 text-sm dark:border-violet-700 dark:bg-slate-900"
                      />
                      {family.home_label && (
                        <span className="min-w-0 truncate text-[11px] text-violet-700/70 dark:text-violet-300/70">
                          {family.home_label}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <label className={`block ${!cancelled && familiesNeedingPickup.length > 0 ? "mt-1.5" : "mt-1"}`}>
              <span className="text-[11px] font-medium text-violet-800 dark:text-violet-300">Other notes</span>
              <input
                type="text"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                placeholder="e.g. extra kids on pickup only"
                className="mt-0.5 w-full rounded-md border border-violet-200 bg-white px-2 py-1.5 text-sm dark:border-violet-700 dark:bg-slate-900"
              />
            </label>
          </div>

          {!cancelled && (
          <div className="block">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Location</span>
              <button
                type="button"
                onClick={onManageLocations}
                className="text-[11px] font-medium text-sky-600 dark:text-sky-400"
              >
                Edit list
              </button>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    setLocationName(loc.name);
                    setLocationSearchQuery("");
                    setShowLocationSearch(false);
                  }}
                  className={`touch-target-compact rounded-full px-2.5 text-xs font-medium transition-colors ${
                    locationName === loc.name
                      ? "bg-sky-500 text-white"
                      : "bg-slate-100 text-slate-700 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700"
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
            <div className="mt-1">
              {showLocationSearch ? (
                <LocationAutocomplete
                  value={locationSearchQuery}
                  onChange={setLocationSearchQuery}
                  onSelect={(place) => {
                    setLocationName(place.name);
                    setLocationSearchQuery("");
                    setShowLocationSearch(false);
                  }}
                  placeholder="Search another place"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setLocationSearchQuery("");
                    setShowLocationSearch(true);
                  }}
                  className="text-xs font-medium text-sky-600 dark:text-sky-400"
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
            className="touch-target-compact w-full rounded-xl bg-slate-800 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-700"
          >
            {saving ? "Saving…" : "Save schedule"}
          </button>

          {!cancelled && (
            <div className="space-y-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Driver spots</p>
              {renderClaimButton("dropoff", "Drop-off", drop?.family_name)}
              {renderClaimButton("pickup", "Pick-up", pick?.family_name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
