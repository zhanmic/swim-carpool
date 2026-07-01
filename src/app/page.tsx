import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-white px-6 safe-top safe-bottom">
      <main className="w-full max-w-md text-center space-y-6">
        <div className="text-5xl" aria-hidden>
          🏊
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Swim Carpool</h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Coordinate swim practice drop-offs and pick-ups with your team — easier than a spreadsheet.
        </p>
        <Link
          href="/setup"
          className="touch-target inline-flex w-full items-center justify-center rounded-2xl bg-sky-500 px-6 text-lg font-semibold text-white shadow-sm active:bg-sky-600"
        >
          Create a team
        </Link>
        <p className="text-sm text-slate-500">
          Already have a link? Open it from your group chat or home screen.
        </p>
      </main>
    </div>
  );
}
