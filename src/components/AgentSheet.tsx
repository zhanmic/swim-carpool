"use client";

import type { AgentProposedPlan, AgentResponseBody } from "@/lib/agent/types";
import { useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  plan?: AgentProposedPlan;
}

interface AgentSheetProps {
  slug: string;
  weekStart: string;
  activeFamilyId: string | null;
  onClose: () => void;
  onScheduleChanged: () => void;
}

export function AgentSheet({
  slug,
  weekStart,
  activeFamilyId,
  onClose,
  onScheduleChanged,
}: AgentSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Tell me what to change — e.g. “Emily drop-off Friday” or “clear the week”.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function postAgent(body: Record<string, unknown>): Promise<AgentResponseBody> {
    const res = await fetch(`/api/teams/${slug}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error ?? "Agent request failed");
    }
    return data as AgentResponseBody;
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setError(null);
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");

    try {
      const data = await postAgent({
        message: trimmed,
        week_start: weekStart,
        active_family_id: activeFamilyId,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply,
          plan: data.proposed_plan,
        },
      ]);
      if (data.week_mutated) onScheduleChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent request failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(plan: AgentProposedPlan, approved: boolean) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const data = await postAgent({
        week_start: weekStart,
        active_family_id: activeFamilyId,
        confirm: { token: plan.token, approved },
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply },
      ]);
      if (data.week_mutated) onScheduleChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="flex max-h-[85dvh] flex-col rounded-t-2xl bg-white safe-bottom dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Schedule agent</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Gemini</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 dark:text-slate-400"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.text}</p>
              {message.plan && (
                <div className="mt-2 space-y-2 border-t border-slate-200/60 pt-2 dark:border-slate-600">
                  <p className="text-xs font-medium">{message.plan.summary}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleConfirm(message.plan!, true)}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleConfirm(message.plan!, false)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {busy && <p className="text-xs text-slate-500 dark:text-slate-400">Thinking…</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <form
          className="border-t border-slate-200 px-4 py-3 dark:border-slate-700"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(input);
          }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="e.g. Emma pick-up Friday"
              disabled={busy}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="shrink-0 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
