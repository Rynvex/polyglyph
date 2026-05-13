/**
 * VocabController — pure traversal of a vocab deck practice session.
 *
 * Mirrors DialogueController's design: an immutable controller object that
 * exposes the current TypingSession and accumulated stats; pure helpers
 * advance the state. Each card = one TypingSession with the target language
 * word as target.
 */

import type { Concept, Deck, Translation } from "@/lib/data/vocab/schema";
import {
  backspace as engineBackspace,
  CharState,
  createSession,
  flushSession,
  inputChar,
  isFilled,
  type CharCell,
  type TypingSession,
} from "@/lib/typing/engine";
import type { InputMethod } from "@/lib/typing/ime/types";
import { createStats, type Stats } from "@/lib/typing/stats";

export interface VocabCard {
  /** Concept being practiced — the language-independent semantic atom. */
  concept: Concept;
  /** Translation in the target language — what the user types. */
  translation: Translation;
  /**
   * Translation in the user's native language — what they read as the cue.
   * Null when no nativePrompts map was supplied or no native translation
   * exists for this concept.
   */
  nativePrompt: Translation | null;
}

export interface CompletedCard {
  card: VocabCard;
  cells: readonly CharCell[];
}

export interface VocabController {
  readonly deck: Deck;
  readonly language: string;
  readonly cards: readonly VocabCard[];
  readonly ime: InputMethod;
  readonly cardIdx: number;
  readonly currentSession: TypingSession | null;
  readonly completed: readonly CompletedCard[];
  readonly isFinished: boolean;
  readonly totalStats: Stats;
  readonly startedAtMs: number;
}

export interface ControllerInputs {
  deck: Deck;
  language: string;
  concepts: ReadonlyMap<string, Concept>;
  translations: ReadonlyMap<string, Translation>;
  /**
   * Optional native-language translations keyed by conceptId. When present,
   * each card carries a nativePrompt the UI can show as the cue. When
   * absent, nativePrompt stays null and the UI falls back to the concept id.
   */
  nativePrompts?: ReadonlyMap<string, Translation>;
  ime: InputMethod;
  /** When true, the resulting card list is randomly permuted. Default
   * false preserves the deck's natural order (aiueo for hiragana,
   * frequency for vocab). Useful once a learner already knows the set
   * and wants real retrieval practice. */
  shuffle?: boolean;
  /** Inject a custom RNG for deterministic tests. Defaults to Math.random. */
  random?: () => number;
}

/**
 * Build the ordered list of cards from a deck + concept/translation maps.
 * Concepts that lack a translation in the target language are skipped
 * silently — the deck author shouldn't have to enumerate every supported
 * language.
 *
 * When `shuffle` is true the cards are permuted via Fisher-Yates with
 * the supplied `random` (or Math.random).
 */
export function buildCards(inputs: ControllerInputs): VocabCard[] {
  const { deck, concepts, translations, nativePrompts, shuffle, random } =
    inputs;
  const cards: VocabCard[] = [];
  for (const conceptId of deck.conceptIds) {
    const concept = concepts.get(conceptId);
    const translation = translations.get(conceptId);
    if (!concept || !translation) continue;
    const nativePrompt = nativePrompts?.get(conceptId) ?? null;
    cards.push({ concept, translation, nativePrompt });
  }
  if (!shuffle) return cards;
  const rng = random ?? Math.random;
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createController(inputs: ControllerInputs): VocabController {
  const cards = buildCards(inputs);
  const seed: VocabController = {
    deck: inputs.deck,
    language: inputs.language,
    cards,
    ime: inputs.ime,
    cardIdx: 0,
    currentSession: null,
    completed: [],
    isFinished: cards.length === 0,
    totalStats: createStats(),
    startedAtMs: Date.now(),
  };
  return advance(seed);
}

export function elapsedSec(c: VocabController): number {
  return (Date.now() - c.startedAtMs) / 1000;
}

export function submitInput(c: VocabController, raw: string): VocabController {
  if (c.currentSession === null) return c;
  return { ...c, currentSession: inputChar(c.currentSession, raw) };
}

export function commitController(c: VocabController): VocabController {
  if (c.currentSession === null) return c;
  // Drain any IME composition buffer so trailing kana / Hangul lands.
  const drained = flushSession(c.currentSession);
  if (!isFilled(drained)) {
    if (drained === c.currentSession) return c;
    return { ...c, currentSession: drained };
  }
  const card = c.cards[c.cardIdx];
  const completed: CompletedCard[] = [
    ...c.completed,
    { card, cells: [...drained.cells] },
  ];
  const folded = foldStats(c.totalStats, drained.stats);
  return advance({
    ...c,
    cardIdx: c.cardIdx + 1,
    currentSession: null,
    completed,
    totalStats: folded,
  });
}

export function backspaceController(c: VocabController): VocabController {
  if (c.currentSession === null) return c;
  return { ...c, currentSession: engineBackspace(c.currentSession) };
}

export function resetCard(c: VocabController): VocabController {
  if (c.currentSession === null) return c;
  return {
    ...c,
    currentSession: createSession(c.currentSession.target, c.ime),
  };
}

function foldStats(total: Stats, sessionStats: Stats): Stats {
  return {
    charsCorrect: total.charsCorrect + sessionStats.charsCorrect,
    charsWrong: total.charsWrong + sessionStats.charsWrong,
    combo: 0,
    maxCombo: Math.max(total.maxCombo, sessionStats.maxCombo),
    elapsedSec: total.elapsedSec + sessionStats.elapsedSec,
  };
}

function advance(c: VocabController): VocabController {
  if (c.cardIdx >= c.cards.length) {
    return { ...c, currentSession: null, isFinished: true };
  }
  const card = c.cards[c.cardIdx];
  return {
    ...c,
    currentSession: createSession(card.translation.text, c.ime),
    isFinished: false,
  };
}

/** Convenience: flatten completed cards into "perfect" / "had typos" stats. */
export function tallyMastery(c: VocabController): {
  total: number;
  perfect: number;
  flagged: number;
} {
  let perfect = 0;
  let flagged = 0;
  for (const entry of c.completed) {
    if (entry.cells.some((cell) => cell.state === CharState.Wrong)) {
      flagged += 1;
    } else {
      perfect += 1;
    }
  }
  return { total: c.completed.length, perfect, flagged };
}
