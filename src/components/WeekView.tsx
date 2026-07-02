"use client";

import { addDays, defaultWeekStartStr, formatDateOnly, getMonday, parseDateOnly } from "@/lib/dates";
import { getActiveFamilyId, setActiveFamilyId } from "@/lib/storage";
import { formatWeekSummary } from "@/lib/summary";
import type { AssignmentRole, SessionWithAssignments, WeekData } from "@/lib/types";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { DayCard } from "./DayCard";
import { DaySheet } from "./DaySheet";
import { FamilyPicker } from "./FamilyPicker";
import { Header } from "./Header";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed to fetch");
  return r.json() as Promise<WeekData>;
});

interface WeekViewProps {
  slug: string;
  initialWeekStart?: string;
}

export function WeekView({ slug, initialWeekStart }: WeekViewProps) {
  const [weekStart, setWeekStart] = useState(initialWeekStart ?? defaultWeekStartStr());
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<WeekData>(
    `/api/teams/${slug}/week?start=${weekStart}`,
    fetcher,
    { refreshInterval: 15000 }
  );

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

  const openSession = data?.sessions.find((s) => s.id === openSessionId) ?? null;

  function selectFamily(familyId: string) {
    setActiveFamilyId(slug, familyId);
    setActiveFamilyIdState(familyId);
    setShowPicker(false);
  }

  async function handleClaim(role: AssignmentRole, action: "claim" | "unclaim") {
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
    location_notes: string;
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
    await mutate();
  }

  async function copySummary() {
    if (!data) return;
    const text = formatWeekSummary(data.team, data.sessions, data.weekStart);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shiftWeek(delta: number) {
    const d = addDays(parseDateOnly(weekStart), delta * 7);
    setWeekStart(formatDateOnly(getMonday(d)));
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        Could not load schedule. Check your connection or team link.
      </div>
    );
  }

  if (isLoading || !data) {
    return <div className="p-6 text-center text-slate-500">Loading week…</div>;
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Header
        teamName={data.team.name}
        familyName={activeFamily?.name ?? null}
        onSwitchFamily={() => setShowPicker(true)}
      />

      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => shiftWeek(-1)} className="touch-target-sm rounded-lg border border-slate-200 bg-white px-3 font-medium">
            ‹ Prev
          </button>
          <span className="text-sm font-medium text-slate-600">Week of {weekStart}</span>
          <button type="button" onClick={() => shiftWeek(1)} className="touch-target-sm rounded-lg border border-slate-200 bg-white px-3 font-medium">
            Next ›
          </button>
        </div>

        <button
          type="button"
          onClick={copySummary}
          className="touch-target w-full rounded-xl border border-sky-200 bg-sky-50 text-sky-800 font-medium"
        >
          {copied ? "Copied!" : "Copy week summary for iMessage"}
        </button>

        <div className="flex flex-col gap-3">
          {data.sessions.map((session: SessionWithAssignments) => (
            <DayCard key={session.id} session={session} onOpen={() => setOpenSessionId(session.id)} />
          ))}
        </div>
      </div>

      {showPicker && (
        <FamilyPicker families={data.families} onSelect={selectFamily} />
      )}

      {openSession && (
        <DaySheet
          session={openSession}
          families={data.families}
          activeFamilyId={activeFamilyId}
          activeFamilyName={activeFamily?.name ?? null}
          onClose={() => setOpenSessionId(null)}
          onSaveSchedule={handleSaveSchedule}
          onClaim={handleClaim}
        />
      )}
    </div>
  );
}
