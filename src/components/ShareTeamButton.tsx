"use client";

import { shareTeamLink } from "@/lib/shareTeam";
import { useState } from "react";

interface ShareTeamButtonProps {
  slug: string;
  teamName: string;
  variant?: "icon" | "text";
  className?: string;
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

export function ShareTeamButton({ slug, teamName, variant = "text", className = "" }: ShareTeamButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleShare() {
    try {
      const result = await shareTeamLink(slug, teamName);
      if (result === "cancelled") return;
      setFeedback(result === "copied" ? "Copied" : "Shared");
      setTimeout(() => setFeedback(null), 2000);
    } catch {
      setFeedback("Failed");
      setTimeout(() => setFeedback(null), 2000);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => void handleShare()}
        aria-label={feedback ?? `Share ${teamName} link`}
        title={feedback ?? "Share team link"}
        className={`touch-target-sm rounded-full text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800 ${className}`}
      >
        <ShareIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className={`shrink-0 border-l border-slate-200 px-3 text-sm font-medium text-sky-600 active:bg-sky-50 dark:border-slate-700 dark:text-sky-400 dark:active:bg-sky-950 ${className}`}
    >
      {feedback ?? "Share"}
    </button>
  );
}
