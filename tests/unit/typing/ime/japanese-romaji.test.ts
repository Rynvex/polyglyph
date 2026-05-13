/**
 * TDD spec for JapaneseRomajiIME — Kunrei → Hepburn normalizer.
 *
 * Targets in dialogue scripts are stored in Hepburn (`shi`, `chi`, `tsu`,
 * `fu`, `ji`, `zu`, `sha`, `cha`, `ja`). Real Mozc / MS-IME also accept
 * Kunrei / Nihon-shiki spellings (`si`, `ti`, `tu`, `hu`, `zi`, `du`,
 * `sya`, `tya`, `zya`, `jya`). This IME buffers input, converts Kunrei
 * tokens to their Hepburn equivalents, and passes through Hepburn-style
 * input unchanged so the engine sees ASCII matching the stored target.
 */
import { describe, expect, test } from "vitest";
import { JapaneseRomajiIME } from "@/lib/typing/ime/japanese-romaji";

function feedAll(ime: JapaneseRomajiIME, input: string): string {
  const out: string[] = [];
  for (const ch of input) {
    for (const c of ime.feed(ch)) out.push(c);
  }
  if (typeof ime.flush === "function") {
    for (const c of ime.flush()) out.push(c);
  }
  return out.join("");
}

describe("JapaneseRomajiIME — Kunrei → Hepburn conversion", () => {
  test.each([
    ["si", "shi"],
    ["ti", "chi"],
    ["tu", "tsu"],
    ["hu", "fu"],
    ["zi", "ji"],
    ["di", "ji"],
    ["du", "zu"],
  ])("2-char Kunrei %s → Hepburn %s", (kunrei, hepburn) => {
    const ime = new JapaneseRomajiIME();
    expect(feedAll(ime, kunrei)).toBe(hepburn);
  });

  test.each([
    ["sya", "sha"],
    ["syu", "shu"],
    ["syo", "sho"],
    ["tya", "cha"],
    ["tyu", "chu"],
    ["tyo", "cho"],
    ["zya", "ja"],
    ["zyu", "ju"],
    ["zyo", "jo"],
    ["jya", "ja"],
    ["jyu", "ju"],
    ["jyo", "jo"],
  ])("3-char Kunrei %s → Hepburn %s", (kunrei, hepburn) => {
    const ime = new JapaneseRomajiIME();
    expect(feedAll(ime, kunrei)).toBe(hepburn);
  });
});

describe("JapaneseRomajiIME — Hepburn pass-through (no conversion)", () => {
  test.each([
    ["shi", "shi"],
    ["chi", "chi"],
    ["tsu", "tsu"],
    ["fu", "fu"],
    ["ji", "ji"],
    ["zu", "zu"],
    ["sha", "sha"],
    ["shu", "shu"],
    ["sho", "sho"],
    ["cha", "cha"],
    ["chu", "chu"],
    ["cho", "cho"],
    ["ja", "ja"],
    ["ju", "ju"],
    ["jo", "jo"],
  ])("Hepburn %s passes through as %s", (input, output) => {
    const ime = new JapaneseRomajiIME();
    expect(feedAll(ime, input)).toBe(output);
  });
});

describe("JapaneseRomajiIME — vowels and basic syllables pass through", () => {
  test.each(["a", "i", "u", "e", "o"])("vowel %s passes through", (v) => {
    const ime = new JapaneseRomajiIME();
    expect(feedAll(ime, v)).toBe(v);
  });

  test.each([
    "ka",
    "ki",
    "ku",
    "ke",
    "ko",
    "sa",
    "su",
    "se",
    "so",
    "ta",
    "te",
    "to",
    "na",
    "ni",
    "nu",
    "ne",
    "no",
    "ha",
    "he",
    "ho",
    "ma",
    "mu",
    "me",
    "mo",
    "ya",
    "yu",
    "yo",
    "ra",
    "ri",
    "ru",
    "re",
    "ro",
    "wa",
    "wo",
    "ga",
    "gi",
    "gu",
    "ge",
    "go",
    "za",
    "ze",
    "zo",
    "ba",
    "bi",
    "bu",
    "be",
    "bo",
    "pa",
    "pi",
    "pu",
    "pe",
    "po",
    "da",
    "de",
    "do",
  ])("Hepburn %s passes through unchanged", (s) => {
    const ime = new JapaneseRomajiIME();
    expect(feedAll(ime, s)).toBe(s);
  });
});

