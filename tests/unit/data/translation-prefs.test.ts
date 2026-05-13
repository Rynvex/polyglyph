/**
 * TDD spec for the translation-display preferences.
 *
 * Two independent booleans control whether translation strips render under
 * the NPC bubble and the player bubble. Both default to `false` so existing
 * users (and learners practicing without a crutch) see no change unless
 * they opt in.
 *
 * Storage shape: each toggle has its own key persisted as the literal
 * strings "true" / "false". Independent keys make future toggle additions
 * (e.g. show romaji ruby) a no-migration drop-in.
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
  DEFAULT_TRANSLATION_PREFS,
  SHOW_NPC_TRANSLATION_KEY,
  SHOW_PLAYER_TRANSLATION_KEY,
  loadTranslationPrefs,
  saveTranslationPrefs,
  setShowNpcTranslation,
  setShowPlayerTranslation,
} from "@/lib/data/translation-prefs";

class FakeStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  key(i: number): string | null {
    return Array.from(this.map.keys())[i] ?? null;
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
}

let storage: FakeStorage;

beforeEach(() => {
  storage = new FakeStorage();
});

describe("defaults", () => {
  test("both toggles default to false", () => {
    expect(DEFAULT_TRANSLATION_PREFS).toEqual({
      showNpcTranslation: false,
      showPlayerTranslation: false,
    });
  });

  test("loadTranslationPrefs returns defaults when storage empty", () => {
    expect(loadTranslationPrefs({ storage })).toEqual(DEFAULT_TRANSLATION_PREFS);
  });
});

describe("round-trips", () => {
  test("saves and loads both toggles on", () => {
    saveTranslationPrefs(
      { showNpcTranslation: true, showPlayerTranslation: true },
      { storage },
    );
    expect(loadTranslationPrefs({ storage })).toEqual({
      showNpcTranslation: true,
      showPlayerTranslation: true,
    });
  });

  test("saves mixed state", () => {
    saveTranslationPrefs(
      { showNpcTranslation: true, showPlayerTranslation: false },
      { storage },
    );
    expect(loadTranslationPrefs({ storage })).toEqual({
      showNpcTranslation: true,
      showPlayerTranslation: false,
    });
  });

  test("overwrites previous value", () => {
    saveTranslationPrefs(
      { showNpcTranslation: true, showPlayerTranslation: true },
      { storage },
    );
    saveTranslationPrefs(
      { showNpcTranslation: false, showPlayerTranslation: true },
      { storage },
    );
    expect(loadTranslationPrefs({ storage })).toEqual({
      showNpcTranslation: false,
      showPlayerTranslation: true,
    });
  });
});

describe("independent setters", () => {
  test("setShowNpcTranslation does not touch player key", () => {
    setShowPlayerTranslation(true, { storage });
    setShowNpcTranslation(true, { storage });
    expect(storage.getItem(SHOW_PLAYER_TRANSLATION_KEY)).toBe("true");
    expect(storage.getItem(SHOW_NPC_TRANSLATION_KEY)).toBe("true");
  });

  test("setShowPlayerTranslation does not touch npc key", () => {
    setShowNpcTranslation(true, { storage });
    setShowPlayerTranslation(true, { storage });
    expect(storage.getItem(SHOW_NPC_TRANSLATION_KEY)).toBe("true");
    expect(storage.getItem(SHOW_PLAYER_TRANSLATION_KEY)).toBe("true");
  });

  test("toggling one off does not affect the other", () => {
    setShowNpcTranslation(true, { storage });
    setShowPlayerTranslation(true, { storage });
    setShowNpcTranslation(false, { storage });
    expect(loadTranslationPrefs({ storage })).toEqual({
      showNpcTranslation: false,
      showPlayerTranslation: true,
    });
  });
});

describe("malformed input tolerance", () => {
  test("non-true strings load as false", () => {
    storage.setItem(SHOW_NPC_TRANSLATION_KEY, "garbage");
    storage.setItem(SHOW_PLAYER_TRANSLATION_KEY, "");
    expect(loadTranslationPrefs({ storage })).toEqual({
      showNpcTranslation: false,
      showPlayerTranslation: false,
    });
  });

  test("only the literal string 'true' loads as true", () => {
    storage.setItem(SHOW_NPC_TRANSLATION_KEY, "True");
    storage.setItem(SHOW_PLAYER_TRANSLATION_KEY, "1");
    expect(loadTranslationPrefs({ storage })).toEqual({
      showNpcTranslation: false,
      showPlayerTranslation: false,
    });
  });
});

describe("ssr safety", () => {
  test("loadTranslationPrefs returns defaults when storage is null", () => {
    expect(loadTranslationPrefs({ storage: null })).toEqual(
      DEFAULT_TRANSLATION_PREFS,
    );
  });

  test("saveTranslationPrefs is a no-op when storage is null", () => {
    expect(() =>
      saveTranslationPrefs(
        { showNpcTranslation: true, showPlayerTranslation: true },
        { storage: null },
      ),
    ).not.toThrow();
  });

  test("individual setters are no-ops when storage is null", () => {
    expect(() => setShowNpcTranslation(true, { storage: null })).not.toThrow();
    expect(() =>
      setShowPlayerTranslation(true, { storage: null }),
    ).not.toThrow();
  });
});
