/**
 * TDD spec for controller-level aggregated stats.
 *
 * Per-session stats live on each TypingSession; the controller folds them
 * into `totalStats` on every commit so the settlement screen can read a
 * single accumulated score for the whole dialogue.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  commitController,
  createController,
  elapsedSec,
  submitInput,
} from "@/lib/dialogue/controller";
import type { Dialogue } from "@/lib/data/schema";
import { DirectIME } from "@/lib/typing/ime/direct";

function dlg(turns: unknown[]): Dialogue {
  return {
    schema_version: 1,
    id: "test",
    language: "en",
    level: "A1",
    topic: "daily",
    title: "Test",
    tags: [],
    turns,
  } as unknown as Dialogue;
}

const player = (id: string, text: string) => ({
  id,
  speaker: "player",
  templates: [{ id: `${id}.0`, text, weight: 1 }],
});

describe("totalStats", () => {
  test("starts zeroed", () => {
    const c = createController(dlg([player("p1", "hi")]), new DirectIME());
    expect(c.totalStats.charsCorrect).toBe(0);
    expect(c.totalStats.charsWrong).toBe(0);
    expect(c.totalStats.maxCombo).toBe(0);
  });

  test("does NOT advance until commit, even if line is fully typed", () => {
    let c = createController(dlg([player("p1", "hi")]), new DirectIME());
    c = submitInput(c, "hi");
    // No commit → totalStats still zero (live stats sit on the active session).
    expect(c.totalStats.charsCorrect).toBe(0);
    expect(c.currentSession?.stats.charsCorrect).toBe(2);
  });

  test("commit folds the session stats into totalStats", () => {
    let c = createController(dlg([player("p1", "hi")]), new DirectIME());
    c = submitInput(c, "hi");
    c = commitController(c);
    expect(c.totalStats.charsCorrect).toBe(2);
    expect(c.totalStats.charsWrong).toBe(0);
  });

  test("accumulates across multiple committed turns", () => {
    let c = createController(
      dlg([player("p1", "hi"), player("p2", "yo")]),
      new DirectIME(),
    );
    c = submitInput(c, "hi");
    c = commitController(c);
    c = submitInput(c, "yo");
    c = commitController(c);
    expect(c.totalStats.charsCorrect).toBe(4);
  });

  test("maxCombo across the dialogue is the per-turn maximum", () => {
    let c = createController(
      dlg([player("p1", "hello"), player("p2", "hi")]),
      new DirectIME(),
    );
    c = submitInput(c, "hello");
    c = commitController(c);
    c = submitInput(c, "hi");
    c = commitController(c);
    // Best streak was 5 chars in turn 1.
    expect(c.totalStats.maxCombo).toBe(5);
  });

  test("wrong chars contribute to charsWrong (commit is allowed even with mistakes)", () => {
    let c = createController(dlg([player("p1", "hi")]), new DirectIME());
    c = submitInput(c, "xx"); // 2 wrong, cursor at end
    c = commitController(c);
    expect(c.totalStats.charsCorrect).toBe(0);
    expect(c.totalStats.charsWrong).toBe(2);
  });
});

describe("elapsedSec", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T12:00:00Z"));
  });

  test("is zero immediately at create time", () => {
    const c = createController(dlg([player("p1", "hi")]), new DirectIME());
    expect(elapsedSec(c)).toBe(0);
  });

  test("reflects wall-clock seconds since createController", () => {
    const c = createController(dlg([player("p1", "hi")]), new DirectIME());
    vi.advanceTimersByTime(45_000);
    expect(elapsedSec(c)).toBeCloseTo(45);
  });
});
