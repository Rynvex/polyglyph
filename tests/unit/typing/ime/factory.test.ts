/**
 * TDD spec for createImeForLanguage — picks the right IME implementation
 * for a given dialogue/vocab language.
 *
 * Design (2026-05): all Latin-script langs and ko use DirectIME (player
 * types and sees ASCII directly). ja uses JapaneseRomajiIME, which folds
 * Kunrei spellings (`si`, `tu`, `sya`) into Hepburn (`shi`, `tsu`,
 * `sha`) so the engine sees ASCII matching the stored Hepburn target
 * regardless of which spelling the player chose.
 */

import { describe, expect, test } from "vitest";
import { createImeForLanguage } from "@/lib/typing/ime/factory";
import { DirectIME } from "@/lib/typing/ime/direct";
import { JapaneseRomajiIME } from "@/lib/typing/ime/japanese-romaji";

describe("createImeForLanguage", () => {
  test("returns JapaneseRomajiIME for ja", () => {
    expect(createImeForLanguage("ja")).toBeInstanceOf(JapaneseRomajiIME);
  });

  test("returns DirectIME for non-ja languages", () => {
    for (const lang of ["en", "zh-tw", "ko", "it", "de", "es"] as const) {
      expect(createImeForLanguage(lang)).toBeInstanceOf(DirectIME);
    }
  });

  test("returns a fresh instance each call (no shared state across sessions)", () => {
    const a = createImeForLanguage("ja");
    const b = createImeForLanguage("ja");
    expect(a).not.toBe(b);
  });
});
