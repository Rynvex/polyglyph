/**
 * DialogueLanguagePicker — small chip strip that lets the user pick the
 * dialogue language they want to practice. Languages with zero scripts
 * are rendered as disabled chips so the user can see the gap without
 * being blocked from the available ones.
 *
 * The active choice is persisted to localStorage. Reading it back at
 * landing-page mount happens in the parent (so SSR doesn't render the
 * wrong language for one frame).
 */

"use client";

import type { Language } from "@/lib/data/schema";

const STORAGE_KEY = "polyglyph:dialogue-target-lang";

const LABEL: Record<Language, string> = {
  en: "English",
  "zh-tw": "中文",
  ja: "日本語",
  ko: "한국어",
  it: "Italiano",
  de: "Deutsch",
  es: "Español",
};

const ORDER: Language[] = ["en", "zh-tw", "ja", "ko", "it", "de", "es"];

export type LanguageCounts = Record<Language, number>;

interface DialogueLanguagePickerProps {
  active: Language;
  counts: LanguageCounts;
  onChange: (lang: Language) => void;
}

export function DialogueLanguagePicker({
  active,
  counts,
  onChange,
}: DialogueLanguagePickerProps) {
  const handleClick = (lang: Language): void => {
    if (counts[lang] === 0) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    onChange(lang);
  };

  return (
    <div
      className="flex flex-wrap gap-1.5"
      data-testid="dialogue-language-picker"
    >
      {ORDER.map((lang) => {
        const count = counts[lang] ?? 0;
        const enabled = count > 0;
        const isActive = lang === active;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => handleClick(lang)}
            disabled={!enabled}
            aria-pressed={isActive}
            className={`rounded-full px-3 py-1 text-xs transition ${
              isActive
                ? "bg-accent text-white"
                : enabled
                  ? "bg-surface-2 text-fg-muted ring-1 ring-border hover:text-fg"
                  : "cursor-not-allowed bg-surface-2/40 text-fg-faint ring-1 ring-border/50"
            }`}
          >
            {LABEL[lang]} <span className="opacity-70">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

export const DIALOGUE_LANG_STORAGE_KEY = STORAGE_KEY;
