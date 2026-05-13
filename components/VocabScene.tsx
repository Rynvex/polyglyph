/**
 * VocabScene — top-level interactive view for vocab deck practice.
 *
 * Layout mirrors DialogueScene but flatter: a single card prompt + typing
 * panel, with progress bar above. Keyboard routing matches dialogue
 * (Enter commit, Backspace correct, Alt+R reset, Esc exit, R play-again
 * on summary).
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CapsLockWarning } from "@/components/CapsLockWarning";
import { DialogueProgress } from "@/components/DialogueProgress";
import { TypingPanel } from "@/components/TypingPanel";
import { VocabCard } from "@/components/VocabCard";
import { VocabSummary } from "@/components/VocabSummary";
import type { Concept, Deck, Translation } from "@/lib/data/vocab/schema";
import { createImeForLanguage } from "@/lib/typing/ime/factory";
import type { Language } from "@/lib/data/schema";
import {
  backspaceController,
  commitController,
  createController,
  elapsedSec,
  resetCard,
  submitInput,
  tallyMastery,
  type VocabController,
} from "@/lib/vocab/controller";

const SHUFFLE_KEY = "polyglyph:vocab-shuffle";

interface VocabSceneProps {
  deck: Deck;
  language: string;
  nativeLang?: string | null;
  concepts: ReadonlyMap<string, Concept>;
  translations: ReadonlyMap<string, Translation>;
  nativePrompts?: ReadonlyMap<string, Translation> | null;
  onExit?: () => void;
}

export function VocabScene({
  deck,
  language,
  nativeLang,
  concepts,
  translations,
  nativePrompts,
  onExit,
}: VocabSceneProps) {
  const ime = useMemo(
    () => createImeForLanguage(language as Language),
    [language],
  );
  // Shuffle preference is persisted globally — switching decks keeps your
  // preference, and it survives reloads. Default ON because once a learner
  // is past initial introduction the fixed deck order (aiueo for hiragana,
  // by-frequency for vocab) becomes a memory crutch that hurts recall.
  const [shuffle, setShuffle] = useState<boolean>(true);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SHUFFLE_KEY);
      if (raw === "0") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShuffle(false);
      }
    } catch {
      // localStorage unavailable; keep default
    }
  }, []);
  const buildInputs = useCallback(
    () => ({
      deck,
      language,
      concepts,
      translations,
      nativePrompts: nativePrompts ?? undefined,
      ime,
      shuffle,
    }),
    [deck, language, concepts, translations, nativePrompts, ime, shuffle],
  );
  const [controller, setController] = useState<VocabController>(() =>
    createController(buildInputs()),
  );
  const [capsLockOn, setCapsLockOn] = useState(false);
  const ref = useRef(controller);

  useEffect(() => {
    ref.current = controller;
  }, [controller]);

  const handlePlayAgain = useCallback(() => {
    setController(createController(buildInputs()));
  }, [buildInputs]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      setCapsLockOn(e.getModifierState("CapsLock"));

      if (e.key === "Escape") {
        e.preventDefault();
        onExit?.();
        return;
      }

      if (ref.current.isFinished) {
        if (e.key === "Enter" || e.key === "r" || e.key === "R") {
          e.preventDefault();
          handlePlayAgain();
        }
        return;
      }

      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        setController(resetCard(ref.current));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        setController(commitController(ref.current));
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setController(backspaceController(ref.current));
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setController(submitInput(ref.current, e.key));
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onExit, handlePlayAgain]);

  if (controller.isFinished) {
    const mastery = tallyMastery(controller);
    return (
      <div className="flex-1 overflow-y-auto">
        <VocabSummary
          deckTitle={deck.title}
          language={language}
          completed={controller.completed}
          perfect={mastery.perfect}
          flagged={mastery.flagged}
          durationSec={elapsedSec(controller)}
          onPlayAgain={handlePlayAgain}
        />
      </div>
    );
  }

  const card = controller.cards[controller.cardIdx];
  const total = controller.cards.length;

  const handleToggleShuffle = () => {
    setShuffle((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SHUFFLE_KEY, next ? "1" : "0");
      } catch {
        // ignore — preference is best-effort
      }
      return next;
    });
    // Rebuild controller so the new setting takes effect on next card.
    // Existing progress on the current session is intentionally discarded
    // — a fresh shuffle = a fresh attempt at the deck.
    setController(
      createController({
        deck,
        language,
        concepts,
        translations,
        nativePrompts: nativePrompts ?? undefined,
        ime,
        shuffle: !shuffle,
      }),
    );
  };

  return (
    <>
      <DialogueProgress current={controller.cardIdx} total={total} />
      <div className="flex flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-1 items-stretch px-4 py-6">
          {card ? (
            <VocabCard
              key={card.concept.id}
              concept={card.concept}
              translation={card.translation}
              nativePrompt={card.nativePrompt}
              language={language}
              nativeLang={nativeLang ?? null}
            />
          ) : null}
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-end gap-2 px-4 py-2 text-xs text-fg-faint">
          <span>Order:</span>
          <button
            type="button"
            onClick={handleToggleShuffle}
            aria-pressed={shuffle}
            data-testid="shuffle-toggle"
            className={`rounded-full px-3 py-1 ring-1 transition ${
              shuffle
                ? "bg-accent/20 text-accent ring-accent"
                : "bg-surface-2 text-fg-muted ring-border hover:text-fg"
            }`}
          >
            🔀 Random
          </button>
          <button
            type="button"
            onClick={shuffle ? handleToggleShuffle : undefined}
            aria-pressed={!shuffle}
            className={`rounded-full px-3 py-1 ring-1 transition ${
              !shuffle
                ? "bg-accent/20 text-accent ring-accent"
                : "bg-surface-2 text-fg-muted ring-border hover:text-fg"
            }`}
          >
            ↓ Sequential
          </button>
        </div>
      </div>
      <div className="border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-3">
          <CapsLockWarning active={capsLockOn} />
          {controller.currentSession ? (
            <TypingPanel
              session={controller.currentSession}
              hintZh={card?.concept.notes}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