describe("JapaneseRomajiIME — sokuon (doubled consonants)", () => {
  test("ttu → ttsu (sokuon + tu)", () => {
    const ime = new JapaneseRomajiIME();
    expect(feedAll(ime, "ttu")).toBe("ttsu");
  });

  test("ssi → sshi (sokuon + si)", () => {
    const ime = new JapaneseRomajiIME();
    expect(feedAll(ime, "ssi")).toBe("sshi");
  });

  test("ttya → tcha (sokuon + tya, Hepburn drops doubled c)", () => {
    // っちゃ = ttya in Kunrei. Standard Hepburn writes it as `tcha` —
    // single leading `t` before the `ch` digraph. The IME converts
    // `tya`→`cha` and emits the leading `t` once, producing `tcha`.
    expect(feedAll(new JapaneseRomajiIME(), "ttya")).toBe("tcha");
  });

  test("Hepburn sokuon passes through verbatim", () => {
    expect(feedAll(new JapaneseRomajiIME(), "tta")).toBe("tta");
    expect(feedAll(new JapaneseRomajiIME(), "ttsu")).toBe("ttsu");
    expect(feedAll(new JapaneseRomajiIME(), "sshi")).toBe("sshi");
  });
});

describe("JapaneseRomajiIME — n handling", () => {
  test("standalone n flushes as n", () => {
    expect(feedAll(new JapaneseRomajiIME(), "n")).toBe("n");
  });

  test("n followed by consonant emits n then consonant", () => {
    expect(feedAll(new JapaneseRomajiIME(), "nb")).toBe("nb");
    expect(feedAll(new JapaneseRomajiIME(), "nk")).toBe("nk");
  });

  test("n at end of word", () => {
    expect(feedAll(new JapaneseRomajiIME(), "san")).toBe("san");
  });
});

describe("JapaneseRomajiIME — mixed and longer words", () => {
  test("Kunrei sentence converts to Hepburn", () => {
    // ありがとうございます = arigatougozaimasu (Hepburn)
    // No Kunrei-specific syllables here, passes through.
    expect(feedAll(new JapaneseRomajiIME(), "arigatougozaimasu")).toBe(
      "arigatougozaimasu",
    );
  });

  test("hatuon (Kunrei) → hatsuon (Hepburn) — 発音", () => {
    expect(feedAll(new JapaneseRomajiIME(), "hatuon")).toBe("hatsuon");
  });

  test("syashin (Kunrei) → shashin (Hepburn) — 写真", () => {
    expect(feedAll(new JapaneseRomajiIME(), "syasin")).toBe("shashin");
  });

  test("tizu (Kunrei) → chizu (Hepburn) — 地図", () => {
    expect(feedAll(new JapaneseRomajiIME(), "tizu")).toBe("chizu");
  });

  test("zyuusyo (Kunrei) → juusho (Hepburn) — 住所", () => {
    expect(feedAll(new JapaneseRomajiIME(), "zyuusyo")).toBe("juusho");
  });

  test("hunnijuppun (Kunrei `hu`) → funnijuppun (Hepburn `fu`)", () => {
    // The buggy ja sample `morning_commute_a2 / t4` stored `hu` for
    // ふん, which is Kunrei not Hepburn. The IME normalizes `hu`→`fu`
    // so a player typing the buggy spelling still produces a valid
    // Hepburn stream. The migration in A3 will rewrite stored targets
    // to start with `fu` so this conversion becomes a no-op in practice.
    const out = feedAll(new JapaneseRomajiIME(), "hunnijuppun");
    expect(out).toBe("funnijuppun");
  });

  test("Hepburn shashin passes through", () => {
    expect(feedAll(new JapaneseRomajiIME(), "shashin")).toBe("shashin");
  });
});

describe("JapaneseRomajiIME — case folding and unknown chars", () => {
  test("uppercase Kunrei is normalized to lowercase Hepburn", () => {
    expect(feedAll(new JapaneseRomajiIME(), "SI")).toBe("shi");
    expect(feedAll(new JapaneseRomajiIME(), "TYa")).toBe("cha");
  });

  test("non-letters pass through unchanged", () => {
    expect(feedAll(new JapaneseRomajiIME(), "a, b.")).toBe("a, b.");
    expect(feedAll(new JapaneseRomajiIME(), "12")).toBe("12");
  });
});

describe("JapaneseRomajiIME — buffer / reset semantics", () => {
  test("buffer exposes pending input mid-composition", () => {
    const ime = new JapaneseRomajiIME();
    Array.from(ime.feed("s"));
    expect(ime.buffer()).toBe("s");
    Array.from(ime.feed("y"));
    expect(ime.buffer()).toBe("sy");
    const out = Array.from(ime.feed("a"));
    expect(out.join("")).toBe("sha");
    expect(ime.buffer()).toBe("");
  });

  test("reset clears pending buffer", () => {
    const ime = new JapaneseRomajiIME();
    Array.from(ime.feed("s"));
    ime.reset();
    expect(ime.buffer()).toBe("");
    expect(feedAll(ime, "i")).toBe("i");
  });

  test("flush drains residual buffer as raw chars", () => {
    const ime = new JapaneseRomajiIME();
    Array.from(ime.feed("s"));
    expect(Array.from(ime.flush()).join("")).toBe("s");
    expect(ime.buffer()).toBe("");
  });
});
