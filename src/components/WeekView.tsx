"use client";

import { addDays, defaultWeekStartStr, formatDateOnly, getMonday, parseDateOnly } from "@/lib/dates";
import { buildFamilyColorMap } from "@/lib/familyColors";
import { getActiveFamilyId, setActiveFamilyId } from "@/lib/storage";
import type { AssignmentRole, SavedLocation, SessionWithAssignments, WeekData } from "@/lib/types";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { DayCard } from "./DayCard";
import { DaySheet } from "./DaySheet";
import { FamilyPicker } from "./FamilyPicker";
import { Header } from "./Header";
import { LocationsSheet } from "./LocationsSheet";
import { RenameTeamSheet } from "./RenameTeamSheet";
import { TimeSheet } from "./TimeSheet";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed to fetch");
  return r.json() as Promise<WeekData>;
});

interface WeekViewProps {
  slug: string;
}

export function WeekView({ slug }: WeekViewProps) {
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [showLocations, setShowLocations] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [slotsBusy, setSlotsBusy] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<WeekData>(
    weekStart ? `/api/teams/${slug}/week?start=${weekStart}` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  useEffect(() => {
    setWeekStart(defaultWeekStartStr());
  }, []);

  useEffect(() => {
    if (data?.weekStart && data.weekStart !== weekStart) {
      setWeekStart(data.weekStart);
    }
  }, [data?.weekStart, weekStart]);

  useEffect(() => {
    const stored = getActiveFamilyId(slug);
    setActiveFamilyIdState(stored);
    if (!stored && data?.families.length) {
      setShowPicker(true);
    }
  }, [slug, data?.families.length]);

  const activeFamily = useMemo(
    () => data?.families.find((f) => f.id === activeFamilyId) ?? null,
    [data?.families, activeFamilyId]
  );

  const familyColors = useMemo(
    () => buildFamilyColorMap(data?.families ?? []),
    [data?.families]
  );

  const openSession = data?.sessions.find((s) => s.id === openSessionId) ?? null;

  function selectFamily(familyId: string) {
    setActiveFamilyId(slug, familyId);
    setActiveFamilyIdState(familyId);
    setShowPicker(false);
  }

  async function handleClaim(role: AssignmentRole, action: "claim" | "release") {
    if (!openSession || !activeFamilyId) return;
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: openSession.id,
        familyId: activeFamilyId,
        role,
        action,
        slug,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Could not update assignment");
      return;
    }
    await mutate();
  }

  async function handleSaveSchedule(values: {
    start_time: string;
    end_time: string;
    location_name: string;
    location_notes: string | null;
    dropoff_pickups: Record<string, string>;
    cancelled: boolean;
  }) {
    if (!openSession) return;
    const res = await fetch(`/api/sessions/${openSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      alert("Could not save schedule");
      return;
    }
    const updated = (await res.json()) as SessionWithAssignments;
    await mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          sessions: current.sessions.map((s) => (s.id === openSession.id ? { ...s, ...updated } : s)),
        };
      },
      { revalidate: true }
    );
  }

  function updateLocations(locations: SavedLocation[]) {
    void mutate({ ...data!, locations }, { revalidate: false });
  }

  function shiftWeek(delta: number) {
    if (!weekStart) return;
    const d = addDays(parseDateOnly(weekStart), delta * 7);
    let next = formatDateOnly(getMonday(d));
    const earliest = data?.earliestWeekStart;
    if (delta < 0 && earliest && next < earliest) {
      next = earliest;
    }
    setWeekStart(next);
  }

  const currentWeekStart = defaultWeekStartStr();
  const isCurrentWeek =
    !!weekStart && formatDateOnly(getMonday(parseDateOnly(weekStart))) === currentWeekStart;
  const earliestWeekStart = data?.earliestWeekStart;
  const isEarliestWeek = !!earliestWeekStart && !!weekStart && weekStart === earliestWeekStart;

  function goToCurrentWeek() {
    setWeekStart(currentWeekStart);
  }

  async function handleClearSlots() {
    if (!confirm("Clear all drop-off and pick-up slots for this week?")) return;
    setSlotsBusy(true);
    try {
      const res = await fetch(`/api/teams/${slug}/week/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear", weekStart }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Could not clear slots");
        return;
      }
      await mutate();
    } finally {
      setSlotsBusy(false);
    }
  }

  async function executeCopyFromLastWeek() {
    setShowCopyConfirm(false);
    setSlotsBusy(true);
    try {
      const res = await fetch(`/api/teams/${slug}/week/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy_previous", weekStart }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Could not copy schedule");
        return;
      }
      await mutate();
    } finally {
      setSlotsBusy(false);
    }
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        Could not load schedule. Check your connection or team link.
      </div>
    );
  }

  if (!weekStart || isLoading || !data) {
    return <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading week…</div>;
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-50 dark:bg-slate-900">
      <Header
        teamName={data.team.name}
        familyName={activeFamily?.name ?? null}
        onSwitchFamily={() => setShowPicker(true)}
        onManageTeam={() => setShowRename(true)}
      />

      <div className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col px-4 py-3 pb-[max(0.75rem,var(--safe-bottom))]">
        <div className="mb-2 flex shrink-0 items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            disabled={isEarliestWeek}
            className="touch-target-sm shrink-0 rounded-lg border border-slate-200 bg-white px-3 font-medium disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            ‹ Prev
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Week of {weekStart}
            </span>
            <button
              type="button"
              onClick={goToCurrentWeek}
              disabled={isCurrentWeek}
              className="touch-target-sm text-sm font-semibold text-sky-600 disabled:opacity-35 dark:text-sky-400"
            >
              This week
            </button>
          </div>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="touch-target-sm shrink-0 rounded-lg border border-slate-200 bg-white px-3 font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            Next ›
          </button>
        </div>

        <div className="mb-2 flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setShowLocations(true)}
            className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-sky-700 active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-sky-400 dark:active:bg-slate-700"
          >
            Edit locations
          </button>
          <button
            type="button"
            onClick={() => setShowTime(true)}
            className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-sky-700 active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-sky-400 dark:active:bg-slate-700"
          >
            Edit time
          </button>
        </div>

        <div className="mb-2 flex shrink-0 gap-2">
          <button
            type="button"
            disabled={slotsBusy}
            onClick={() => setShowCopyConfirm(true)}
            className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 active:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700"
          >
            Copy last week&apos;s schedule
          </button>
          <button
            type="button"
            disabled={slotsBusy}
            onClick={handleClearSlots}
            className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-red-600 active:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-red-400 dark:active:bg-slate-700"
          >
            Clear slots
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
          {data.sessions.map((session: SessionWithAssignments) => (
            <DayCard
              key={session.id}
              session={session}
              families={data.families}
              familyColors={familyColors}
              onOpen={() => setOpenSessionId(session.id)}
            />
          ))}
        </div>
      </div>

      {showCopyConfirm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <button
            type="button"
            className="flex-1"
            aria-label="Close"
            onClick={() => setShowCopyConfirm(false)}
          />
          <div className="rounded-t-2xl bg-white safe-bottom dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Copy last week&apos;s schedule?</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Clears this week&apos;s driver slots, then copies each day&apos;s location and time from the previous
                week. Driver assignments are not copied.
              </p>
            </div>
            <div className="flex gap-2 p-4 max-w-lg mx-auto">
              <button
                type="button"
                onClick={() => setShowCopyConfirm(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium dark:border-slate-600 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={slotsBusy}
                onClick={() => void executeCopyFromLastWeek()}
                className="flex-1 rounded-lg bg-sky-500 py-2.5 font-medium text-white disabled:opacity-50"
              >
                {slotsBusy ? "Copying…" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPicker && (
        <FamilyPicker families={data.families} familyColors={familyColors} onSelect={selectFamily} />
      )}

      {openSession && (
        <DaySheet
          session={openSession}
          teamName={data.team.name}
          families={data.families}
          familyColors={familyColors}
          locations={data.locations}
          activeFamilyId={activeFamilyId}
          activeFamilyName={activeFamily?.name ?? null}
          onClose={() => setOpenSessionId(null)}
          onManageLocations={() => setShowLocations(true)}
          onSaveSchedule={handleSaveSchedule}
          onClaim={handleClaim}
        />
      )}

      {showLocations && (
        <LocationsSheet
          locations={data.locations}
          slug={slug}
          weekStart={weekStart}
          onClose={() => setShowLocations(false)}
          onUpdated={(locations) => {
            updateLocations(locations);
          }}
          onWeekApplied={() => {
            void mutate();
          }}
        />
      )}

      {showTime && (
        <TimeSheet
          slug={slug}
          weekStart={weekStart}
          sessions={data.sessions}
          onClose={() => setShowTime(false)}
          onWeekApplied={() => {
            void mutate();
          }}
        />
      )}

      {showRename && (
        <RenameTeamSheet
          teamName={data.team.name}
          slug={slug}
          onClose={() => setShowRename(false)}
          onRenamed={(name) => {
            void mutate({ ...data, team: { ...data.team, name } }, { revalidate: false });
          }}
        />
      )}
    </div>
  );
}
