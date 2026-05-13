/**
 * TDD spec for JapaneseHiraganaIME.
 *
 * Converts romaji input into hiragana cells matching what the typing
 * engine sees. Each emitted character is one cell match.
 */

import { describe, expect, test } from "vitest";
import { JapaneseHiraganaIME } from "@/lib/typing/ime/japanese";

function feed(ime: JapaneseHiraganaIME, raw: string): string[] {
  return [...ime.feed(raw)];
}

describe("JapaneseHiraganaIME — vowels", () => {
  test("each vowel maps to its hiragana", () => {
    const ime = new JapaneseHiraganaIME();
    expect(feed(ime, "a")).toEqual(["あ"]);
    expect(feed(ime, "i")).toEqual(["い"]);
    expect(feed(ime, "u")).toEqual(["う"]);
    expect(feed(ime, "e")).toEqual(["え"]);
    expect(feed(ime, "o")).toEqual(["お"]);
  });
});

describe("JapaneseHiraganaIME — basic syllables", () => {
  test("k-row", () => {
    const ime = new JapaneseHiraganaIME();
    expect(feed(ime, "k")).toEqual([]);
    expect(feed(ime, "a")).toEqual(["か"]);
  });

  test("g-row dakuten", () => {
    const ime = new JapaneseHiraganaIME();
    expect(feed(ime, "ga")).toEqual(["が"]);
  });

  test("p-row handakuten", () => {
    const ime = new JapaneseHiraganaIME();
    expect(feed(ime, "po")).toEqual(["ぽ"]);
  });

  test("special: shi / chi / tsu", () => {
    expect(feed(new JapaneseHiraganaIME(), "shi")).toEqual(["し"]);
    expect(feed(new JapaneseHiraganaIME(), "chi")).toEqual(["ち"]);
    expect(feed(new JapaneseHiraganaIME(), "tsu")).toEqual(["つ"]);
  });

  test("fu / ji / zu", () => {
    expect(feed(new JapaneseHiraganaIME(), "fu")).toEqual(["ふ"]);
    expect(feed(new JapaneseHiraganaIME(), "ji")).toEqual(["じ"]);
    expect(feed(new JapaneseHiraganaIME(), "zu")).toEqual(["ず"]);
  });
});

describe("JapaneseHiraganaIME — yoon (composite syllables)", () => {
  test("kya / kyu / kyo emit two kana each", () => {
    expect(feed(new JapaneseHiraganaIME(), "kya")).toEqual(["き", "ゃ"]);
    expect(feed(new JapaneseHiraganaIME(), "kyu")).toEqual(["き", "ゅ"]);
    expect(feed(new JapaneseHiraganaIME(), "kyo")).toEqual(["き", "ょ"]);
  });

  test("sha / shu / sho", () => {
    expect(feed(new JapaneseHiraganaIME(), "sha")).toEqual(["し", "ゃ"]);
    expect(feed(new JapaneseHiraganaIME(), "shu")).toEqual(["し", "ゅ"]);
    expect(feed(new JapaneseHiraganaIME(), "sho")).toEqual(["し", "ょ"]);
  });

  test("cha / chu / cho", () => {
    expect(feed(new JapaneseHiraganaIME(), "cha")).toEqual(["ち", "ゃ"]);
    expect(feed(new JapaneseHiraganaIME(), "chu")).toEqual(["ち", "ゅ"]);
    expect(feed(new JapaneseHiraganaIME(), "cho")).toEqual(["ち", "ょ"]);
  });

  test("nya / nyu / nyo", () => {
    expect(feed(new JapaneseHiraganaIME(), "nya")).toEqual(["に", "ゃ"]);
    expect(feed(new JapaneseHiraganaIME(), "nyu")).toEqual(["に", "ゅ"]);
    expect(feed(new JapaneseHiraganaIME(), "nyo")).toEqual(["に", "ょ"]);
  });

  test("ja / ju / jo", () => {
    expect(feed(new JapaneseHiraganaIME(), "ja")).toEqual(["じ", "ゃ"]);
    expect(feed(new JapaneseHiraganaIME(), "ju")).toEqual(["じ", "ゅ"]);
    expect(feed(new JapaneseHiraganaIME(), "jo")).toEqual(["じ", "ょ"]);
  });
});

describe("JapaneseHiraganaIME — sokuon (doubled consonant → っ)", () => {
  test("tta", () => {
    expect(feed(new JapaneseHiraganaIME(), "tta")).toEqual(["っ", "た"]);
  });

  test("kki", () => {
    expect(feed(new JapaneseHiraganaIME(), "kki")).toEqual(["っ", "き"]);
  });

  test("ppa", () => {
    expect(feed(new JapaneseHiraganaIME(), "ppa")).toEqual(["っ", "ぱ"]);
  });

  test("itte → い っ て", () => {
    expect(feed(new JapaneseHiraganaIME(), "itte")).toEqual(["い", "っ", "て"]);
  });
});

