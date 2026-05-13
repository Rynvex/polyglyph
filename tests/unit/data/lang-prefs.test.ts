/**
 * TDD spec for the (nativeLang, targetLang) preference store.
 *
 * Behaviour:
 *   - loadLangPair() always returns a valid LangPair; fallback when missing
 *     or when stored payload is unparseable.
 *   - saveLangPair() persists into the same key the loader reads.
 *   - SSR-safe: storage=null returns the default and never throws.
 *   - same-lang pairs are *allowed* (degenerate case is the user's call).
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
  DEFAULT_LANG_PAIR,
  DEFAULT_NATIVE_LANG,
  DEFAULT_TARGET_LANG,
  LEGACY_LANG_PAIR_KEY,
  LANG_PAIR_KEY,
  NATIVE_LANG_KEY,
  TARGET_LANG_KEY,
  loadLangPair,
  loadNativeLang,
  loadTargetLang,
  saveLangPair,
  saveNativeLang,
  saveTargetLang,
} from "@/lib/data/lang-prefs";

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

describe("default pair", () => {
  test("English native, Spanish target", () => {
    expect(DEFAULT_LANG_PAIR).toEqual({ nativeLang: "en", targetLang: "es" });
  });
});

describe("loadLangPair (legacy compatibility)", () => {
  test("returns default when storage is empty", () => {
    expect(loadLangPair({ storage })).toEqual(DEFAULT_LANG_PAIR);
  });

  test("returns default when stored payload is malformed", () => {
    storage.setItem(LANG_PAIR_KEY, "not json");
    expect(loadLangPair({ storage })).toEqual(DEFAULT_LANG_PAIR);
  });

  test("returns partial when stored object is missing fields", () => {
    // The legacy key is migrated; missing fields fall through to defaults.
    storage.setItem(LANG_PAIR_KEY, JSON.stringify({ nativeLang: "ja" }));
    expect(loadLangPair({ storage })).toEqual({
      nativeLang: "ja",
      targetLang: DEFAULT_TARGET_LANG,
    });
  });

  test("returns default when fields are non-strings", () => {
    storage.setItem(
      LANG_PAIR_KEY,
      JSON.stringify({ nativeLang: 123, targetLang: null }),
    );
    expect(loadLangPair({ storage })).toEqual(DEFAULT_LANG_PAIR);
  });

  test("returns stored pair when valid", () => {
    storage.setItem(
      LANG_PAIR_KEY,
      JSON.stringify({ nativeLang: "zh-tw", targetLang: "ja" }),
    );
    expect(loadLangPair({ storage })).toEqual({
      nativeLang: "zh-tw",
      targetLang: "ja",
    });
  });
});

describe("split keys — native and target loaded independently", () => {
  test("native default when no key set", () => {
    expect(loadNativeLang({ storage })).toBe(DEFAULT_NATIVE_LANG);
  });

  test("target default when no key set", () => {
    expect(loadTargetLang({ storage })).toBe(DEFAULT_TARGET_LANG);
  });

  test("native round-trip", () => {
    saveNativeLang("ja", { storage });
    expect(loadNativeLang({ storage })).toBe("ja");
  });

  test("target round-trip", () => {
    saveTargetLang("ko", { storage });
    expect(loadTargetLang({ storage })).toBe("ko");
  });

  test("saving native does not affect target and vice versa", () => {
    saveNativeLang("ja", { storage });
    saveTargetLang("de", { storage });
    expect(loadNativeLang({ storage })).toBe("ja");
    expect(loadTargetLang({ storage })).toBe("de");
    expect(loadLangPair({ storage })).toEqual({
      nativeLang: "ja",
      targetLang: "de",
    });
  });

  test("legacy key is migrated on first load and removed", () => {
    storage.setItem(
      LEGACY_LANG_PAIR_KEY,
      JSON.stringify({ nativeLang: "zh-tw", targetLang: "ja" }),
    );
    expect(loadNativeLang({ storage })).toBe("zh-tw");
    expect(loadTargetLang({ storage })).toBe("ja");
    expect(storage.getItem(LEGACY_LANG_PAIR_KEY)).toBeNull();
    expect(storage.getItem(NATIVE_LANG_KEY)).toBe("zh-tw");
    expect(storage.getItem(TARGET_LANG_KEY)).toBe("ja");
  });

  test("legacy migration does not overwrite existing split keys", () => {
    storage.setItem(NATIVE_LANG_KEY, "fr");
    storage.setItem(
      LEGACY_LANG_PAIR_KEY,
      JSON.stringify({ nativeLang: "ja", targetLang: "de" }),
    );
    expect(loadNativeLang({ storage })).toBe("fr"); // existing wins
    expect(loadTargetLang({ storage })).toBe("de"); // legacy fills the gap
    expect(storage.getItem(LEGACY_LANG_PAIR_KEY)).toBeNull();
  });
});

describe("saveLangPair", () => {
  test("round-trips a pair through storage", () => {
    saveLangPair({ nativeLang: "zh-tw", targetLang: "ja" }, { storage });
    expect(loadLangPair({ storage })).toEqual({
      nativeLang: "zh-tw",
      targetLang: "ja",
    });
  });

  test("overwrites previous pair", () => {
    saveLangPair({ nativeLang: "en", targetLang: "ja" }, { storage });
    saveLangPair({ nativeLang: "ja", targetLang: "en" }, { storage });
    expect(loadLangPair({ storage })).toEqual({
      nativeLang: "ja",
      targetLang: "en",
    });
  });

  test("allows same-language pair (degenerate, but user's choice)", () => {
    saveLangPair({ nativeLang: "en", targetLang: "en" }, { storage });
    expect(loadLangPair({ storage })).toEqual({
      nativeLang: "en",
      targetLang: "en",
    });
  });
});

describe("ssr safety", () => {
  test("loadLangPair returns default when storage is null", () => {
    expect(loadLangPair({ storage: null })).toEqual(DEFAULT_LANG_PAIR);
  });

  test("saveLangPair is a no-op when storage is null", () => {
    expect(() =>
      saveLangPair({ nativeLang: "ja", targetLang: "en" }, { storage: null }),
    ).not.toThrow();
  });
});
