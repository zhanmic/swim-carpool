"use client";

import { formatTime12 } from "@/lib/dates";
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
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const weekday = DAYS[date.getDay()];
  return `${weekday}, ${month} ${day}`;
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const weekday = SHORT_DAYS[date.getDay()];
  return `${weekday} ${month} ${day}`;
}

function formatDateParts(dateStr: string): { weekday: string; date: string } {
  const date = new Date(dateStr + "T00:00:00");
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = SHORT_DAYS[date.getDay()];
  return {
    weekday,
    date: `${month}/${day}`,
  };
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
            margin: 0.4in;
            size: letter portrait;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none;
          }
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          text-align: left;
        }
        th {
          background-color: #f1f5f9;
          font-weight: 600;
        }
      `}</style>

      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-4 flex items-baseline justify-between border-b-2 border-slate-800 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{data.team.name}</h1>
            <p className="text-xs text-slate-600">Week of {weekStart || new Date().toISOString().split("T")[0]}</p>
          </div>
          <p className="text-xs text-slate-500">Generated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="no-print mb-4 flex gap-2">
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

        {visibleSessions.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th style={{ width: "12%" }}>Date</th>
                <th style={{ width: "13%" }}>Time</th>
                <th style={{ width: "14%" }}>Location</th>
                <th style={{ width: "12%" }}>Drop-off</th>
                <th style={{ width: "12%" }}>Pick-up</th>
                <th style={{ width: "37%" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {visibleSessions.map((session) => {
                const dropoff = session.assignments.find((a) => a.role === "dropoff");
                const pickup = session.assignments.find((a) => a.role === "pickup");
                const skipping = session.absences || [];
                
                const homePickups = Object.entries(session.dropoff_pickups || {})
                  .map(([familyId, time]) => {
                    const family = data.families.find((f) => f.id === familyId);
                    return family && time ? `${family.name}: ${time}` : null;
                  })
                  .filter(Boolean);

                const notes = [
                  session.location_notes,
                  homePickups.length > 0 ? `Home: ${homePickups.join("; ")}` : null,
                  skipping.length > 0 ? `Skip: ${skipping.map((a) => a.family_name).join(", ")}` : null,
                ].filter(Boolean).join(" | ");

                const dateParts = formatDateParts(session.session_date);

                return (
                  <tr key={session.id} style={session.cancelled || session.no_practice ? { backgroundColor: "#fee2e2" } : undefined}>
                    <td className="text-sm">
                      <div className="font-medium">{dateParts.weekday}</div>
                      <div className="text-xs text-slate-600">{dateParts.date}</div>
                    </td>
                    <td className="text-xs">
                      <div>{formatTime12(session.start_time)}</div>
                      <div>{formatTime12(session.end_time)}</div>
                    </td>
                    <td className="text-sm">{session.location_name}</td>
                    <td className="text-sm">{dropoff?.family_name || "Open"}</td>
                    <td className="text-sm">{pickup?.family_name || "Open"}</td>
                    <td className="text-xs">
                      {session.no_practice && <strong className="text-red-700">NO PRACTICE </strong>}
                      {session.cancelled && <strong className="text-red-700">CANCELLED </strong>}
                      {notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="py-8 text-center text-slate-500">No practice sessions this week.</p>
        )}
      </div>
    </>
  );
}
