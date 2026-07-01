"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [familiesText, setFamiliesText] = useState("Smith\nChen\nPatel\nLee");
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

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, families }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create team");
        return;
      }

      router.push(`/c/${data.team.secret_slug}`);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 safe-top safe-bottom">
      <div className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Set up your team</h1>
        <p className="text-slate-600 mb-6">One-time setup. Share the link with your carpool group.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Team name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sharks Swim Team"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Families (one per line)</span>
            <textarea
              required
              rows={5}
              value={familiesText}
              onChange={(e) => setFamiliesText(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base font-mono"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="touch-target w-full rounded-xl bg-sky-500 text-white font-semibold disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create team & get link"}
          </button>
        </form>
      </div>
    </div>
  );
}
