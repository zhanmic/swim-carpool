"use client";

import { addDays, defaultWeekStartStr, formatDateOnly, getWeekStart, parseDateOnly } from "@/lib/dates";
import { buildFamilyColorMap } from "@/lib/familyColors";
import {
  clearActiveFamilyId,
  getActiveFamilyId,
  recordKnownTeam,
  removeKnownTeam,
  setActiveFamilyId,
} from "@/lib/storage";
import type { AssignmentRole, SavedLocation, SessionWithAssignments, WeekData } from "@/lib/types";
import useSWR from "swr";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DayCard } from "./DayCard";
import { DaySheet } from "./DaySheet";
import { AgentSheet } from "./AgentSheet";
import { AgentIcon } from "./AgentIcon";
import { FamilyPicker } from "./FamilyPicker";
import { Header } from "./Header";
import { LocationsSheet } from "./LocationsSheet";
import { RenameTeamSheet } from "./RenameTeamSheet";
import { TimeSheet } from "./TimeSheet";

class WeekFetchError extends Error {
  status: number;

  constructor(status: number) {
    super("Failed to fetch week");
    this.status = status;
  }
}

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) throw new WeekFetchError(r.status);
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
  const [showAgent, setShowAgent] = useState(false);
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

  useEffect(() => {
    if (data?.team) {
      recordKnownTeam(slug, data.team.name);
    }
  }, [data?.team, slug]);

  useEffect(() => {
    if (!(error instanceof WeekFetchError) || error.status !== 404) return;
    removeKnownTeam(slug);
    clearActiveFamilyId(slug);
  }, [error, slug]);

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

  async function handleSkip(action: "mark" | "clear") {
    if (!openSession || !activeFamilyId) return;
    const res = await fetch("/api/absences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: openSession.id,
        familyId: activeFamilyId,
        action,
        slug,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Could not update skip status");
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
  }): Promise<boolean> {
    if (!openSession) return false;
    const res = await fetch(`/api/sessions/${openSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      alert("Could not save schedule");
      return false;
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
    return true;
  }

  function updateLocations(locations: SavedLocation[]) {
    void mutate({ ...data!, locations }, { revalidate: false });
  }

  function shiftWeek(delta: number) {
    if (!weekStart) return;
    const d = addDays(parseDateOnly(weekStart), delta * 7);
    let next = formatDateOnly(getWeekStart(d));
    const earliest = data?.earliestWeekStart;
    if (delta < 0 && earliest && next < earliest) {
      next = earliest;
    }
    setWeekStart(next);
  }

  const currentWeekStart = defaultWeekStartStr();
  const isCurrentWeek =
    !!weekStart && formatDateOnly(getWeekStart(parseDateOnly(weekStart))) === currentWeekStart;
  const earliestWeekStart = data?.earliestWeekStart;
  const isEarliestWeek = !!earliestWeekStart && !!weekStart && weekStart === earliestWeekStart;

  function goToCurrentWeek() {
    setWeekStart(currentWeekStart);
  }

  async function handleClearSlots() {
    if (!confirm("Clear all drop-off and pick-up slots, notes, home pickup times, and skips for this week?")) return;
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

  if (error instanceof WeekFetchError && error.status === 404) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-slate-700 dark:text-slate-300">This team has been deleted.</p>
        <Link href="/" className="text-sm font-medium text-sky-600 dark:text-sky-400">
          Back to home
        </Link>
      </div>
    );
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
        teamSlug={slug}
        scheduleUrl={data.team.schedule_url}
        familyName={activeFamily?.name ?? null}
        familyId={activeFamilyId}
        familyColors={familyColors}
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
            <div className="flex h-11 w-full items-center justify-center">
              {isCurrentWeek ? (
                <span className="whitespace-nowrap text-sm font-semibold text-slate-600 dark:text-slate-300">
                  This week
                </span>
              ) : (
                <button
                  type="button"
                  onClick={goToCurrentWeek}
                  className="whitespace-nowrap text-sm font-semibold text-sky-600 dark:text-sky-400"
                >
                  Jump to this week
                </button>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setShowAgent(true)}
              aria-label="Schedule agent"
              title="Schedule agent"
              className="touch-target-sm relative flex items-center justify-center rounded-full text-violet-600 active:bg-violet-100 dark:text-violet-400 dark:active:bg-violet-950/60"
            >
              <span className="absolute inset-0 animate-ping-slow rounded-full bg-violet-400/20 dark:bg-violet-400/30" />
              <AgentIcon className="h-6 w-6 relative z-10" animated />
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="touch-target-sm shrink-0 rounded-lg border border-slate-200 bg-white px-3 font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              Next ›
            </button>
          </div>
        </div>

        <div className="mb-2 flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => setShowLocations(true)}
            className="touch-target-compact min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-medium text-sky-700 active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-sky-400 dark:active:bg-slate-700"
          >
            Locations
          </button>
          <button
            type="button"
            onClick={() => setShowTime(true)}
            className="touch-target-compact min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-medium text-sky-700 active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-sky-400 dark:active:bg-slate-700"
          >
            Time
          </button>
          <button
            type="button"
            disabled={slotsBusy}
            onClick={() => setShowCopyConfirm(true)}
            className="touch-target-compact min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-medium text-slate-700 active:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700"
          >
            Copy week
          </button>
          <button
            type="button"
            disabled={slotsBusy}
            onClick={handleClearSlots}
            className="touch-target-compact min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-medium text-red-600 active:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-red-400 dark:active:bg-slate-700"
          >
            Clear
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
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
          onSkip={handleSkip}
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

      {showAgent && (
        <AgentSheet
          slug={slug}
          weekStart={weekStart}
          activeFamilyId={activeFamilyId}
          activeFamilyName={activeFamily?.name ?? null}
          families={data.families}
          familyColors={familyColors}
          onClose={() => setShowAgent(false)}
          onScheduleChanged={() => {
            void mutate();
          }}
        />
      )}

      {showRename && (
        <RenameTeamSheet
          teamName={data.team.name}
          scheduleUrl={data.team.schedule_url}
          visibleDays={data.team.visible_days}
          hasDeletePassword={data.team.has_delete_password}
          families={data.families}
          slug={slug}
          onClose={() => setShowRename(false)}
          onUpdated={(team) => {
            void mutate({ ...data, team: { ...data.team, ...team } }, { revalidate: true });
          }}
          onFamiliesUpdated={(families) => {
            void mutate({ ...data, families }, { revalidate: true });
            if (activeFamilyId && !families.some((family) => family.id === activeFamilyId)) {
              clearActiveFamilyId(slug);
              setActiveFamilyIdState(null);
              setShowPicker(true);
            }
          }}
        />
      )}
    </div>
  );
}
