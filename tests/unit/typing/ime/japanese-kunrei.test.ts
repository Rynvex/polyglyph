/**
 * TDD spec: JapaneseHiraganaIME accepts Kunrei-shiki / Nihon-shiki romaji
 * aliases in addition to Hepburn. Real-world Mozc and MS-IME accept both,
 * so a learner who types `si` should still produce し.
 */

import { describe, expect, test } from "vitest";
import { JapaneseHiraganaIME } from "@/lib/typing/ime/japanese";

function feed(ime: JapaneseHiraganaIME, raw: string): string[] {
  return [...ime.feed(raw)];
}

describe("JapaneseHiraganaIME — Kunrei pair aliases", () => {
  test("si → し (Kunrei alias of shi)", () => {
    expect(feed(new JapaneseHiraganaIME(), "si")).toEqual(["し"]);
  });

  test("ti → ち (Kunrei alias of chi)", () => {
    expect(feed(new JapaneseHiraganaIME(), "ti")).toEqual(["ち"]);
  });

  test("tu → つ (Kunrei alias of tsu)", () => {
    expect(feed(new JapaneseHiraganaIME(), "tu")).toEqual(["つ"]);
  });

  test("zi → じ (Kunrei alias of ji)", () => {
    expect(feed(new JapaneseHiraganaIME(), "zi")).toEqual(["じ"]);
  });

  test("di → じ (Nihon-shiki alias of ji)", () => {
    expect(feed(new JapaneseHiraganaIME(), "di")).toEqual(["じ"]);
  });

  test("du → ず (Nihon-shiki alias of zu)", () => {
    expect(feed(new JapaneseHiraganaIME(), "du")).toEqual(["ず"]);
  });

  test("hu → ふ (Kunrei alias of fu)", () => {
    expect(feed(new JapaneseHiraganaIME(), "hu")).toEqual(["ふ"]);
  });
});

describe("JapaneseHiraganaIME — Kunrei yoon aliases", () => {
  test("sya / syu / syo → しゃ しゅ しょ", () => {
    expect(feed(new JapaneseHiraganaIME(), "sya")).toEqual(["し", "ゃ"]);
    expect(feed(new JapaneseHiraganaIME(), "syu")).toEqual(["し", "ゅ"]);
    expect(feed(new JapaneseHiraganaIME(), "syo")).toEqual(["し", "ょ"]);
  });

  test("tya / tyu / tyo → ちゃ ちゅ ちょ", () => {
    expect(feed(new JapaneseHiraganaIME(), "tya")).toEqual(["ち", "ゃ"]);
    expect(feed(new JapaneseHiraganaIME(), "tyu")).toEqual(["ち", "ゅ"]);
    expect(feed(new JapaneseHiraganaIME(), "tyo")).toEqual(["ち", "ょ"]);
  });

  test("zya / zyu / zyo → じゃ じゅ じょ", () => {
    expect(feed(new JapaneseHiraganaIME(), "zya")).toEqual(["じ", "ゃ"]);
    expect(feed(new JapaneseHiraganaIME(), "zyu")).toEqual(["じ", "ゅ"]);
    expect(feed(new JapaneseHiraganaIME(), "zyo")).toEqual(["じ", "ょ"]);
  });

  test("jya / jyu / jyo → じゃ じゅ じょ (common typing alias)", () => {
    expect(feed(new JapaneseHiraganaIME(), "jya")).toEqual(["じ", "ゃ"]);
    expect(feed(new JapaneseHiraganaIME(), "jyu")).toEqual(["じ", "ゅ"]);
    expect(feed(new JapaneseHiraganaIME(), "jyo")).toEqual(["じ", "ょ"]);
  });
});

describe("JapaneseHiraganaIME — Kunrei sokuon interaction", () => {
  test("ssi → っし (sokuon + si alias)", () => {
    expect(feed(new JapaneseHiraganaIME(), "ssi")).toEqual(["っ", "し"]);
  });

  test("tta still works (Hepburn ta unaffected)", () => {
    expect(feed(new JapaneseHiraganaIME(), "tta")).toEqual(["っ", "た"]);
  });

  test("ttu → っつ (sokuon + tu alias)", () => {
    expect(feed(new JapaneseHiraganaIME(), "ttu")).toEqual(["っ", "つ"]);
  });

  test("ssya → っしゃ (sokuon + sya yoon alias)", () => {
    expect(feed(new JapaneseHiraganaIME(), "ssya")).toEqual(["っ", "し", "ゃ"]);
  });

  test("Hepburn forms still pass after aliases added", () => {
    expect(feed(new JapaneseHiraganaIME(), "shi")).toEqual(["し"]);
    expect(feed(new JapaneseHiraganaIME(), "chi")).toEqual(["ち"]);
    expect(feed(new JapaneseHiraganaIME(), "tsu")).toEqual(["つ"]);
    expect(feed(new JapaneseHiraganaIME(), "sha")).toEqual(["し", "ゃ"]);
  });
});

describe("JapaneseHiraganaIME — Kunrei n-handling boundary", () => {
  test("nsi → んし (n commits before si alias)", () => {
    expect(feed(new JapaneseHiraganaIME(), "nsi")).toEqual(["ん", "し"]);
  });

  test("nti → んち", () => {
    expect(feed(new JapaneseHiraganaIME(), "nti")).toEqual(["ん", "ち"]);
  });
});
