import { AgentIcon } from "@/components/AgentIcon";

export default function ChatButtonPreviewPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-lg space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Chat button animation</h1>
          <p className="mt-1 text-sm text-slate-400">
            Circling tip with a color-changing trailing tail around the bubble edge.
          </p>
          <p className="mt-1 font-mono text-[10px] text-slate-500">/preview/chat-button</p>
        </header>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Nav size (current)
          </p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              type="button"
              aria-label="Schedule agent"
              className="touch-target-sm flex items-center justify-center rounded-full active:bg-slate-800"
            >
              <AgentIcon className="h-6 w-6" animated />
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100"
            >
              <AgentIcon className="h-5 w-5" animated />
              Ask
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Large (easier to see the trail)
          </p>
          <div className="mt-6 flex items-center justify-center">
            <AgentIcon className="h-28 w-28" animated />
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            On light surface
          </p>
          <div className="mt-4 flex items-center justify-center rounded-lg bg-slate-50 py-8">
            <AgentIcon className="h-16 w-16" animated />
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Static (no animation)
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <AgentIcon className="h-10 w-10" />
            <AgentIcon className="h-10 w-10" animated />
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-500">left: static · right: animated</p>
        </section>
      </div>
    </div>
  );
}
