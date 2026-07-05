import { HomeClient } from "@/components/HomeClient";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureSchema();
  const adminEnabled = !!process.env.ADMIN_PASSWORD;

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-sky-50 to-white safe-top safe-bottom dark:from-slate-900 dark:to-slate-900">
      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
        <div className="absolute right-0 top-8">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 flex-col space-y-6">
          <div className="space-y-2 text-center">
            <div className="text-5xl" aria-hidden>
              🏊
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Swim Carpool</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Coordinate swim practice drop-offs and pick-ups with your team.
            </p>
          </div>

          <div className="mt-auto flex flex-col space-y-6">
            <HomeClient adminEnabled={adminEnabled} />
          </div>
        </div>
      </main>
    </div>
  );
}
