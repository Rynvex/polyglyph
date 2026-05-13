/**
 * TypingSession — per-character state machine for an in-progress dialogue line.
 *
 * Pure value object: every public function returns a fresh session so React
 * can re-render via referential change. Logic depends only on the IME
 * protocol + the normalizer; no DOM, no React, no engine import.
 */

import type { InputMethod } from "./ime/types";
import { normalizePair } from "./normalizer";
import { createStats, recordChar, tickStats, type Stats } from "./stats";

export const CharState = {
  Pending: "pending",
  Correct: "correct",
  Wrong: "wrong",
} as const;
export type CharStateValue = (typeof CharState)[keyof typeof CharState];

export interface CharCell {
  readonly target: string;
  readonly state: CharStateValue;
  readonly typed: string;
}

export interface TypingSession {
  readonly target: string;
  readonly ime: InputMethod;
  readonly cells: readonly CharCell[];
  readonly cursor: number;
  readonly stats: Stats;
}

export function createSession(target: string, ime: InputMethod): TypingSession {
  const cells: CharCell[] = [];
  for (const ch of target) {
    cells.push({ target: ch, state: CharState.Pending, typed: "" });
  }
  return { target, ime, cells, cursor: 0, stats: createStats() };
}

export function inputChar(s: TypingSession, raw: string): TypingSession {
  let next = s;
  for (const ch of next.ime.feed(raw)) {
    next = consume(next, ch);
  }
  return next;
}

/**
 * Drain any IME composition buffer into the session. Called by the
 * controller right before commit so trailing kana/Hangul that the IME
 * was holding (waiting for "more input that will never come") get
 * placed in their cells. No-op for IMEs that don't implement flush().
 */
export function flushSession(s: TypingSession): TypingSession {
  if (typeof s.ime.flush !== "function") return s;
  let next = s;
  for (const ch of s.ime.flush()) {
    next = consume(next, ch);
  }
  return next;
}

export function backspace(s: TypingSession): TypingSession {
  if (s.cursor === 0) return s;
  const cursor = s.cursor - 1;
  const reset: CharCell = { target: s.cells[cursor].target, state: CharState.Pending, typed: "" };
  const cells = s.cells.slice();
  cells[cursor] = reset;
  return { ...s, cursor, cells };
}

/**
 * Cursor has reached the end of the line — sufficient for committing the
 * line on Enter. Wrong cells stay wrong (counted in stats / shown red) but
 * don't block forward progress.
 */
export function isFilled(s: TypingSession): boolean {
  return s.cursor >= s.cells.length;
}

/**
 * Filled AND every cell is correct — the "perfect run" check used for the
 * New Record badge and (in v1.0) Perfect achievements.
 */
export function isPerfect(s: TypingSession): boolean {
  return isFilled(s) && s.cells.every((c) => c.state === CharState.Correct);
}

/** @deprecated Prefer isPerfect; kept as an alias for backward compatibility. */
export function isComplete(s: TypingSession): boolean {
  return isPerfect(s);
}

export function tick(s: TypingSession, dt: number): TypingSession {
  return { ...s, stats: tickStats(s.stats, dt) };
}

function consume(s: TypingSession, ch: string): TypingSession {
  if (s.cursor >= s.cells.length) return s;
  const target = s.cells[s.cursor].target;
  const ok = normalizePair(ch, target);
  const newCell: CharCell = {
    target,
    state: ok ? CharState.Correct : CharState.Wrong,
    typed: ch,
  };
  const cells = s.cells.slice();
  cells[s.cursor] = newCell;
  return {
    ...s,
    cells,
    cursor: s.cursor + 1,
    stats: recordChar(s.stats, ok),
  };
}
