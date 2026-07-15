"use client";

import { getFamilyColor, type FamilyColorClasses } from "@/lib/familyColors";
import type { Family } from "@/lib/types";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ShareTeamButton } from "./ShareTeamButton";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  teamName: string;
  teamSlug: string;
  scheduleUrl?: string | null;
  familyName: string | null;
  familyId?: string | null;
  familyColors?: Map<string, FamilyColorClasses>;
  weekStart?: string;
  families: Family[];
  onSwitchFamily: (familyId: string) => void;
  onManageTeam?: () => void;
}

export function Header({
  teamName,
  teamSlug,
  scheduleUrl,
  familyName,
  familyId,
  familyColors,
  weekStart,
  families,
  onSwitchFamily,
  onManageTeam,
}: HeaderProps) {
  const familyColor = getFamilyColor(familyColors ?? new Map(), familyId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollKey, setScrollKey] = useState(0);
  const titleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLButtonElement | HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (textRef.current && titleRef.current) {
        const textWidth = textRef.current.scrollWidth;
        const containerWidth = titleRef.current.clientWidth;
        setShouldScroll(textWidth > containerWidth);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [teamName]);

  useEffect(() => {
    if (!shouldScroll) return;
    
    const interval = setInterval(() => {
      setScrollKey((prev) => prev + 1);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [shouldScroll]);

  function handlePrint() {
    const printUrl = `/c/${teamSlug}/print${weekStart ? `?start=${weekStart}` : ""}`;
    window.open(printUrl, "_blank");
  }

  function handleFamilySelect(selectedFamilyId: string) {
    onSwitchFamily(selectedFamilyId);
    setDropdownOpen(false);
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur pt-[max(0.25rem,var(--safe-top))] dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto max-w-lg px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="All teams"
            className="touch-target-sm shrink-0 flex items-center justify-center text-slate-600 active:text-slate-900 dark:text-slate-400 dark:active:text-slate-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
          <div ref={titleRef} className="min-w-0 flex-1 overflow-hidden text-center">
            {shouldScroll && (
              <style>
                {`
                  @keyframes marquee-${scrollKey} {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                  }
                  .marquee-scroll-${scrollKey} {
                    animation: marquee-${scrollKey} 8s linear forwards;
                  }
                `}
              </style>
            )}
            {onManageTeam ? (
              <button
                ref={textRef as React.RefObject<HTMLButtonElement>}
                type="button"
                onClick={onManageTeam}
                className={`block w-full text-base font-semibold text-sky-700 underline decoration-sky-400/70 underline-offset-2 active:text-sky-900 dark:text-sky-400 dark:decoration-sky-500/70 dark:active:text-sky-300 ${
                  shouldScroll ? `marquee-scroll-${scrollKey} whitespace-nowrap` : "truncate"
                }`}
              >
                {shouldScroll ? `${teamName}  •  ${teamName}` : teamName}
              </button>
            ) : (
              <div
                ref={textRef as React.RefObject<HTMLDivElement>}
                className={`text-base font-semibold text-slate-900 dark:text-slate-100 ${
                  shouldScroll ? `marquee-scroll-${scrollKey} whitespace-nowrap` : "truncate"
                }`}
              >
                {shouldScroll ? `${teamName}  •  ${teamName}` : teamName}
              </div>
            )}
            {scheduleUrl && (
              <a
                href={scheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-[11px] font-normal text-sky-600 active:text-sky-800 dark:text-sky-400 dark:active:text-sky-300"
              >
                Official schedule →
              </a>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <ShareTeamButton slug={teamSlug} teamName={teamName} variant="icon" />
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print schedule"
              title="Print schedule"
              className="touch-target-sm flex items-center justify-center text-slate-600 active:text-slate-900 dark:text-slate-400 dark:active:text-slate-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M6 9V2h12v7" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <path d="M6 14h12v8H6z" />
              </svg>
            </button>
            <ThemeToggle />
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium active:opacity-80 ${
                  familyColor?.pill ?? "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                }`}
              >
                {familyName ?? "Select family"} ›
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Pick family as driver</p>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto p-1">
                    {families.map((family) => {
                      const color = getFamilyColor(familyColors ?? new Map(), family.id);
                      const isActive = family.id === familyId;
                      return (
                        <button
                          key={family.id}
                          type="button"
                          onClick={() => handleFamilySelect(family.id)}
                          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm active:bg-slate-100 dark:active:bg-slate-700 ${
                            isActive
                              ? "bg-slate-50 font-medium dark:bg-slate-700"
                              : "font-normal"
                          }`}
                        >
                          {color && (
                            <span
                              aria-hidden
                              className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.swatch}`}
                            />
                          )}
                          <span className="min-w-0 flex-1 truncate text-slate-900 dark:text-slate-100">
                            {family.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
