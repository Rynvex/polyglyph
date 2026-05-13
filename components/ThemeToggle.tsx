/**
 * ThemeToggle — cycles through Auto / Light / Dark.
 *
 * The actual data-theme attribute on <html> is set by the inline init
 * script in layout.tsx; this component reads/writes the stored preference
 * and re-applies the resolved theme. When in "auto" mode it also listens
 * for OS theme changes so the page tracks the system in real time.
 */

"use client";

import { useEffect, useState } from "react";
import {
  loadPreference,
  nextPreference,
  resolvePreference,
  savePreference,
  type ThemePreference,
} from "@/lib/theme/storage";

const ICONS: Record<ThemePreference, string> = {
  auto: "⊙",
  light: "☀",
  dark: "🌙",
};

const LABELS: Record<ThemePreference, string> = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
};

function applyTheme(pref: ThemePreference): void {
  if (typeof window === "undefined") return;
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const resolved = resolvePreference(pref, prefersLight);
  document.documentElement.dataset.theme = resolved;
}

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>("auto");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate initial preference from localStorage once.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPref(loadPreference());
     
    setHydrated(true);
  }, []);

  // While in auto mode, follow the OS color-scheme media query.
  useEffect(() => {
    if (pref !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [pref]);

  const cycle = () => {
    const next = nextPreference(pref);
    setPref(next);
    savePreference(next);
    applyTheme(next);
  };

  // Render a stable placeholder during SSR / pre-hydration so the toggle's
  // visible state doesn't flicker. Same pill shape as the real button.
  if (!hydrated) {
    return (
      <button
        type="button"
        aria-label="Theme"
        className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-muted ring-1 ring-border"
      >
        <span aria-hidden className="text-base leading-none">
          {ICONS.auto}
        </span>
        <span>{LABELS.auto}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycle}
      data-testid="theme-toggle"
      data-pref={pref}
      aria-label={`Theme: ${LABELS[pref]} (click to cycle Auto / Light / Dark)`}
      title={`Theme: ${LABELS[pref]} — click to cycle`}
      className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg ring-1 ring-border transition hover:bg-surface hover:ring-accent"
    >
      <span aria-hidden className="text-base leading-none">
        {ICONS[pref]}
      </span>
      <span>{LABELS[pref]}</span>
    </button>
  );
}
