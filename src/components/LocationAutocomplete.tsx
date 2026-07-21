"use client";

import type { PlaceSuggestion } from "@/lib/types";
import { useEffect, useId, useRef, useState } from "react";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search for a place…",
  autoFocus,
}: LocationAutocompleteProps) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!focused || value.trim().length < 2) {
      // Clearing results is part of driving the debounced search effect below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        if (res.ok) {
          setSuggestions(data.suggestions ?? []);
          setOpen((data.suggestions?.length ?? 0) > 0);
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [value, focused]);

  function pick(place: PlaceSuggestion) {
    onSelect(place);
    onChange(place.name);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true);
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-controls={listId}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base dark:border-slate-600"
      />
      {loading && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">
          …
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          {suggestions.map((place) => (
            <li key={place.address}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-sky-50 active:bg-sky-100 dark:hover:bg-sky-950 dark:active:bg-sky-900"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  pick(place);
                }}
              >
                <div className="font-medium text-slate-900 dark:text-slate-100">{place.name}</div>
                <div className="text-xs text-slate-500 line-clamp-2 dark:text-slate-400">{place.address}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
