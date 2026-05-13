/**
 * TDD spec for hepburnToKana — wapuro Hepburn → hiragana, best-effort
 * inverse of kanaToHepburn. Used by the A3 migration to derive `kana`
 * from existing `ro` fields. Callers verify the round-trip and worklist
 * anything that doesn't round-trip cleanly.
 */
import { describe, expect, test } from "vitest";
import { hepburnToKana } from "@/lib/typing/ime/hepburn-to-kana";
import { kanaToHepburn } from "@/lib/typing/ime/kana-to-hepburn";

describe("hepburnToKana — basic syllables", () => {
  test.each([
    ["a", "あ"], ["i", "い"], ["u", "う"], ["e", "え"], ["o", "お"],
    ["ka", "か"], ["ki", "き"], ["shi", "し"], ["chi", "ち"], ["tsu", "つ"],
    ["fu", "ふ"], ["ji", "じ"], ["zu", "ず"],
    ["n", "ん"],
    ["wa", "わ"], ["wo", "を"],
  ])("%s → %s", (ro, kana) => {
    expect(hepburnToKana(ro)).toBe(kana);
  });
});

describe("hepburnToKana — yoon", () => {
  test.each([
    ["sha", "しゃ"], ["shu", "しゅ"], ["sho", "しょ"],
    ["cha", "ちゃ"], ["chu", "ちゅ"], ["cho", "ちょ"],
    ["ja", "じゃ"], ["ju", "じゅ"], ["jo", "じょ"],
    ["kya", "きゃ"], ["ryo", "りょ"], ["myu", "みゅ"],
  ])("%s → %s", (ro, kana) => {
    expect(hepburnToKana(ro)).toBe(kana);
  });
});

describe("hepburnToKana — sokuon", () => {
  test.each([
    ["katta", "かった"],
    ["kitte", "きって"],
    ["zasshi", "ざっし"],
    ["itchi", "いっち"],
    ["butchake", "ぶっちゃけ"],
    ["mittsu", "みっつ"],
    ["happa", "はっぱ"],
    ["gakkou", "がっこう"],
    ["nijuppun", "にじゅっぷん"],
  ])("%s → %s", (ro, kana) => {
    expect(hepburnToKana(ro)).toBe(kana);
  });
});

describe("hepburnToKana — n handling", () => {
  test.each([
    ["san", "さん"],
    ["hon", "ほん"],
    ["shinbun", "しんぶん"],
    ["hontou", "ほんとう"],
    ["kanji", "かんじ"],
  ])("%s → %s", (ro, kana) => {
    expect(hepburnToKana(ro)).toBe(kana);
  });
});

describe("hepburnToKana — long vowels stay literal", () => {
  test.each([
    ["ou", "おう"],
    ["oo", "おお"],
    ["ee", "ええ"],
    ["ii", "いい"],
    ["uu", "うう"],
    ["aa", "ああ"],
    ["arigatou", "ありがとう"],
    ["koohii", "こおひい"], // pure-hiragana reverse; katakana ー lost
  ])("%s → %s", (ro, kana) => {
    expect(hepburnToKana(ro)).toBe(kana);
  });
});

describe("hepburnToKana — round-trip via kanaToHepburn", () => {
  test.each([
    "arigatougozaimasu",
    "ohayougozaimasu",
    "hontounigomen",
    "juutai",
    "hamatteru",
    "zenzenugokanai",
    "nijuppun",
    "kanaa",
    "ga",
    "zutto",
    "kawaru",
    "konbanwa",
    "kuremasenka",
    "misete",
    "ryoukai",
    "matatatode",
  ])("kanaToHepburn(hepburnToKana(%s)) === %s", (ro) => {
    expect(kanaToHepburn(hepburnToKana(ro))).toBe(ro);
  });
});

describe("hepburnToKana — unknown chars pass through", () => {
  test("digits and punctuation pass through; lone consonants stay raw", () => {
    expect(hepburnToKana("a1b")).toBe("あ1b");
    expect(hepburnToKana("a.")).toBe("あ.");
  });
});
