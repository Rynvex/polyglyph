/**
 * TDD spec for Stats — accuracy, combo, WPM accumulation.
 *
 * Mirrors the Python pytest spec; uses createStats() factory because Stats
 * is a value object (no class needed for this surface).
 */

import { describe, expect, test } from "vitest";
import { createStats, recordChar, tickStats, accuracy, wpm } from "@/lib/typing/stats";

describe("Stats", () => {
  test("starts with no input → accuracy 1", () => {
    const s = createStats();
    expect(accuracy(s)).toBe(1);
  });

  test("records correct char increments combo", () => {
    let s = createStats();
    s = recordChar(s, true);
    s = recordChar(s, true);
    expect(s.charsCorrect).toBe(2);
    expect(s.charsWrong).toBe(0);
    expect(s.combo).toBe(2);
    expect(s.maxCombo).toBe(2);
  });

  test("wrong char resets combo and tracks max", () => {
    let s = createStats();
    s = recordChar(s, true);
    s = recordChar(s, true);
    s = recordChar(s, true);
    s = recordChar(s, false);
    expect(s.combo).toBe(0);
    expect(s.maxCombo).toBe(3);
    expect(s.charsCorrect).toBe(3);
    expect(s.charsWrong).toBe(1);
  });

  test("accuracy = correct / total", () => {
    let s = createStats();
    for (let i = 0; i < 4; i++) s = recordChar(s, true);
    s = recordChar(s, false);
    expect(accuracy(s)).toBeCloseTo(4 / 5);
  });

  test("wpm before any tick is zero", () => {
    let s = createStats();
    for (let i = 0; i < 5; i++) s = recordChar(s, true);
    expect(wpm(s)).toBe(0);
  });

  test("wpm = (correct/5) / (elapsed/60)", () => {
    let s = createStats();
    for (let i = 0; i < 5; i++) s = recordChar(s, true);
    s = tickStats(s, 60);
    // 5 chars / 5 = 1 word, 60s / 60 = 1 minute → 1 WPM
    expect(wpm(s)).toBe(1);
  });

  test("recordChar returns a new object (immutability)", () => {
    const s = createStats();
    const s2 = recordChar(s, true);
    expect(s).not.toBe(s2);
    expect(s.charsCorrect).toBe(0);
    expect(s2.charsCorrect).toBe(1);
  });

  test("tickStats accumulates elapsed", () => {
    let s = createStats();
    s = tickStats(s, 1.5);
    s = tickStats(s, 0.5);
    expect(s.elapsedSec).toBeCloseTo(2.0);
  });
});
