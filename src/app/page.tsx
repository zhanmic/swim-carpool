import Link from "next/link";
import { TeamList } from "@/components/TeamList";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ensureSchema, listTeams } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureSchema();
  const teams = await listTeams();

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-sky-50 to-white safe-top safe-bottom dark:from-slate-900 dark:to-slate-900">
      <main className="relative mx-auto w-full max-w-md flex-1 px-6 py-8 space-y-6">
        <div className="absolute right-0 top-8">
          <ThemeToggle />
        </div>

        <div className="text-center space-y-2">
          <div className="text-5xl" aria-hidden>
            🏊
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Swim Carpool</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Coordinate swim practice drop-offs and pick-ups with your team.
          </p>
        </div>

        <TeamList teams={teams} />

        <Link
          href="/setup"
          className="touch-target flex w-full items-center justify-center rounded-2xl bg-sky-500 px-6 text-lg font-semibold text-white shadow-sm active:bg-sky-600 dark:bg-sky-600 dark:active:bg-sky-500"
        >
          Create a team
        </Link>
      </main>
    </div>
  );
}
