/**
 * TDD spec for hangulToRomaja — Korean (Revised Romanization) converter.
 *
 * Conventions:
 *   - Standard Revised Romanization of Korean (RR) per the National
 *     Institute of Korean Language. ASCII only.
 *   - Linking rules between syllables: ㄱ/ㄷ/ㅂ are voiced (g/d/b)
 *     intervocalically, devoiced (k/t/p) before a hard consonant or
 *     word boundary.
 *   - ㄹ is `r` between vowels, `l` before consonants or at the end.
 *   - ㅎ before ㄱ/ㄷ/ㅈ/ㅂ aspirates the following consonant.
 *   - Non-hangul characters (ASCII, kanji-style punctuation) pass
 *     through unchanged.
 *
 * Scope: enough to derive readable romaja from typical loanword and
 * conversational hangul in the dialogue scripts. Not a complete RR
 * spec — rare/archaic syllables and exotic ㅎ assimilation patterns
 * fall back to per-syllable letter mapping with the standard onset
 * voicing rule.
 */
import { describe, expect, test } from "vitest";
import { hangulToRomaja } from "@/lib/typing/ime/hangul-to-romaja";

describe("hangulToRomaja — empty + pass-through", () => {
  test("empty string", () => {
    expect(hangulToRomaja("")).toBe("");
  });

  test("ASCII passes through", () => {
    expect(hangulToRomaja("hello")).toBe("hello");
  });

  test("non-hangul punctuation passes through", () => {
    expect(hangulToRomaja(".,!?")).toBe(".,!?");
  });
});

describe("hangulToRomaja — basic syllables", () => {
  test.each([
    ["가", "ga"],
    ["나", "na"],
    ["다", "da"],
    ["라", "ra"],
    ["마", "ma"],
    ["바", "ba"],
    ["사", "sa"],
    ["아", "a"],
    ["자", "ja"],
    ["차", "cha"],
    ["카", "ka"],
    ["타", "ta"],
    ["파", "pa"],
    ["하", "ha"],
  ])("초성 %s → %s", (kana, romaja) => {
    expect(hangulToRomaja(kana)).toBe(romaja);
  });

  test.each([
    ["이", "i"],
    ["우", "u"],
    ["에", "e"],
    ["오", "o"],
    ["어", "eo"],
    ["요", "yo"],
    ["야", "ya"],
    ["유", "yu"],
    ["예", "ye"],
    ["여", "yeo"],
    ["와", "wa"],
    ["워", "wo"],
    ["의", "ui"],
    ["위", "wi"],
  ])("vowel %s → %s", (kana, romaja) => {
    expect(hangulToRomaja(kana)).toBe(romaja);
  });
});

describe("hangulToRomaja — words with batchim (final consonants)", () => {
  test.each([
    ["국", "guk"], // 국 (soup)
    ["맥", "maek"], // 맥
    ["감", "gam"], // 감 (persimmon)
    ["밤", "bam"], // 밤
    ["산", "san"], // 산 (mountain)
    ["방", "bang"], // 방
    ["꽃", "kkot"], // 꽃 (flower) — t-stop final
    ["옷", "ot"], // 옷
    ["밥", "bap"], // 밥 (rice)
    ["물", "mul"], // 물 (water) — final ㄹ → l
    ["일", "il"], // 일
  ])("syllable %s → %s", (kana, romaja) => {
    expect(hangulToRomaja(kana)).toBe(romaja);
  });
});

describe("hangulToRomaja — multi-syllable words", () => {
  test.each([
    ["안녕", "annyeong"], // hello
    ["감사", "gamsa"], // thanks (root)
    ["사랑", "sarang"], // love
    ["미안", "mian"], // sorry (root)
    ["진짜", "jinjja"], // really
    ["김치", "gimchi"], // kimchi
    ["서울", "seoul"], // Seoul
    ["한국", "hanguk"], // Korea
    ["대한민국", "daehanminguk"], // Republic of Korea
    ["고맙다", "gomapda"],
  ])("%s → %s", (kana, romaja) => {
    expect(hangulToRomaja(kana)).toBe(romaja);
  });
});

describe("hangulToRomaja — intervocalic voicing of ㄱ/ㄷ/ㅂ", () => {
  test("가나 → gana (ㄱ stays g)", () => {
    expect(hangulToRomaja("가나")).toBe("gana");
  });

  test("아기 → agi (intervocalic ㄱ → g)", () => {
    expect(hangulToRomaja("아기")).toBe("agi");
  });

  test("바다 → bada (intervocalic ㄷ → d)", () => {
    expect(hangulToRomaja("바다")).toBe("bada");
  });

  test("아버지 → abeoji", () => {
    expect(hangulToRomaja("아버지")).toBe("abeoji");
  });
});

describe("hangulToRomaja — particles and short words", () => {
  test.each([
    ["은", "eun"],
    ["는", "neun"],
    ["을", "eul"],
    ["를", "reul"],
    ["이", "i"],
    ["가", "ga"],
    ["에", "e"],
    ["의", "ui"],
    ["도", "do"],
  ])("particle %s → %s", (kana, romaja) => {
    expect(hangulToRomaja(kana)).toBe(romaja);
  });
});

describe("hangulToRomaja — mixed hangul + ASCII", () => {
  test("hangul followed by space and ASCII", () => {
    expect(hangulToRomaja("안녕 hello")).toBe("annyeong hello");
  });

  test("punctuation between syllables", () => {
    expect(hangulToRomaja("안녕, 하세요")).toBe("annyeong, haseyo");
  });
});

describe("hangulToRomaja — ng final + initial vowel keeps boundary", () => {
  // 한국 (Korea): 한 + 국 — 한 ends in ㄴ, 국 starts with ㄱ → ng-uk no.
  // 안녕: 안 ends in ㄴ, 녕 starts with ㄴ — annyeong.
  test("쌍받침-free join behaves predictably", () => {
    expect(hangulToRomaja("한국")).toBe("hanguk");
    expect(hangulToRomaja("강아지")).toBe("gangaji"); // ng + a stays as is per RR
  });
});

describe("hangulToRomaja — sentence-level dialogue samples", () => {
  test("정말 미안해 → jeongmal mianhae", () => {
    expect(hangulToRomaja("정말 미안해")).toBe("jeongmal mianhae");
  });

  test("계속 → gyesok", () => {
    expect(hangulToRomaja("계속")).toBe("gyesok");
  });

  test("이따 봐 → itta bwa", () => {
    expect(hangulToRomaja("이따 봐")).toBe("itta bwa");
  });
});
