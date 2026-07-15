"use client";

import { exportSessionToCalendar } from "@/lib/calendar";
import { isFamilySkipping, skippingFamilyIds, skippingFamilyNames } from "@/lib/absences";
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

function DriverIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

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
  }) => Promise<boolean>;
  onClaim: (role: AssignmentRole, action: "claim" | "release", targetFamilyId?: string) => Promise<void>;
  onSkip: (action: "mark" | "clear") => Promise<void>;
}

type ScheduleSnapshot = {
  start_time: string;
  end_time: string;
  location_name: string;
  location_notes: string | null;
  dropoff_pickups: DropoffPickups;
  cancelled: boolean;
};

function buildScheduleSnapshot(
  session: SessionWithAssignments,
  skipIds: Set<string>
): ScheduleSnapshot {
  const drop = session.assignments.find((a) => a.role === "dropoff");
  return {
    start_time: snapTimeToStep(session.start_time),
    end_time: snapTimeToStep(session.end_time),
    location_name: session.location_name,
    location_notes: session.location_notes?.trim() || null,
    dropoff_pickups: cleanDropoffPickups(
      parseDropoffPickups(session.dropoff_pickups),
      drop?.family_id ?? null,
      skipIds
    ),
    cancelled: session.cancelled,
  };
}

function schedulesEqual(a: ScheduleSnapshot, b: ScheduleSnapshot): boolean {
  if (
    a.start_time !== b.start_time ||
    a.end_time !== b.end_time ||
    a.location_name !== b.location_name ||
    a.cancelled !== b.cancelled
  ) {
    return false;
  }
  if ((a.location_notes ?? "") !== (b.location_notes ?? "")) {
    return false;
  }
  const keysA = Object.keys(a.dropoff_pickups).sort();
  const keysB = Object.keys(b.dropoff_pickups).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) return false;
    if (a.dropoff_pickups[keysA[i]!] !== b.dropoff_pickups[keysB[i]!]) return false;
  }
  return true;
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
  onSkip,
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
  const skipIds = useMemo(() => skippingFamilyIds(session), [session.absences]);
  const familiesNeedingPickup = useMemo(
    () => sortedFamilies.filter((family) => family.id !== dropoffFamilyId && !skipIds.has(family.id)),
    [sortedFamilies, dropoffFamilyId, skipIds]
  );
  const activeFamilySkipping = activeFamilyId ? isFamilySkipping(session, activeFamilyId) : false;
  const otherSkipping = useMemo(() => {
    if (!activeFamilyId) return skippingFamilyNames(session);
    return skippingFamilyNames(session).filter((name) => name !== activeFamilyName);
  }, [session.absences, activeFamilyId, activeFamilyName]);

  const [dropoffPickups, setDropoffPickups] = useState<DropoffPickups>(() =>
    cleanDropoffPickups(parseDropoffPickups(session.dropoff_pickups), drop?.family_id ?? null, skipIds)
  );
  const [cancelled, setCancelled] = useState(session.cancelled);
  const [savedSnapshot, setSavedSnapshot] = useState<ScheduleSnapshot>(() =>
    buildScheduleSnapshot(session, skipIds)
  );
  const [saving, setSaving] = useState(false);
  const [confirmRole, setConfirmRole] = useState<AssignmentRole | null>(null);
  const [assignDropdownRole, setAssignDropdownRole] = useState<AssignmentRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [skipBusy, setSkipBusy] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");

  useEffect(() => {
    const snapshot = buildScheduleSnapshot(session, skipIds);
    setStartTime(snapshot.start_time);
    setEndTime(snapshot.end_time);
    setLocationName(snapshot.location_name);
    setLocationNotes(snapshot.location_notes ?? "");
    setDropoffPickups(snapshot.dropoff_pickups);
    setCancelled(snapshot.cancelled);
    setSavedSnapshot(snapshot);
    // Only reset when opening a different day — not on background SWR refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session fields read when session.id changes
  }, [session.id]);

  useEffect(() => {
    if (!dropoffFamilyId) return;
    setDropoffPickups((current) => {
      if (!current[dropoffFamilyId]) return current;
      const next = { ...current };
      delete next[dropoffFamilyId];
      return next;
    });
  }, [dropoffFamilyId]);

  const currentSchedule = useMemo<ScheduleSnapshot>(
    () => ({
      start_time: startTime,
      end_time: endTime,
      location_name: locationName,
      location_notes: locationNotes.trim() || null,
      dropoff_pickups: cleanDropoffPickups(dropoffPickups, dropoffFamilyId),
      cancelled,
    }),
    [startTime, endTime, locationName, locationNotes, dropoffPickups, dropoffFamilyId, cancelled]
  );

  const scheduleDirty = useMemo(
    () => !schedulesEqual(currentSchedule, savedSnapshot),
    [currentSchedule, savedSnapshot]
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

  function clearNotes() {
    setDropoffPickups({});
    setLocationNotes("");
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
    if (!scheduleDirty || saving) return;
    setSaving(true);
    try {
      const saved = await onSaveSchedule(currentSchedule);
      if (saved) {
        setSavedSnapshot(currentSchedule);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleClaim(role: AssignmentRole, targetFamilyId?: string) {
    if ((!activeFamilyId || activeFamilySkipping) && !targetFamilyId) return;
    setBusy(true);
    try {
      const assignment = session.assignments.find((a) => a.role === role);
      const action = assignment ? "release" : "claim";
      await onClaim(role, action, targetFamilyId);
      setConfirmRole(null);
      setAssignDropdownRole(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleSkipToggle() {
    if (!activeFamilyId || skipBusy) return;
    setSkipBusy(true);
    try {
      await onSkip(activeFamilySkipping ? "clear" : "mark");
    } finally {
      setSkipBusy(false);
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
        ) : assignment ? (
          <button
            type="button"
            disabled={!activeFamilyId || busy}
            onClick={() => setConfirmRole(role)}
            className={`touch-target-compact w-full min-w-0 rounded-xl px-2 text-sm font-semibold disabled:opacity-50 ${
              isMine ? "flex items-center gap-1.5 justify-start" : ""
            } ${
              isMine
                ? mineColor ?? claimedColor ?? OPEN_SLOT_BUTTON
                : claimedColor ?? "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
            }`}
          >
            {isMine ? (
              <>
                <DriverIcon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">
                  {role === "dropoff" ? "Drop off" : "Pick up"}: {activeFamilyName} (tap to release)
                </span>
              </>
            ) : (
              <span className="block min-w-0 truncate">
                {role === "dropoff" ? "Drop off" : "Pick up"}: {currentName} (tap to release)
              </span>
            )}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!activeFamilyId || busy}
              onClick={() => setConfirmRole(role)}
              className={`touch-target-compact flex-1 min-w-0 rounded-xl px-2 text-sm font-semibold disabled:opacity-50 ${OPEN_SLOT_BUTTON}`}
            >
              I'll do {label.toLowerCase()}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAssignDropdownRole(role)}
              className={`touch-target-compact rounded-xl px-3 text-sm font-semibold ${OPEN_SLOT_BUTTON}`}
            >
              Assign
            </button>
          </div>
        )}

        {!assignment && assignDropdownRole === role && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assign {label.toLowerCase()} to:
            </p>
            <div className="space-y-1">
              {families.map((family) => {
                const familyColor = getFamilyColor(familyColors, family.id);
                return (
                  <button
                    key={family.id}
                    type="button"
                    disabled={busy}
                    onClick={() => handleClaim(role, family.id)}
                    className={`touch-target-compact w-full rounded-lg px-3 text-left text-sm font-medium disabled:opacity-50 ${
                      familyColor?.button ?? "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {family.name}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setAssignDropdownRole(null)}
                className="touch-target-compact w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
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
                  Add to calendar
                </button>
              )}
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
        </div>

        <div className="min-w-0 space-y-2 px-3 py-2 max-w-lg mx-auto">
          {!cancelled && activeFamilyId && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2 dark:border-amber-800 dark:bg-amber-950/40">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={activeFamilySkipping}
                  disabled={skipBusy}
                  onChange={() => void handleSkipToggle()}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-medium text-amber-950 dark:text-amber-100">
                  Skip{activeFamilyName ? ` — ${activeFamilyName}` : ""}
                </span>
              </label>
              {otherSkipping.length > 0 && (
                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
                  Also skipping: {otherSkipping.join(", ")}
                </p>
              )}
            </div>
          )}

          {!cancelled && (
            <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <label className="block min-w-0">
                <span className="text-xs text-slate-600 dark:text-slate-400">Start</span>
                <TimeInput
                  value={startTime}
                  onChange={handleStartTimeChange}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-1 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-xs text-slate-600 dark:text-slate-400">End</span>
                <TimeInput
                  value={endTime}
                  onChange={setEndTime}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-1 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
              </label>
            </div>
          )}

          <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-2 min-w-0 dark:border-violet-800 dark:bg-violet-950/40">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-violet-900 dark:text-violet-200">Notes for drivers</span>
                {!cancelled && familiesNeedingPickup.length > 0 && (
                  <p className="text-[11px] font-medium text-violet-800 dark:text-violet-300">Home pickups</p>
                )}
              </div>
              {!cancelled && (
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {familiesNeedingPickup.length > 0 && (
                    <button
                      type="button"
                      onClick={fillPickupsBeforePractice}
                      className="text-[11px] font-medium text-sky-600 dark:text-sky-400"
                    >
                      30 min default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={clearNotes}
                    className="text-[11px] font-medium text-sky-600 dark:text-sky-400"
                  >
                    Clear notes
                  </button>
                </div>
              )}
            </div>
            {!cancelled && familiesNeedingPickup.length > 0 && (
              <div className="mt-0.5 space-y-1">
                {dropoffFamilyId && (
                  <p className="text-[11px] leading-tight text-violet-700/80 dark:text-violet-300/80">
                    {drop?.family_name} driving — same house
                  </p>
                )}
                <ul className="space-y-1">
                  {familiesNeedingPickup.map((family) => (
                    <li
                      key={family.id}
                      className="grid grid-cols-[3.5rem_5rem_minmax(0,1fr)] items-center gap-x-1.5"
                    >
                      <span
                        title={family.home_label ?? undefined}
                        className={`truncate text-xs font-medium ${getFamilyColor(familyColors, family.id)?.text ?? "text-slate-700 dark:text-slate-300"}`}
                      >
                        {family.name}
                      </span>
                      <TimeInput
                        value={dropoffPickups[family.id] ?? ""}
                        onChange={(time) => setFamilyPickup(family.id, time)}
                        className="w-full max-w-[5rem] rounded-md border border-violet-200 bg-white px-1 py-1 text-sm dark:border-violet-700 dark:bg-slate-900"
                      />
                      {family.home_label ? (
                        <span className="min-w-0 truncate text-[11px] text-violet-700/70 dark:text-violet-300/70">
                          {family.home_label}
                        </span>
                      ) : (
                        <span aria-hidden />
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
            disabled={saving || !scheduleDirty}
            className="touch-target-compact w-full rounded-xl bg-slate-800 text-sm font-semibold text-white disabled:bg-slate-300 disabled:text-slate-500 dark:bg-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
          >
            {saving ? "Saving…" : "Save schedule"}
          </button>

          {!cancelled && !activeFamilySkipping && (
            <div className="space-y-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Driver spots</p>
              {renderClaimButton("dropoff", "Drop off (to pool)", drop?.family_name)}
              {renderClaimButton("pickup", "Pick up (from pool)", pick?.family_name)}
            </div>
          )}

          {!cancelled && activeFamilySkipping && (
            <p className="border-t border-slate-100 pt-1.5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Driver spots hidden while you&apos;re skipping
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
