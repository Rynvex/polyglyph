/**
 * TDD spec for progress + checkpoint localStorage persistence.
 *
 * Pure-fn helpers (`computeRecord`, `applyResult`) are tested directly.
 * The localStorage wrappers (`saveResult`, `loadProgress`, `saveCheckpoint`,
 * `loadCheckpoint`, `clearCheckpoint`) get tested with a fake storage.
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
  applyResult,
  clearCheckpoint,
  computeRecord,
  loadCheckpoint,
  loadProgress,
  saveCheckpoint,
  saveResult,
  type ProgressEntry,
} from "@/lib/progress/storage";

class FakeStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(i: number): string | null {
    return Array.from(this.store.keys())[i] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

let storage: FakeStorage;

beforeEach(() => {
  storage = new FakeStorage();
});

describe("computeRecord", () => {
  test("first run becomes the record automatically", () => {
    const rec = computeRecord(null, { wpm: 30, accuracy: 0.95, completedAtMs: 1 });
    expect(rec.bestWpm).toBe(30);
    expect(rec.playCount).toBe(1);
    expect(rec.history).toHaveLength(1);
  });

  test("higher WPM replaces best", () => {
    const start: ProgressEntry = {
      bestWpm: 30,
      bestAccuracy: 0.9,
      playCount: 1,
      lastPlayedAtMs: 1,
      history: [{ wpm: 30, accuracy: 0.9, completedAtMs: 1 }],
    };
    const next = computeRecord(start, { wpm: 45, accuracy: 0.92, completedAtMs: 2 });
    expect(next.bestWpm).toBe(45);
    expect(next.bestAccuracy).toBe(0.92);
    expect(next.playCount).toBe(2);
  });

  test("lower WPM still bumps playCount and lastPlayedAtMs", () => {
    const start: ProgressEntry = {
      bestWpm: 50,
      bestAccuracy: 0.95,
      playCount: 1,
      lastPlayedAtMs: 1,
      history: [{ wpm: 50, accuracy: 0.95, completedAtMs: 1 }],
    };
    const next = computeRecord(start, { wpm: 35, accuracy: 0.88, completedAtMs: 2 });
    expect(next.bestWpm).toBe(50);
    expect(next.playCount).toBe(2);
    expect(next.lastPlayedAtMs).toBe(2);
  });

  test("history caps at 10 entries (keeps the most recent)", () => {
    let entry: ProgressEntry | null = null;
    for (let i = 0; i < 15; i++) {
      entry = computeRecord(entry, { wpm: i, accuracy: 1, completedAtMs: i });
    }
    expect(entry?.history).toHaveLength(10);
    expect(entry?.history[0].completedAtMs).toBe(5);
    expect(entry?.history[9].completedAtMs).toBe(14);
  });
});

describe("applyResult", () => {
  test("returns { isNewRecord: true } when WPM beats previous best", () => {
    const start: ProgressEntry = {
      bestWpm: 30,
      bestAccuracy: 1,
      playCount: 1,
      lastPlayedAtMs: 1,
      history: [],
    };
    const { entry, isNewRecord } = applyResult(start, {
      wpm: 45,
      accuracy: 1,
      completedAtMs: 2,
    });
    expect(isNewRecord).toBe(true);
    expect(entry.bestWpm).toBe(45);
  });

  test("first ever run counts as new record", () => {
    const { isNewRecord } = applyResult(null, { wpm: 1, accuracy: 1, completedAtMs: 1 });
    expect(isNewRecord).toBe(true);
  });

  test("equal WPM is NOT a new record", () => {
    const start: ProgressEntry = {
      bestWpm: 40,
      bestAccuracy: 1,
      playCount: 1,
      lastPlayedAtMs: 1,
      history: [],
    };
    const { isNewRecord } = applyResult(start, { wpm: 40, accuracy: 1, completedAtMs: 2 });
    expect(isNewRecord).toBe(false);
  });
});

describe("localStorage wrappers", () => {
  test("saveResult round-trip via loadProgress", () => {
    const { isNewRecord } = saveResult(
      "cafe",
      { wpm: 42, accuracy: 0.9, completedAtMs: 100 },
      { storage },
    );
    expect(isNewRecord).toBe(true);
    const loaded = loadProgress("cafe", { storage });
    expect(loaded?.bestWpm).toBe(42);
    expect(loaded?.playCount).toBe(1);
  });

  test("loadProgress returns null when no entry exists", () => {
    expect(loadProgress("anything", { storage })).toBeNull();
  });

  test("saveResult is keyed per scriptId — no cross-pollination", () => {
    saveResult("a", { wpm: 30, accuracy: 1, completedAtMs: 1 }, { storage });
    saveResult("b", { wpm: 60, accuracy: 1, completedAtMs: 1 }, { storage });
    expect(loadProgress("a", { storage })?.bestWpm).toBe(30);
    expect(loadProgress("b", { storage })?.bestWpm).toBe(60);
  });

  test("saveResult tolerates corrupt previous JSON by treating it as null", () => {
    storage.setItem("polyglyph:progress:cafe", "{not json");
    const { isNewRecord } = saveResult(
      "cafe",
      { wpm: 10, accuracy: 1, completedAtMs: 1 },
      { storage },
    );
    expect(isNewRecord).toBe(true);
  });
});

describe("checkpoints", () => {
  test("save + load round-trip", () => {
    saveCheckpoint(
      "cafe",
      {
        scriptId: "cafe",
        turnIdx: 4,
        spokenBotTurnIds: ["t1", "t3"],
        completedPlayerTurnIds: [["t2", "t2.0"]],
        savedAtMs: 100,
      },
      { storage },
    );
    const cp = loadCheckpoint("cafe", { storage });
    expect(cp?.turnIdx).toBe(4);
    expect(cp?.spokenBotTurnIds).toEqual(["t1", "t3"]);
    expect(cp?.completedPlayerTurnIds).toEqual([["t2", "t2.0"]]);
  });

  test("clearCheckpoint removes the entry", () => {
    saveCheckpoint(
      "cafe",
      {
        scriptId: "cafe",
        turnIdx: 1,
        spokenBotTurnIds: [],
        completedPlayerTurnIds: [],
        savedAtMs: 1,
      },
      { storage },
    );
    clearCheckpoint("cafe", { storage });
    expect(loadCheckpoint("cafe", { storage })).toBeNull();
  });

  test("loadCheckpoint returns null on corrupt JSON", () => {
    storage.setItem("polyglyph:checkpoint:cafe", "{not json");
    expect(loadCheckpoint("cafe", { storage })).toBeNull();
  });

  test("checkpoint and progress live under different keys (no clash)", () => {
    saveResult("cafe", { wpm: 1, accuracy: 1, completedAtMs: 1 }, { storage });
    saveCheckpoint(
      "cafe",
      {
        scriptId: "cafe",
        turnIdx: 1,
        spokenBotTurnIds: [],
        completedPlayerTurnIds: [],
        savedAtMs: 1,
      },
      { storage },
    );
    expect(loadProgress("cafe", { storage })?.bestWpm).toBe(1);
    expect(loadCheckpoint("cafe", { storage })?.turnIdx).toBe(1);
  });
});

describe("ssr safety", () => {
  test("loadProgress returns null when storage is undefined", () => {
    expect(loadProgress("cafe", { storage: null })).toBeNull();
  });

  test("loadCheckpoint returns null when storage is undefined", () => {
    expect(loadCheckpoint("cafe", { storage: null })).toBeNull();
  });

  test("saveResult is a no-op when storage is undefined", () => {
    const { isNewRecord } = saveResult(
      "cafe",
      { wpm: 1, accuracy: 1, completedAtMs: 1 },
      { storage: null },
    );
    // We still report the boolean (computed from null prior), but no throw.
    expect(typeof isNewRecord).toBe("boolean");
  });
});
