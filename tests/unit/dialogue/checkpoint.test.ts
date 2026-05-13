/**
 * TDD spec for controller checkpoint snapshot + restore.
 *
 * Snapshot captures only IDs (turn position + spoken bot ids + completed
 * player ids) so the JSON written to localStorage is small and forward-
 * compatible. Restore replays them through the controller and lands at the
 * same turn the user was on, with totalStats re-derived from the dialogue.
 */

import { describe, expect, test } from "vitest";
import {
  commitController,
  createController,
  restoreController,
  snapshotController,
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
    topic: "test",
    title: "Test",
    tags: [],
    turns,
  } as unknown as Dialogue;
}

const bot = (id: string, text: string) => ({ id, speaker: "bot", text });
const player = (id: string, text: string) => ({
  id,
  speaker: "player",
  templates: [{ id: `${id}.0`, text, weight: 1 }],
});

describe("snapshotController", () => {
  test("on a fresh controller it captures the starting position", () => {
    const c = createController(dlg([bot("b1", "Hi"), player("p1", "yo")]), new DirectIME());
    const snap = snapshotController(c, "test-script");
    expect(snap.scriptId).toBe("test-script");
    expect(snap.turnIdx).toBe(c.turnIdx);
    expect(snap.spokenBotTurnIds).toEqual(["b1"]);
    expect(snap.completedPlayerTurnIds).toEqual([]);
  });

  test("after a commit it captures the committed turn", () => {
    let c = createController(
      dlg([bot("b1", "Hi"), player("p1", "yo"), bot("b2", "Cool")]),
      new DirectIME(),
    );
    c = submitInput(c, "yo");
    c = commitController(c);
    const snap = snapshotController(c, "test");
    expect(snap.spokenBotTurnIds).toEqual(["b1", "b2"]);
    expect(snap.completedPlayerTurnIds).toEqual([["p1", "p1.0"]]);
  });
});

describe("restoreController", () => {
  test("restores spoken/completed lists at the snapshot's turn position", () => {
    const dialogue = dlg([
      bot("b1", "Hi"),
      player("p1", "yo"),
      bot("b2", "Cool"),
      player("p2", "ok"),
    ]);
    let original = createController(dialogue, new DirectIME());
    original = submitInput(original, "yo");
    original = commitController(original);

    const snap = snapshotController(original, "test");
    const restored = restoreController(dialogue, new DirectIME(), snap);

    expect(restored.turnIdx).toBe(original.turnIdx);
    expect(restored.spokenBotTurns.map((t) => t.id)).toEqual(["b1", "b2"]);
    expect(restored.completedPlayerTurns.map((e) => e.turn.id)).toEqual(["p1"]);
    expect(restored.currentSession?.target).toBe("ok");
  });

  test("restoring a finished snapshot lands as finished", () => {
    const dialogue = dlg([player("p1", "hi")]);
    let c = createController(dialogue, new DirectIME());
    c = submitInput(c, "hi");
    c = commitController(c);
    const snap = snapshotController(c, "x");
    const restored = restoreController(dialogue, new DirectIME(), snap);
    expect(restored.isFinished).toBe(true);
    expect(restored.completedPlayerTurns).toHaveLength(1);
  });

  test("ignores stale snapshot ids that no longer match the dialogue", () => {
    const dialogue = dlg([player("p1", "hi")]);
    const restored = restoreController(dialogue, new DirectIME(), {
      scriptId: "x",
      turnIdx: 99,
      spokenBotTurnIds: ["does-not-exist"],
      completedPlayerTurnIds: [["nope", "nope.0"]],
      savedAtMs: 0,
    });
    // Falls back to a fresh controller rather than crashing.
    expect(restored.spokenBotTurns).toHaveLength(0);
    expect(restored.completedPlayerTurns).toHaveLength(0);
    expect(restored.currentSession?.target).toBe("hi");
  });
});
