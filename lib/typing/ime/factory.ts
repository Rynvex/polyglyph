/**
 * IME factory — returns the right input method for a language. Used by
 * DialogueScene (and future VocabScene per-language switching) so the
 * UI doesn't need a giant switch statement.
 *
 * Returns a FRESH instance per call — IMEs hold per-session buffer
 * state, so mounting two play sessions of the same language must give
 * each its own IME.
 *
 * Design (2026-05): every language uses DirectIME. Player text is
 * typed and displayed as-is; for ja/ko that means pure romaji /
 * Revised Romanization input, no kanji/hangul mid-input composition.
 * The handcrafted matching text/display pairs the kana IMEs required
 * produced too many transcription bugs in the dataset to be worth the
 * visual polish. JapaneseHiraganaIME and KoreanRomajaIME remain in
 * the codebase for callers that opt in explicitly.
 */

import type { Language } from "@/lib/data/schema";
import { DirectIME } from "./direct";
import { JapaneseRomajiIME } from "./japanese-romaji";
import type { InputMethod } from "./types";

/**
 * IME factory. Returns a fresh instance per call — IMEs hold per-
 * session buffer state, so mounting two play sessions of the same
 * language must give each its own IME.
 *
 *   ja  → JapaneseRomajiIME (Kunrei → Hepburn folding)
 *   ko  → DirectIME (canonical RR; MR/Yale variant folding deferred,
 *         see B4 in OPEN_ISSUES.md)
 *   *   → DirectIME (pass-through for Latin scripts)
 */
export function createImeForLanguage(lang: Language): InputMethod {
  if (lang === "ja") return new JapaneseRomajiIME();
  return new DirectIME();
}
