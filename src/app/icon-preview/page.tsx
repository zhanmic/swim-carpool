import type { ReactNode } from "react";
import {
  AGENT_ICON_VARIANTS,
  AgentIconVariant,
} from "@/components/AgentIconVariants";

export default function AgentIconPreviewPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-900">
      <div className="mx-auto max-w-lg">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Agent icon options</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Shown at button size on light, dark, sky, and violet backgrounds.
        </p>

        <div className="mt-6 grid gap-4">
          {AGENT_ICON_VARIANTS.map((variant) => (
            <div
              key={variant.id}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{variant.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{variant.description}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">{variant.id}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <Swatch label="Light" className="bg-white text-slate-700">
                  <AgentIconVariant id={variant.id} className="h-5 w-5" />
                </Swatch>
                <Swatch label="Sky" className="bg-white text-sky-600">
                  <AgentIconVariant id={variant.id} className="h-5 w-5" />
                </Swatch>
                <Swatch label="Violet" className="bg-white text-violet-600">
                  <AgentIconVariant id={variant.id} className="h-5 w-5" />
                </Swatch>
                <Swatch label="Dark" className="bg-slate-800 text-slate-100">
                  <AgentIconVariant id={variant.id} className="h-5 w-5" />
                </Swatch>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-500">In nav (current placement):</span>
                <button
                  type="button"
                  className="touch-target-sm flex items-center justify-center rounded-full text-sky-600 active:bg-sky-100 dark:text-sky-400 dark:active:bg-sky-950/60"
                >
                  <AgentIconVariant id={variant.id} className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="touch-target-sm flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-sky-700 dark:border-slate-600 dark:bg-slate-800 dark:text-sky-400"
                >
                  <AgentIconVariant id={variant.id} className="mr-1.5 h-4 w-4" />
                  Ask
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Swatch({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-slate-200 py-3 dark:border-slate-600 ${className}`}>
      {children}
      <span className="mt-1.5 text-[10px] text-slate-500">{label}</span>
    </div>
  );
}
