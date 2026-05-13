/**
 * Theme preference storage + helpers.
 *
 * Three preferences:
 *   - "auto"  follow the OS prefers-color-scheme media query
 *   - "light" force light theme
 *   - "dark"  force dark theme
 *
 * The actual `data-theme` attribute on <html> is always concrete (light or
 * dark); `resolvePreference` collapses "auto" using the current OS hint.
 */

export type ThemePreference = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const KEY = "polyglyph:theme";

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadPreference(storage: Storage | null = browserStorage()): ThemePreference {
  if (!storage) return "auto";
  const v = storage.getItem(KEY);
  if (v === "light" || v === "dark" || v === "auto") return v;
  return "auto";
}

export function savePreference(
  pref: ThemePreference,
  storage: Storage | null = browserStorage(),
): void {
  if (!storage) return;
  storage.setItem(KEY, pref);
}

export function resolvePreference(
  pref: ThemePreference,
  prefersLight: boolean,
): ResolvedTheme {
  if (pref === "auto") return prefersLight ? "light" : "dark";
  return pref;
}

export function nextPreference(pref: ThemePreference): ThemePreference {
  if (pref === "auto") return "light";
  if (pref === "light") return "dark";
  return "auto";
}
