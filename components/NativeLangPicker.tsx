/**
 * NativeLangPicker — small client island that lets the user pick which
 * language hints / prompts should appear in. The choice is persisted
 * under `polyglyph:native-lang` and reused by vocab + dialogue. On
 * first visit we seed the picker from `navigator.language` if it
 * matches a supported native.
 */

"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_NATIVE_LANG,
  loadNativeLang,
  NATIVE_LANG_KEY,
  saveNativeLang,
} from "@/lib/data/lang-prefs";

const LANG_LABEL: Record<string, string> = {
  en: "English",
  "zh-tw": "繁體中文",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  it: "Italiano",
  de: "Deutsch",
};

/** Languages the user can choose as native. Same set as the practice
 * targets — dialogue translations only ship hint_zh today, so non-zh
 * users fall back to that hint per F7 in OPEN_ISSUES.md. */
const NATIVE_LANGUAGES = ["en", "zh-tw", "ja", "ko", "es", "it", "de"];

/** Guess a sensible default from `navigator.language` so first-time
 * visitors don't always see English. Returns the first supported
 * native that matches `navigator.language` by prefix; otherwise null. */
function guessFromNavigator(): string | null {
  if (typeof navigator === "undefined") return null;
  const raw = navigator.language?.toLowerCase();
  if (!raw) return null;
  // Exact match first (handles "zh-tw").
  if (NATIVE_LANGUAGES.includes(raw)) return raw;
  // Then prefix.
  const prefix = raw.split("-")[0];
  if (NATIVE_LANGUAGES.includes(prefix)) return prefix;
  return null;
}

interface NativeLangPickerProps {
  /** Optional className for layout integration. */
  className?: string;
}

export function NativeLangPicker({ className }: NativeLangPickerProps) {
  const [value, setValue] = useState<string>(DEFAULT_NATIVE_LANG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Decide initial value:
    //   1. Existing localStorage value (loadNativeLang handles legacy migration)
    //   2. navigator.language guess
    //   3. Default
    /* eslint-disable react-hooks/set-state-in-effect */
    if (typeof window === "undefined") {
      setHydrated(true);
      return;
    }
    const existing = window.localStorage.getItem(NATIVE_LANG_KEY);
    if (existing && NATIVE_LANGUAGES.includes(existing)) {
      setValue(existing);
      setHydrated(true);
      return;
    }
    const loaded = loadNativeLang();
    if (NATIVE_LANGUAGES.includes(loaded) && existing) {
      setValue(loaded);
    } else {
      const guessed = guessFromNavigator() ?? DEFAULT_NATIVE_LANG;
      setValue(guessed);
      saveNativeLang(guessed);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function onChange(next: string): void {
    setValue(next);
    saveNativeLang(next);
  }

  if (!hydrated) {
    return (
      <div
        aria-hidden
        data-testid="native-lang-picker-skeleton"
        className={className}
      />
    );
  }

  return (
    <label
      data-testid="native-lang-picker"
      className={`flex items-center gap-2 text-xs text-fg-faint ${className ?? ""}`}
    >
      <span className="uppercase tracking-[0.18em]">I read in</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Native language for hints and prompts"
        className="rounded-md bg-surface-2 px-2 py-1 text-sm text-fg ring-1 ring-border transition focus:outline-none focus:ring-accent"
      >
        {NATIVE_LANGUAGES.map((l) => (
          <option key={l} value={l}>
            {LANG_LABEL[l] ?? l}
          </option>
        ))}
      </select>
    </label>
  );
}
