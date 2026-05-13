/**
 * TDD spec for DialogueController — pure dialogue traversal.
 *
 * Pinned down:
 * - Bot turns auto-skip and become spoken history
 * - Player turn opens a TypingSession on templates[0]
 * - Typing the full target does NOT auto-advance — explicit `commit` is required
 * - `commit` only advances when the session is fully correct (no wrong cells)
 *
 * Linear traversal; `template.next` pointer routing is a v1.0 concern.
 */

import { describe, expect, test } from "vitest";
import {
  backspaceController,
  commitController,
  createController,
  resetLine,
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

const bot = (id: string, text: string) => ({ id, speaker: "bot", text });
const player = (id: string, ...texts: string[]) => ({
  id,
  speaker: "player",
  templates: texts.map((t, i) => ({ id: `${id}.${i}`, text: t, weight: 1 })),
});

describe("DialogueController — startup + bot auto-advance", () => {
  test("starts at first turn — opens session for player turn", () => {
    const c = createController(dlg([player("p1", "hi")]), new DirectIME());
    expect(c.isFinished).toBe(false);
    expect(c.currentSession?.target).toBe("hi");
  });

  test("auto-advances past leading bot turns", () => {
    const c = createController(
      dlg([bot("b1", "Hello"), bot("b2", "How are you?"), player("p1", "fine")]),
      new DirectIME(),
    );
    expect(c.spokenBotTurns.map((t) => t.id)).toEqual(["b1", "b2"]);
    expect(c.currentSession?.target).toBe("fine");
  });

  test("player turn opens TypingSession with templates[0]", () => {
    const c = createController(
      dlg([player("p1", "first choice", "second choice")]),
      new DirectIME(),
    );
    expect(c.currentSession?.target).toBe("first choice");
  });
});

describe("DialogueController — typing without auto-commit", () => {
  test("typing the full target does NOT auto-advance", () => {
    let c = createController(dlg([player("p1", "hi"), bot("b1", "Cool")]), new DirectIME());
    c = submitInput(c, "hi");
    // Session is fully typed but still active — waiting for explicit commit.
    expect(c.currentSession).not.toBeNull();
    expect(c.currentSession?.cursor).toBe(2);
    expect(c.completedPlayerTurns).toHaveLength(0);
    expect(c.spokenBotTurns).toHaveLength(0);
    expect(c.isFinished).toBe(false);
  });

  test("partial input keeps session open and unconfirmed", () => {
    let c = createController(dlg([player("p1", "hi")]), new DirectIME());
    c = submitInput(c, "h");
    expect(c.currentSession?.cursor).toBe(1);
    expect(c.completedPlayerTurns).toHaveLength(0);
  });

  test("typing past target length is ignored (engine guarantee)", () => {
    let c = createController(dlg([player("p1", "hi")]), new DirectIME());
    c = submitInput(c, "hixyz");
    expect(c.currentSession?.cursor).toBe(2);
  });

  test("immutability: submitInput returns a fresh controller", () => {
    const c = createController(dlg([player("p1", "hi")]), new DirectIME());
    const c2 = submitInput(c, "h");
    expect(c).not.toBe(c2);
    expect(c.currentSession?.cursor).toBe(0);
    expect(c2.currentSession?.cursor).toBe(1);
  });
});

describe("DialogueController — commit gating", () => {
  test("commit advances when target is fully and correctly typed", () => {
    let c = createController(
      dlg([player("p1", "hi"), bot("b1", "Cool"), player("p2", "yo")]),
      new DirectIME(),
    );
    c = submitInput(c, "hi");
    c = commitController(c);
    expect(c.completedPlayerTurns.map((e) => e.turn.id)).toEqual(["p1"]);
    expect(c.spokenBotTurns.map((t) => t.id)).toEqual(["b1"]);
    expect(c.currentSession?.target).toBe("yo");
  });

  test("commit is a no-op when the session is incomplete", () => {
    let c = createController(dlg([player("p1", "hi")]), new DirectIME());
    c = submitInput(c, "h"); // partial
    const before = c;
    c = commitController(c);
    expect(c.currentSession?.cursor).toBe(1);
    expect(c.completedPlayerTurns).toHaveLength(0);
    // Should be referentially equal because nothing changed.
    expect(c).toBe(before);
  });

  test("commit ADVANCES even with wrong cells once cursor reaches the end", () => {
    let c = createController(
      dlg([player("p1", "hi"), bot("b1", "Cool")]),
      new DirectIME(),
    );
    c = submitInput(c, "xx"); // 2 wrong cells, cursor at end
    c = commitController(c);
    // The user moves on; mistakes are recorded but didn't block them.
    expect(c.completedPlayerTurns).toHaveLength(1);
    expect(c.totalStats.charsWrong).toBe(2);
    expect(c.totalStats.charsCorrect).toBe(0);
    expect(c.spokenBotTurns.map((t) => t.id)).toEqual(["b1"]);
  });

  test("commit is a no-op when finished", () => {
    let c = createController(dlg([player("p1", "hi")]), new DirectIME());
    c = submitInput(c, "hi");
    c = commitController(c);
    expect(c.isFinished).toBe(true);
    const after = commitController(c);
    expect(after.isFinished).toBe(true);
  });

  test("dialogue finishes only after the last commit", () => {
    let c = createController(dlg([player("p1", "hi"), bot("b1", "Bye")]), new DirectIME());
    c = submitInput(c, "hi");
    expect(c.isFinished).toBe(false);
    c = commitController(c);
    expect(c.isFinished).toBe(true);
    expect(c.currentSession).toBeNull();
    expect(c.spokenBotTurns.map((t) => t.id)).toEqual(["b1"]);
  });

  test("commit then submit on the next turn works as expected", () => {
    let c = createController(dlg([player("p1", "hi"), player("p2", "yo")]), new DirectIME());
    c = submitInput(c, "hi");
    c = commitController(c);
    c = submitInput(c, "yo");
    c = commitController(c);
    expect(c.completedPlayerTurns.map((e) => e.turn.id)).toEqual(["p1", "p2"]);
    expect(c.isFinished).toBe(true);
  });
});

describe("DialogueController — resetLine", () => {
  test("clears all cells and resets cursor on the active session", () => {
    let c = createController(dlg([player("p1", "hi")]), new DirectIME());
    c = submitInput(c, "xx");
    expect(c.currentSession?.cursor).toBe(2);
    c = resetLine(c);
    expect(c.currentSession?.cursor).toBe(0);
    expect(c.currentSession?.cells.every((cell) => cell.state === "pending")).toBe(true);
  });

  test("does NOT advance the dialogue (still on same turn)", () => {
    let c = createController(
      dlg([player("p1", "hi"), player("p2", "yo")]),
      new DirectIME(),
    );
    c = submitInput(c, "xx");
    c = resetLine(c);
    expect(c.currentSession?.target).toBe("hi");
    expect(c.completedPlayerTurns).toHaveLength(0);
  });

  test("is a no-op when there is no current session", () => {
    let c = createController(dlg([player("p1", "hi")]), new DirectIME());
    c = submitInput(c, "hi");
    c = commitController(c);
    expect(c.isFinished).toBe(true);
    const after = resetLine(c);
    expect(after).toBe(c);
  });
});

describe("DialogueController — backspace", () => {
  test("backspace delegates to session", () => {
    let c = createController(dlg([player("p1", "hi")]), new DirectIME());
    c = submitInput(c, "h");
    expect(c.currentSession?.cursor).toBe(1);
    c = backspaceController(c);
    expect(c.currentSession?.cursor).toBe(0);
  });

  test("backspace when finished is a no-op", () => {
    let c = createController(dlg([player("p1", "hi")]), new DirectIME());
    c = submitInput(c, "hi");
    c = commitController(c);
    expect(c.isFinished).toBe(true);
    const c2 = backspaceController(c);
    expect(c2.isFinished).toBe(true);
  });

  test("submit after finish is a no-op", () => {
    let c = createController(dlg([player("p1", "a")]), new DirectIME());
    c = submitInput(c, "a");
    c = commitController(c);
    expect(c.isFinished).toBe(true);
    const c2 = submitInput(c, "x");
    expect(c2.isFinished).toBe(true);
  });
});
