/**
 * TDD spec for KoreanRomajaIME.
 *
 * Converts Revised Romanization input → Hangul syllable blocks. Each
 * emitted character is one Unicode Hangul syllable (one cell in the
 * typing target).
 */

import { describe, expect, test } from "vitest";
import { KoreanRomajaIME } from "@/lib/typing/ime/korean";

function feed(ime: KoreanRomajaIME, raw: string): string[] {
  return [...ime.feed(raw)];
}

function flush(ime: KoreanRomajaIME): string[] {
  return [...ime.flush()];
}

/** Type a full romaja string and drain the trailing buffer — returns
 *  every Hangul char the user would see committed. */
function compose(raw: string): string[] {
  const ime = new KoreanRomajaIME();
  const fed = [...ime.feed(raw)];
  const flushed = [...ime.flush()];
  return [...fed, ...flushed];
}

describe("KoreanRomajaIME — vowel-only syllables (silent ㅇ initial)", () => {
  test("a → 아", () => expect(compose("a")).toEqual(["아"]));
  test("eo → 어", () => expect(compose("eo")).toEqual(["어"]));
  test("eu → 으", () => expect(compose("eu")).toEqual(["으"]));
  test("yo → 요", () => expect(compose("yo")).toEqual(["요"]));
});

describe("KoreanRomajaIME — initial+vowel basic syllables", () => {
  test("ka → 카, ga → 가", () => {
    expect(compose("ka")).toEqual(["카"]);
    expect(compose("ga")).toEqual(["가"]);
  });

  test("na/da/ma/ba/sa/ja/ha", () => {
    const cases: [string, string][] = [
      ["na", "나"], ["da", "다"], ["ma", "마"], ["ba", "바"],
      ["sa", "사"], ["ja", "자"], ["ha", "하"],
    ];
    for (const [r, h] of cases) expect(compose(r)).toEqual([h]);
  });

  test("aspirated/tense initials: kk, tt, pp, ss, jj, ch", () => {
    const cases: [string, string][] = [
      ["kka", "까"], ["tta", "따"], ["ppa", "빠"],
      ["ssa", "싸"], ["jja", "짜"], ["cha", "차"],
    ];
    for (const [r, h] of cases) expect(compose(r)).toEqual([h]);
  });
});

describe("KoreanRomajaIME — finals (batchim)", () => {
  test("an → 안 (final ㄴ)", () => expect(compose("an")).toEqual(["안"]));
  test("gam → 감 (final ㅁ)", () => expect(compose("gam")).toEqual(["감"]));
  test("hap → 합 (final ㅂ)", () => expect(compose("hap")).toEqual(["합"]));
  test("gang → 강 (final ㅇ via ng)", () =>
    expect(compose("gang")).toEqual(["강"]));
  test("gal → 갈 (final ㄹ)", () => expect(compose("gal")).toEqual(["갈"]));
  test("joh → 좋 (final ㅎ)", () => expect(compose("joh")).toEqual(["좋"]));
});

describe("KoreanRomajaIME — multi-syllable words", () => {
  test("annyeong → 안 + 녕 (the word 안녕)", () =>
    expect(compose("annyeong")).toEqual(["안", "녕"]));

  test("annyeonghaseyo → 안녕하세요 (greeting)", () =>
    expect(compose("annyeonghaseyo")).toEqual([
      "안", "녕", "하", "세", "요",
    ]));

  test("gamsahamnida → 감사함니다 (typed romaja form)", () =>
    expect(compose("gamsahamnida")).toEqual([
      "감", "사", "함", "니", "다",
    ]));

  test("amerikano → 아메리카노 (americano)", () =>
    expect(compose("amerikano")).toEqual([
      "아", "메", "리", "카", "노",
    ]));
});

describe("KoreanRomajaIME — buffer + flush", () => {
  test("buffer() exposes pending input mid-composition", () => {
    const ime = new KoreanRomajaIME();
    feed(ime, "a"); // 'a' could extend to "ae", "an", etc. — wait
    expect(ime.buffer()).toBe("a");
  });

  test("flush() drains the buffer at end of input", () => {
    const ime = new KoreanRomajaIME();
    feed(ime, "ka");
    expect(flush(ime)).toEqual(["카"]);
    expect(ime.buffer()).toBe("");
  });

  test("reset() clears buffer", () => {
    const ime = new KoreanRomajaIME();
    feed(ime, "k");
    expect(ime.buffer()).toBe("k");
    ime.reset();
    expect(ime.buffer()).toBe("");
  });
});

describe("KoreanRomajaIME — punctuation + whitespace", () => {
  test("ASCII space passes through (Korean uses spaces between words)", () => {
    const i = new KoreanRomajaIME();
    expect([...i.feed(" ")]).toEqual([" "]);
  });

  test("ASCII , . ? ! pass through", () => {
    const i = new KoreanRomajaIME();
    expect([...i.feed(",")]).toEqual([","]);
    expect([...i.feed(".")]).toEqual(["."]);
    expect([...i.feed("?")]).toEqual(["?"]);
    expect([...i.feed("!")]).toEqual(["!"]);
  });

  test("Hangul chars pass through unchanged", () => {
    const i = new KoreanRomajaIME();
    expect([...i.feed("안")]).toEqual(["안"]);
  });
});
