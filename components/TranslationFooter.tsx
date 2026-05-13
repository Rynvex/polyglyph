/**
 * TranslationFooter — global, always-visible banner with the two
 * translation toggles. Placed at the bottom of the viewport in the root
 * layout so learners can flip translations on/off from any page without
 * navigating to a settings screen.
 *
 * Setters dispatch `TRANSLATION_PREFS_EVENT`, which DialogueScene listens
 * for, so toggling here updates the in-flight conversation immediately.
 */

"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/Switch";
import {
  DEFAULT_TRANSLATION_PREFS,
  TRANSLATION_PREFS_EVENT,
  loadTranslationPrefs,
  setShowNpcTranslation,
  setShowPlayerTranslation,
  type TranslationPrefs,
} from "@/lib/data/translation-prefs";

export function TranslationFooter() {
  const [prefs, setPrefs] = useState<TranslationPrefs>(DEFAULT_TRANSLATION_PREFS);

  useEffect(() => {
    setPrefs(loadTranslationPrefs());
    const onChange = () => setPrefs(loadTranslationPrefs());
    window.addEventListener(TRANSLATION_PREFS_EVENT, onChange);
    return () => window.removeEventListener(TRANSLATION_PREFS_EVENT, onChange);
  }, []);

  const handleNpc = (next: boolean) => {
    setPrefs((p) => ({ ...p, showNpcTranslation: next }));
    setShowNpcTranslation(next);
  };
  const handlePlayer = (next: boolean) => {
    setPrefs((p) => ({ ...p, showPlayerTranslation: next }));
    setShowPlayerTranslation(next);
  };

  return (
    <footer
      data-testid="translation-footer"
      className="fixed bottom-0 left-0 right-0 z-30 flex h-10 w-full items-center justify-center gap-5 border-t border-accent/30 bg-accent/10 px-4 text-xs text-fg backdrop-blur-md"
    >
      <span className="hidden text-fg-muted sm:inline">Translation</span>
      <label className="inline-flex items-center gap-2">
        <Switch
          checked={prefs.showNpcTranslation}
          onChange={handleNpc}
          label="Show NPC translation"
        />
        <span>NPC</span>
      </label>
      <label className="inline-flex items-center gap-2">
        <Switch
          checked={prefs.showPlayerTranslation}
          onChange={handlePlayer}
          label="Show your translation"
        />
        <span>You</span>
      </label>
    </footer>
  );
}