describe("JapaneseHiraganaIME — n handling", () => {
  test("nn → ん, leaving second n in buffer for next syllable", () => {
    const ime = new JapaneseHiraganaIME();
    expect(feed(ime, "nn")).toEqual(["ん"]);
    // Second 'n' stays buffered, then 'i' completes に.
    expect(feed(ime, "i")).toEqual(["に"]);
  });

  test("n + consonant emits ん immediately", () => {
    // 'n' then 'k' → ん, then ka → か
    const ime = new JapaneseHiraganaIME();
    expect(feed(ime, "nka")).toEqual(["ん", "か"]);
  });

  test("n + vowel forms na/ni/etc — does NOT emit ん", () => {
    expect(feed(new JapaneseHiraganaIME(), "na")).toEqual(["な"]);
    expect(feed(new JapaneseHiraganaIME(), "ni")).toEqual(["に"]);
    expect(feed(new JapaneseHiraganaIME(), "no")).toEqual(["の"]);
  });

  test("konnichiha → こんにちは", () => {
    expect(feed(new JapaneseHiraganaIME(), "konnichiha")).toEqual([
      "こ", "ん", "に", "ち", "は",
    ]);
  });
});

describe("JapaneseHiraganaIME — full sentences", () => {
  test("ohayou → おはよう", () => {
    expect(feed(new JapaneseHiraganaIME(), "ohayou")).toEqual([
      "お", "は", "よ", "う",
    ]);
  });

  test("ohayougozaimasu → おはようございます", () => {
    expect(feed(new JapaneseHiraganaIME(), "ohayougozaimasu")).toEqual([
      "お", "は", "よ", "う", "ご", "ざ", "い", "ま", "す",
    ]);
  });

  test("haisoudesune → はいそうですね", () => {
    expect(feed(new JapaneseHiraganaIME(), "haisoudesune")).toEqual([
      "は", "い", "そ", "う", "で", "す", "ね",
    ]);
  });

  test("ittekimasu → いってきます", () => {
    expect(feed(new JapaneseHiraganaIME(), "ittekimasu")).toEqual([
      "い", "っ", "て", "き", "ま", "す",
    ]);
  });
});

describe("JapaneseHiraganaIME — punctuation pass-through", () => {
  test("Japanese 、 and 。 pass through", () => {
    expect(feed(new JapaneseHiraganaIME(), "、")).toEqual(["、"]);
    expect(feed(new JapaneseHiraganaIME(), "。")).toEqual(["。"]);
  });

  test("ASCII , maps to Japanese 、", () => {
    expect(feed(new JapaneseHiraganaIME(), ",")).toEqual(["、"]);
  });

  test("ASCII . maps to Japanese 。", () => {
    expect(feed(new JapaneseHiraganaIME(), ".")).toEqual(["。"]);
  });

  test("ASCII ? and ! map to full-width", () => {
    expect(feed(new JapaneseHiraganaIME(), "?")).toEqual(["?"]);
    expect(feed(new JapaneseHiraganaIME(), "!")).toEqual(["!"]);
  });

  test("ASCII - maps to long-vowel mark ー", () => {
    expect(feed(new JapaneseHiraganaIME(), "-")).toEqual(["ー"]);
  });

  test("ASCII ~ maps to wave dash 〜", () => {
    expect(feed(new JapaneseHiraganaIME(), "~")).toEqual(["〜"]);
  });

  test("ASCII [ ] map to Japanese quotation 「 」", () => {
    expect(feed(new JapaneseHiraganaIME(), "[")).toEqual(["「"]);
    expect(feed(new JapaneseHiraganaIME(), "]")).toEqual(["」"]);
  });

  test("Japanese full-width chars pass through unchanged", () => {
    expect(feed(new JapaneseHiraganaIME(), "?")).toEqual(["?"]);
    expect(feed(new JapaneseHiraganaIME(), "ー")).toEqual(["ー"]);
    expect(feed(new JapaneseHiraganaIME(), "「")).toEqual(["「"]);
  });
});

describe("JapaneseHiraganaIME — buffer & reset", () => {
  test("buffer() exposes pending input", () => {
    const ime = new JapaneseHiraganaIME();
    feed(ime, "k");
    expect(ime.buffer()).toBe("k");
  });

  test("reset() clears the buffer", () => {
    const ime = new JapaneseHiraganaIME();
    feed(ime, "ky");
    expect(ime.buffer()).toBe("ky");
    ime.reset();
    expect(ime.buffer()).toBe("");
  });
});

describe("JapaneseHiraganaIME — case insensitive", () => {
  test("uppercase letters map identically", () => {
    expect(feed(new JapaneseHiraganaIME(), "KA")).toEqual(["か"]);
    expect(feed(new JapaneseHiraganaIME(), "OhAyOu")).toEqual([
      "お", "は", "よ", "う",
    ]);
  });
});
