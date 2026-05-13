/**
 * TDD spec for TypingSession — the core state machine.
 *
 * Pinned down:
 * - Per-cell state transitions (PENDING → CORRECT/WRONG)
 * - Cursor advances on input
 * - Backspace rewinds and clears state
 * - Completion only when all cells CORRECT
 * - Stats accumulate inside the session
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
  CharState,
  createSession,
  inputChar,
  backspace,
  isComplete,
  isFilled,
  isPerfect,
  tick,
} from "@/lib/typing/engine";
import type { TypingSession } from "@/lib/typing/engine";
import { DirectIME } from "@/lib/typing/ime/direct";

let session: (target: string) => TypingSession;

beforeEach(() => {
  session = (target) => createSession(target, new DirectIME());
});

describe("starting state", () => {
  test("starts with all cells pending and cursor at 0", () => {
    const s = session("hi");
    expect(s.cursor).toBe(0);
    expect(s.cells.every((c) => c.state === CharState.Pending)).toBe(true);
  });
});

describe("correct input", () => {
  test("typing a correct char marks it CORRECT and advances cursor", () => {
    let s = session("hi");
    s = inputChar(s, "h");
    expect(s.cells[0].state).toBe(CharState.Correct);
    expect(s.cursor).toBe(1);
  });

  test("typing the full target completes the session", () => {
    let s = session("hi");
    for (const ch of "hi") s = inputChar(s, ch);
    expect(isComplete(s)).toBe(true);
  });

  test("input after completion is ignored", () => {
    let s = session("hi");
    for (const ch of "hi") s = inputChar(s, ch);
    s = inputChar(s, "x");
    expect(s.cursor).toBe(2);
    expect(isComplete(s)).toBe(true);
  });
});

describe("wrong input", () => {
  test("a wrong char marks WRONG but cursor still advances", () => {
    let s = session("hi");
    s = inputChar(s, "x");
    expect(s.cells[0].state).toBe(CharState.Wrong);
    expect(s.cursor).toBe(1);
  });

  test("any wrong cell prevents completion", () => {
    let s = session("hi");
    s = inputChar(s, "x");
    s = inputChar(s, "i");
    expect(s.cursor).toBe(2);
    expect(isComplete(s)).toBe(false);
  });
});

describe("backspace", () => {
  test("backspace at start is a no-op", () => {
    let s = session("hi");
    s = backspace(s);
    expect(s.cursor).toBe(0);
    expect(s.cells[0].state).toBe(CharState.Pending);
  });

  test("backspace rewinds cursor and resets the cell", () => {
    let s = session("hi");
    s = inputChar(s, "h");
    s = backspace(s);
    expect(s.cursor).toBe(0);
    expect(s.cells[0].state).toBe(CharState.Pending);
  });

  test("backspace after a wrong char lets the user retry", () => {
    let s = session("hi");
    s = inputChar(s, "x");
    s = backspace(s);
    s = inputChar(s, "h");
    expect(s.cells[0].state).toBe(CharState.Correct);
    expect(s.cursor).toBe(1);
  });
});

describe("forgiving normalization", () => {
  test("case-insensitive match", () => {
    let s = session("Hi");
    s = inputChar(s, "h");
    expect(s.cells[0].state).toBe(CharState.Correct);
  });

  test("accent-insensitive match", () => {
    let s = session("café");
    for (const ch of "cafe") s = inputChar(s, ch);
    expect(s.cells.every((c) => c.state === CharState.Correct)).toBe(true);
    expect(isComplete(s)).toBe(true);
  });
});

describe("stats inside session", () => {
  test("records correct vs wrong char counts", () => {
    let s = session("hi");
    s = inputChar(s, "h");
    s = inputChar(s, "x");
    expect(s.stats.charsCorrect).toBe(1);
    expect(s.stats.charsWrong).toBe(1);
  });

  test("combo resets on a wrong char", () => {
    let s = session("hello");
    for (const ch of "hel") s = inputChar(s, ch);
    expect(s.stats.combo).toBe(3);
    s = inputChar(s, "x");
    expect(s.stats.combo).toBe(0);
    expect(s.stats.maxCombo).toBe(3);
  });

  test("tick accumulates elapsed and feeds wpm", () => {
    let s = session("hello");
    for (const ch of "hello") s = inputChar(s, ch);
    s = tick(s, 60);
    // 5 correct → 1 word ÷ 1 minute = 1 wpm
    expect(s.stats.elapsedSec).toBe(60);
  });

  test("immutability: inputChar returns a new session object", () => {
    const s = session("hi");
    const s2 = inputChar(s, "h");
    expect(s).not.toBe(s2);
    expect(s.cursor).toBe(0);
    expect(s2.cursor).toBe(1);
  });
});

describe("isFilled vs isPerfect", () => {
  test("isFilled: true once cursor reaches end, regardless of wrong cells", () => {
    let s = session("hi");
    s = inputChar(s, "xx"); // 2 wrong, cursor at end
    expect(isFilled(s)).toBe(true);
  });

  test("isFilled: false when cursor is mid-line", () => {
    let s = session("hello");
    s = inputChar(s, "he");
    expect(isFilled(s)).toBe(false);
  });

  test("isPerfect: false when there are wrong cells", () => {
    let s = session("hi");
    s = inputChar(s, "xx");
    expect(isPerfect(s)).toBe(false);
  });

  test("isPerfect: true when filled and every cell is correct", () => {
    let s = session("hi");
    s = inputChar(s, "hi");
    expect(isPerfect(s)).toBe(true);
  });

  test("isComplete is an alias for isPerfect (back-compat)", () => {
    let s = session("hi");
    s = inputChar(s, "hi");
    expect(isComplete(s)).toBe(true);
    s = session("hi");
    s = inputChar(s, "xx");
    expect(isComplete(s)).toBe(false);
  });
});

describe("multi-token input", () => {
  test("inputChar accepts multi-char strings (IME commits)", () => {
    let s = session("hi there");
    s = inputChar(s, "hi t");
    expect(s.cursor).toBe(4);
    expect(s.cells.slice(0, 4).every((c) => c.state === CharState.Correct)).toBe(true);
  });
});
