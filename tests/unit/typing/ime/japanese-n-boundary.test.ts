/**
 * TDD spec: trailing `n` should commit as ん whenever the next character
 * cannot start an n-syllable, including non-letter boundaries (space,
 * punctuation). Real Mozc treats `n ` and `n.` the same as `n<consonant>`.
 *
 * Regression motivation: bulk-translated romaji uses spaces between
 * phrase chunks. With strict letter-only n-handling, every `kan ho`
 * leaves a stray `n` that breaks the IME validator and produces a
 * raw `n` typo cell at runtime.
 */

import { describe, expect, test } from "vitest";
import { JapaneseHiraganaIME } from "@/lib/typing/ime/japanese";

function compose(raw: string): string[] {
  const ime = new JapaneseHiraganaIME();
  const out: string[] = [];
  for (const c of ime.feed(raw)) out.push(c);
  if (typeof ime.flush === "function") {
    for (const c of ime.flush()) out.push(c);
  }
  return out;
}

describe("JapaneseHiraganaIME — n boundary handling", () => {
  test("n followed by space commits as ん then space", () => {
    expect(compose("kan ho")).toEqual(["か", "ん", " ", "ほ"]);
  });

  test("n followed by question mark commits as ん", () => {
    expect(compose("desu kan?")).toEqual([
      "で", "す", " ", "か", "ん", "?",
    ]);
  });

  test("n followed by period commits as ん", () => {
    expect(compose("kan.")).toEqual(["か", "ん", "。"]);
  });

  test("n followed by vowel still forms na/ni/etc (no premature commit)", () => {
    expect(compose("kana")).toEqual(["か", "な"]);
  });

  test("n followed by y still forms nya/nyu/nyo (no premature commit)", () => {
    expect(compose("nya")).toEqual(["に", "ゃ"]);
  });

  test("n followed by another consonant letter still commits as ん", () => {
    expect(compose("konban")).toEqual(["こ", "ん", "ば", "ん"]);
  });

  test("nn at end of input commits to ん via flush", () => {
    expect(compose("ohayou kun")).toEqual([
      "お", "は", "よ", "う", " ", "く", "ん",
    ]);
  });
});
