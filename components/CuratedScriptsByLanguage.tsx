/**
 * CuratedScriptsByLanguage — landing-page island that:
 *   1. shows a language picker chip strip (rendered above the list)
 *   2. swaps the underlying CuratedScripts items based on the selected
 *      language (no server round-trip — all 7 indexes were SSR'd)
 *
 * Imports only from script-grouping (pure helpers + types) so the
 * client bundle never pulls in node:fs.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { CuratedScripts } from "@/components/CuratedScripts";
import {
  DIALOGUE_LANG_STORAGE_KEY,
  DialogueLanguagePicker,
  type LanguageCounts,
} from "@/components/DialogueLanguagePicker";
import type { ScriptIndexItem } from "@/lib/data/script-grouping";
import type { Language } from "@/lib/data/schema";

const SUPPORTED_LANGUAGES: Language[] = [
  "en",
  "zh-tw",
  "ja",
  "ko",
  "it",
  "de",
  "es",
];

interface CuratedScriptsByLanguageProps {
  /** SSR'd: scripts per language. Empty array = no content yet. */
  itemsByLanguage: Record<string, ScriptIndexItem[]>;
}

function pickInitialLang(
  itemsByLanguage: Record<string, ScriptIndexItem[]>,
): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(DIALOGUE_LANG_STORAGE_KEY);
  if (
    stored &&
    SUPPORTED_LANGUAGES.includes(stored as Language) &&
    (itemsByLanguage[stored]?.length ?? 0) > 0
  ) {
    return stored as Language;
  }
  // Fallback to the first language with content; "en" if nothing.
  for (const lang of SUPPORTED_LANGUAGES) {
    if ((itemsByLanguage[lang]?.length ?? 0) > 0) return lang;
  }
  return "en";
}

export function CuratedScriptsByLanguage({
  itemsByLanguage,
}: CuratedScriptsByLanguageProps) {
  const [active, setActive] = useState<Language>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(pickInitialLang(itemsByLanguage));

    setHydrated(true);
  }, [itemsByLanguage]);

  const counts: LanguageCounts = useMemo(() => {
    const out = Object.fromEntries(
      SUPPORTED_LANGUAGES.map((l) => [l, itemsByLanguage[l]?.length ?? 0]),
    ) as LanguageCounts;
    return out;
  }, [itemsByLanguage]);

  const items = itemsByLanguage[active] ?? [];

  return (
    <div className="flex flex-col gap-3">
      <DialogueLanguagePicker
        active={active}
        counts={counts}
        onChange={setActive}
      />
      {/* Re-mount CuratedScripts on language switch so the fold/mode
          state for one language doesn't bleed into another. */}
      {hydrated ? (
        items.length > 0 ? (
          <CuratedScripts key={active} items={items} />
        ) : (
          <p className="rounded-xl bg-surface/40 px-4 py-3 text-sm text-fg-muted ring-1 ring-border">
            No scripts in this language yet. Pick another, or contribute
            one.
          </p>
        )
      ) : null}
    </div>
  );
}
