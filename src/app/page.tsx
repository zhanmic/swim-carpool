import Link from "next/link";
import { ensureSchema, listTeams } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureSchema();
  const teams = await listTeams();

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-sky-50 to-white safe-top safe-bottom">
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl" aria-hidden>
            🏊
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Swim Carpool</h1>
          <p className="text-slate-600">
            Coordinate swim practice drop-offs and pick-ups with your team.
          </p>
        </div>

        {teams.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Teams
            </h2>
            <ul className="space-y-2">
              {teams.map((team) => (
                <li key={team.id}>
                  <Link
                    href={`/c/${team.secret_slug}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm active:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-900">{team.name}</span>
                    <span className="text-sky-600 text-sm font-medium">Open ›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link
          href="/setup"
          className="touch-target flex w-full items-center justify-center rounded-2xl bg-sky-500 px-6 text-lg font-semibold text-white shadow-sm active:bg-sky-600"
        >
          Create a team
        </Link>
      </main>
    </div>
  );
}
