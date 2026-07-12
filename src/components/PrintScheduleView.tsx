"use client";

import { formatTime } from "@/lib/dates";
import type { SessionWithAssignments } from "@/lib/types";
import { useEffect, useState } from "react";

interface PrintScheduleViewProps {
  slug: string;
  weekStart?: string;
}

interface WeekData {
  team: {
    name: string;
    visible_days: number[];
  };
  families: Array<{
    id: string;
    name: string;
    home_label: string | null;
  }>;
  sessions: SessionWithAssignments[];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const weekday = DAYS[date.getDay()];
  return `${weekday}, ${month} ${day}`;
}

export function PrintScheduleView({ slug, weekStart }: PrintScheduleViewProps) {
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const start = weekStart || new Date().toISOString().split("T")[0];
        const res = await fetch(`/api/teams/${slug}/week?start=${start}`);
        if (!res.ok) throw new Error("Failed to load schedule");
        const json = await res.json();
        setData(json);
        setLoading(false);
        setTimeout(() => window.print(), 500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      }
    }
    void load();
  }, [slug, weekStart]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading schedule...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">{error || "Schedule not found"}</p>
      </div>
    );
  }

  const visibleSessions = data.sessions.filter((session) => {
    const date = new Date(session.session_date + "T00:00:00");
    return data.team.visible_days.includes(date.getDay());
  });

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 0.5in;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none;
          }
        }
      `}</style>

      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 border-b-2 border-slate-800 pb-4">
          <h1 className="text-3xl font-bold text-slate-900">{data.team.name}</h1>
          <p className="mt-1 text-sm text-slate-600">Practice Schedule</p>
        </div>

        <div className="no-print mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-6">
          {visibleSessions.map((session) => {
            const dropoff = session.assignments.find((a) => a.role === "dropoff");
            const pickup = session.assignments.find((a) => a.role === "pickup");
            const skipping = session.absences || [];

            return (
              <div key={session.id} className="border-b border-slate-300 pb-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {formatDate(session.session_date)}
                  </h2>
                  {session.cancelled && (
                    <span className="text-sm font-medium text-red-600">CANCELLED</span>
                  )}
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="flex gap-2">
                    <span className="w-24 font-medium text-slate-700">Time:</span>
                    <span className="text-slate-900">
                      {formatTime(session.start_time)} – {formatTime(session.end_time)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <span className="w-24 font-medium text-slate-700">Location:</span>
                    <span className="text-slate-900">{session.location_name}</span>
                  </div>

                  {session.location_notes && (
                    <div className="flex gap-2">
                      <span className="w-24 font-medium text-slate-700">Notes:</span>
                      <span className="text-slate-900">{session.location_notes}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <span className="w-24 font-medium text-slate-700">Drop-off:</span>
                    <span className="text-slate-900">
                      {dropoff?.family_name || "Open"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <span className="w-24 font-medium text-slate-700">Pick-up:</span>
                    <span className="text-slate-900">
                      {pickup?.family_name || "Open"}
                    </span>
                  </div>

                  {Object.keys(session.dropoff_pickups || {}).length > 0 && (
                    <div className="flex gap-2">
                      <span className="w-24 font-medium text-slate-700">Home Pickups:</span>
                      <div className="flex-1">
                        {Object.entries(session.dropoff_pickups).map(([familyId, time]) => {
                          const family = data.families.find((f) => f.id === familyId);
                          if (!family || !time) return null;
                          return (
                            <div key={familyId} className="text-slate-900">
                              {family.name}: {time}
                              {family.home_label && (
                                <span className="ml-1 text-slate-600">({family.home_label})</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {skipping.length > 0 && (
                    <div className="flex gap-2">
                      <span className="w-24 font-medium text-slate-700">Skipping:</span>
                      <span className="text-slate-900">
                        {skipping.map((a) => a.family_name).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {visibleSessions.length === 0 && (
          <p className="py-8 text-center text-slate-500">No practice sessions this week.</p>
        )}

        <div className="mt-8 border-t border-slate-300 pt-4 text-xs text-slate-500">
          <p>Generated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </>
  );
}
