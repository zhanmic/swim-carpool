"use client";

import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { TimeInput } from "@/components/TimeInput";
import { recordKnownTeam } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [familiesText, setFamiliesText] = useState("Emily\nEmma\nRia");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("05:45");
  const [endTime, setEndTime] = useState("08:15");
  const [deletePassword, setDeletePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const families = familiesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!locationName.trim()) {
      setError("Practice location is required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          families,
          location_name: locationName.trim(),
          location_address: locationAddress,
          start_time: startTime,
          end_time: endTime,
          delete_password: deletePassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create team");
        return;
      }

      recordKnownTeam(data.team.secret_slug, data.team.name);
      router.push(`/c/${data.team.secret_slug}`);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 safe-top safe-bottom dark:bg-slate-900">
      <div className="relative mx-auto max-w-md px-4 py-8">
        <div className="absolute right-0 top-8">
          <ThemeToggle />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2 dark:text-slate-100">Set up your team</h1>
        <p className="text-slate-600 mb-6 dark:text-slate-400">One-time setup. Share the link with your carpool group.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Team name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sharks Swim Team"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base dark:border-slate-600"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Families (one per line)</span>
            <textarea
              required
              rows={5}
              value={familiesText}
              onChange={(e) => setFamiliesText(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base font-mono dark:border-slate-600"
            />
          </label>

          <div className="block">
            <span className="text-sm font-medium text-slate-700">Practice location</span>
            <p className="mt-0.5 text-xs text-slate-500">Search for your pool or practice site.</p>
            <div className="mt-1">
              <LocationAutocomplete
                value={locationName}
                onChange={(value) => {
                  setLocationName(value);
                  if (!value.trim()) setLocationAddress(null);
                }}
                onSelect={(place) => {
                  setLocationName(place.name);
                  setLocationAddress(place.address);
                }}
                placeholder="e.g. Bethlehem Central High School"
              />
            </div>
            {locationAddress && (
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{locationAddress}</p>
            )}
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Deletion password (optional)</span>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Used only to delete this team later"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base dark:border-slate-600"
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Not shown again after creation. You can change it later in team settings.
            </p>
          </label>

          <div className="flex flex-wrap gap-3">
            <label className="block shrink-0">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Start time</span>
              <TimeInput
                required
                value={startTime}
                onChange={setStartTime}
                className="mt-0.5 block w-[6.75rem] rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
            <label className="block shrink-0">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">End time</span>
              <TimeInput
                required
                value={endTime}
                onChange={setEndTime}
                className="mt-0.5 block w-[6.75rem] rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !locationName.trim()}
            className="touch-target w-full rounded-xl bg-sky-500 text-white font-semibold disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create team & get link"}
          </button>
        </form>
      </div>
    </div>
  );
}
