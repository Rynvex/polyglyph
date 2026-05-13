/**
 * VocabCard — prompt panel shown above the typing target. Displays the
 * concept's emoji (or icon fallback) and the native-language cue, plus
 * a speak button that pronounces the target word via Web Speech.
 *
 * The card occupies the vertical space between the progress bar and
 * the typing panel — emoji is the visual anchor (`text-7xl` on
 * desktop, scaled down on narrow viewports), prompt text follows
 * underneath. The speak button floats top-right so it never competes
 * with the hero visual.
 */

"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Concept, Translation } from "@/lib/data/vocab/schema";
import { createSpeaker, isSpeechAvailable } from "@/lib/audio/web-speech";

interface VocabCardProps {
  concept: Concept;
  translation: Translation;
  nativePrompt?: Translation | null;
  language: string;
  nativeLang?: string | null;
  /** Auto-pronounce when card mounts (true by default). */
  autoSpeak?: boolean;
}

export function VocabCard({
  concept,
  translation,
  nativePrompt,
  language,
  nativeLang,
  autoSpeak = true,
}: VocabCardProps) {
  const speaker = useMemo(() => createSpeaker(), []);
  const available = useMemo(() => isSpeechAvailable(), []);
  const lastSpokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!autoSpeak || !available) return;
    if (lastSpokenRef.current === translation.text) return;
    lastSpokenRef.current = translation.text;
    void speaker.speak(translation.text, { lang: language, rate: 0.9 }).catch(() => {
      // ignore — synthesis errors shouldn't block typing flow
    });
    return () => speaker.cancel();
  }, [autoSpeak, available, language, speaker, translation.text]);

  const handleSpeak = () => {
    void speaker.speak(translation.text, { lang: language, rate: 0.9 }).catch(() => {});
  };

  // Letter cards (alphabet drill) render the native glyph as the hero
  // visual with the romaji target as a small label. No emoji frame,
  // no nativePrompt fallback — the character IS the lesson.
  if (concept.kind === "letter") {
    return (
      <div
        data-testid="vocab-card-letter"
        className="relative flex h-full w-full flex-col items-center justify-center gap-6 rounded-3xl bg-surface/60 px-6 py-10 ring-1 ring-border"
      >
        {available ? (
          <button
            type="button"
            onClick={handleSpeak}
            aria-label={`Pronounce ${translation.text}`}
            className="absolute right-5 top-5 rounded-full bg-surface-2 px-3 py-2 text-sm text-fg ring-1 ring-border transition hover:bg-accent/15 hover:text-accent"
          >
            🔊
          </button>
        ) : null}
        <span
          aria-hidden
          className="text-[clamp(6rem,22vw,14rem)] font-semibold leading-none text-fg"
          lang={language}
        >
          {concept.emoji ?? "·"}
        </span>
        <div className="flex flex-col items-center gap-1">
          <span
            data-testid="letter-romaji"
            className="text-[clamp(1.25rem,3vw,1.75rem)] font-mono text-fg-muted"
          >
            {translation.text}
          </span>
          <span className="text-[11px] uppercase tracking-[0.25em] text-fg-faint">
            {concept.category}
          </span>
        </div>
      </div>
    );
  }

  // Prefer the native cue when present; otherwise fall back to the
  // concept id (English keyword baked into the data model).
  const promptText = nativePrompt?.text ?? concept.id;
  const promptLang = nativePrompt ? (nativeLang ?? null) : "en";
  const promptNotes = nativePrompt?.notes ?? translation.notes;

  return (
    <div
      data-testid="vocab-card"
      className="relative flex h-full w-full flex-col items-center justify-center gap-8 rounded-3xl bg-surface/60 px-6 py-10 ring-1 ring-border"
    >
      {available ? (
        <button
          type="button"
          onClick={handleSpeak}
          aria-label={`Pronounce ${translation.text}`}
          className="absolute right-5 top-5 rounded-full bg-surface-2 px-3 py-2 text-sm text-fg ring-1 ring-border transition hover:bg-accent/15 hover:text-accent"
        >
          🔊
        </button>
      ) : null}
      <div
        aria-hidden
        className="flex aspect-square w-[clamp(7rem,28vw,12rem)] items-center justify-center rounded-3xl bg-surface-2 text-[clamp(3.5rem,12vw,6rem)] leading-none"
      >
        {concept.emoji ?? "·"}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-[11px] uppercase tracking-[0.25em] text-fg-faint">
          {concept.category}
          {promptLang ? ` · ${promptLang}` : ""}
        </span>
        <span
          className="text-[clamp(1.5rem,4vw,2.25rem)] font-semibold leading-tight text-fg"
          lang={promptLang ?? undefined}
        >
          {promptText}
        </span>
        {promptNotes ? (
          <span className="max-w-md text-sm text-fg-muted">{promptNotes}</span>
        ) : null}
      </div>
    </div>
  );
}
