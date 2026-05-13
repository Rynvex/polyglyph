/**
 * TDD spec for kanaToHepburn — pure function converting hiragana /
 * katakana strings to wapuro-style Hepburn ASCII.
 *
 * Conventions (locked 2026-05 per user direction):
 *   - Long vowels are written literally as kana: おう→ou, おお→oo,
 *     えい→ei (no macron).
 *   - ん is always `n` (shinbun, not shimbun) — no nasal-assimilation rule.
 *   - は/へ/を are written as ha/he/wo (kana literal, NOT particle pronunciation).
 *   - Sokuon doubles the next consonant. For ち-row: っち→tchi (single
 *     leading t before ch digraph), っちゃ→tcha, っちゅ→tchu, っちょ→tcho.
 *   - Katakana ー (chōonpu) repeats the previous vowel: アー→aa, コー→koo.
 *   - Non-kana characters (ASCII, CJK punctuation, kanji) pass through verbatim.
 */
import { describe, expect, test } from "vitest";
import { kanaToHepburn } from "@/lib/typing/ime/kana-to-hepburn";

describe("kanaToHepburn — empty and pass-through", () => {
  test("empty string", () => {
    expect(kanaToHepburn("")).toBe("");
  });

  test("ASCII passes through", () => {
    expect(kanaToHepburn("hello")).toBe("hello");
    expect(kanaToHepburn("a, b. 1!")).toBe("a, b. 1!");
  });

  test("non-kana CJK (kanji, punctuation) passes through", () => {
    expect(kanaToHepburn("漢字")).toBe("漢字");
    expect(kanaToHepburn("、。「」")).toBe("、。「」");
  });
});

describe("kanaToHepburn — basic hiragana", () => {
  test.each([
    ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
    ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
    ["が", "ga"], ["ぎ", "gi"], ["ぐ", "gu"], ["げ", "ge"], ["ご", "go"],
    ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
    ["ざ", "za"], ["じ", "ji"], ["ず", "zu"], ["ぜ", "ze"], ["ぞ", "zo"],
    ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
    ["だ", "da"], ["ぢ", "ji"], ["づ", "zu"], ["で", "de"], ["ど", "do"],
    ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
    ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
    ["ば", "ba"], ["び", "bi"], ["ぶ", "bu"], ["べ", "be"], ["ぼ", "bo"],
    ["ぱ", "pa"], ["ぴ", "pi"], ["ぷ", "pu"], ["ぺ", "pe"], ["ぽ", "po"],
    ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
    ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"],
    ["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"],
    ["わ", "wa"], ["を", "wo"], ["ん", "n"],
  ])("hiragana %s → %s", (kana, hepburn) => {
    expect(kanaToHepburn(kana)).toBe(hepburn);
  });
});

describe("kanaToHepburn — basic katakana", () => {
  test.each([
    ["ア", "a"], ["イ", "i"], ["ウ", "u"], ["エ", "e"], ["オ", "o"],
    ["カ", "ka"], ["キ", "ki"], ["ク", "ku"], ["ケ", "ke"], ["コ", "ko"],
    ["シ", "shi"], ["チ", "chi"], ["ツ", "tsu"], ["フ", "fu"],
    ["ジ", "ji"], ["ヂ", "ji"], ["ヅ", "zu"],
    ["ナ", "na"], ["ハ", "ha"], ["マ", "ma"], ["ヤ", "ya"],
    ["ラ", "ra"], ["ワ", "wa"], ["ヲ", "wo"], ["ン", "n"],
    ["ガ", "ga"], ["パ", "pa"], ["ビ", "bi"],
  ])("katakana %s → %s", (kana, hepburn) => {
    expect(kanaToHepburn(kana)).toBe(hepburn);
  });
});

describe("kanaToHepburn — yoon (composite syllables)", () => {
  test.each([
    // k-row
    ["きゃ", "kya"], ["きゅ", "kyu"], ["きょ", "kyo"],
    ["ぎゃ", "gya"], ["ぎゅ", "gyu"], ["ぎょ", "gyo"],
    // s-row
    ["しゃ", "sha"], ["しゅ", "shu"], ["しょ", "sho"],
    ["じゃ", "ja"], ["じゅ", "ju"], ["じょ", "jo"],
    // t-row
    ["ちゃ", "cha"], ["ちゅ", "chu"], ["ちょ", "cho"],
    // n-row
    ["にゃ", "nya"], ["にゅ", "nyu"], ["にょ", "nyo"],
    // h-row
    ["ひゃ", "hya"], ["ひゅ", "hyu"], ["ひょ", "hyo"],
    ["びゃ", "bya"], ["びゅ", "byu"], ["びょ", "byo"],
    ["ぴゃ", "pya"], ["ぴゅ", "pyu"], ["ぴょ", "pyo"],
    // m-row
    ["みゃ", "mya"], ["みゅ", "myu"], ["みょ", "myo"],
    // r-row
    ["りゃ", "rya"], ["りゅ", "ryu"], ["りょ", "ryo"],
  ])("hiragana yoon %s → %s", (kana, hepburn) => {
    expect(kanaToHepburn(kana)).toBe(hepburn);
  });

  test.each([
    ["キャ", "kya"], ["シャ", "sha"], ["チャ", "cha"], ["ジャ", "ja"],
    ["リョ", "ryo"], ["ニュ", "nyu"],
  ])("katakana yoon %s → %s", (kana, hepburn) => {
    expect(kanaToHepburn(kana)).toBe(hepburn);
  });
});

describe("kanaToHepburn — sokuon (doubled consonants)", () => {
  test.each([
    ["かった", "katta"], // 買った
    ["きって", "kitte"], // 切手
    ["せっけん", "sekken"], // 石鹸
    ["ざっし", "zasshi"], // 雑誌 (sokuon + shi → sshi)
    ["いっち", "itchi"], // 一致 (sokuon + chi → tchi: t prefix before ch)
    ["ぶっちゃけ", "butchake"], // sokuon + cha → tcha
    ["みっつ", "mittsu"], // 三つ (sokuon + tsu → ttsu)
    ["はっぱ", "happa"], // 葉っぱ
    ["がっこう", "gakkou"], // 学校
  ])("sokuon %s → %s", (kana, hepburn) => {
    expect(kanaToHepburn(kana)).toBe(hepburn);
  });

  test.each([
    ["カット", "katto"],
    ["キッチン", "kitchin"], // sokuon + chi → tchi (kitchen)
    ["スッキリ", "sukkiri"],
  ])("katakana sokuon %s → %s", (kana, hepburn) => {
    expect(kanaToHepburn(kana)).toBe(hepburn);
  });

  test("trailing sokuon (no following consonant) is silently dropped", () => {
    // Expressive forms like 「はっ」 / 「ははっ」 occur in dialogue scripts.
    // Since there is no consonant to double, the sokuon is dropped so
    // the typing target is well-formed Hepburn.
    expect(kanaToHepburn("あっ")).toBe("a");
    expect(kanaToHepburn("ははっ")).toBe("haha");
  });
});

describe("kanaToHepburn — n handling", () => {
  test("ん at end", () => {
    expect(kanaToHepburn("さん")).toBe("san");
    expect(kanaToHepburn("ほん")).toBe("hon");
  });

  test("ん before consonants — always n (no shimbun assimilation)", () => {
    expect(kanaToHepburn("しんぶん")).toBe("shinbun"); // 新聞
    expect(kanaToHepburn("こんぴゅーた")).toBe("konpyuuta");
    expect(kanaToHepburn("さんま")).toBe("sanma");
  });

  test("ん before vowel/y stays as plain n (wapuro convention)", () => {
    // 案内 あんない — ambiguous in real Hepburn (an'nai vs annai). Wapuro
    // doesn't insert apostrophes; n + na is just nna.
    expect(kanaToHepburn("あんない")).toBe("annai");
    // 単位 たんい
    expect(kanaToHepburn("たんい")).toBe("tani");
  });
});

describe("kanaToHepburn — long vowels", () => {
  test("hiragana literal long vowels", () => {
    expect(kanaToHepburn("おう")).toBe("ou"); // う in 王
    expect(kanaToHepburn("おお")).toBe("oo"); // お in 大きい
    expect(kanaToHepburn("えい")).toBe("ei"); // い in 英語
    expect(kanaToHepburn("ええ")).toBe("ee");
    expect(kanaToHepburn("いい")).toBe("ii");
    expect(kanaToHepburn("うう")).toBe("uu");
    expect(kanaToHepburn("ああ")).toBe("aa");
  });

  test("katakana ー repeats previous vowel", () => {
    expect(kanaToHepburn("コーヒー")).toBe("koohii");
    expect(kanaToHepburn("カー")).toBe("kaa");
    expect(kanaToHepburn("スーパー")).toBe("suupaa");
    expect(kanaToHepburn("ナビ")).toBe("nabi");
    expect(kanaToHepburn("ノート")).toBe("nooto");
  });

  test("katakana ー after yoon repeats the vowel of the small kana", () => {
    expect(kanaToHepburn("シャー")).toBe("shaa");
    expect(kanaToHepburn("チューブ")).toBe("chuubu");
  });

  test("ー with no preceding vowel passes through", () => {
    expect(kanaToHepburn("ー")).toBe("ー");
  });
});

describe("kanaToHepburn — particles literal", () => {
  test("は/へ/を written literally as ha/he/wo", () => {
    // 「私は」 watashiha (literal), not watashiwa
    expect(kanaToHepburn("わたしは")).toBe("watashiha");
    // 「学校へ」 gakkouhe
    expect(kanaToHepburn("がっこうへ")).toBe("gakkouhe");
    // 「ほんを」 honwo
    expect(kanaToHepburn("ほんを")).toBe("honwo");
  });
});

describe("kanaToHepburn — full sentences from real ja data", () => {
  test("ありがとうございます → arigatougozaimasu", () => {
    expect(kanaToHepburn("ありがとうございます")).toBe("arigatougozaimasu");
  });

  test("おはようございます → ohayougozaimasu", () => {
    expect(kanaToHepburn("おはようございます")).toBe("ohayougozaimasu");
  });

  test("hontou ni gomen (本当にごめん) — 「ほんとうにごめん」", () => {
    expect(kanaToHepburn("ほんとうにごめん")).toBe("hontounigomen");
  });

  test("juutai (渋滞) — 「じゅうたい」", () => {
    expect(kanaToHepburn("じゅうたい")).toBe("juutai");
  });

  test("hamatteru (ハマってる) mixed katakana + sokuon hiragana", () => {
    expect(kanaToHepburn("ハマってる")).toBe("hamatteru");
  });

  test("zenzenugokanai (全然動かない) — 「ぜんぜんうごかない」", () => {
    expect(kanaToHepburn("ぜんぜんうごかない")).toBe("zenzenugokanai");
  });

  test("nijuppun (二十分 colloquial) — 「にじゅっぷん」", () => {
    expect(kanaToHepburn("にじゅっぷん")).toBe("nijuppun");
  });
});

describe("kanaToHepburn — mixed kanji + kana passes kanji unchanged", () => {
  test("kanji in middle of kana", () => {
    expect(kanaToHepburn("本当")).toBe("本当");
    expect(kanaToHepburn("本当に")).toBe("本当ni");
    expect(kanaToHepburn("学校へ行く")).toBe("学校he行ku");
  });
});

describe("kanaToHepburn — small ぁ/ぃ/ぅ/ぇ/ぉ standalone", () => {
  test("standalone small vowel falls back to bare vowel char", () => {
    // Used after fu/we/etc to write foreign-sound combinations; when
    // they're standalone (no preceding consonant kana), emit as-is.
    expect(kanaToHepburn("ぁ")).toBe("a");
    expect(kanaToHepburn("ぃ")).toBe("i");
    expect(kanaToHepburn("ぅ")).toBe("u");
    expect(kanaToHepburn("ぇ")).toBe("e");
    expect(kanaToHepburn("ぉ")).toBe("o");
  });

  test("foreign-sound combos with small vowel", () => {
    expect(kanaToHepburn("ふぁ")).toBe("fa");
    expect(kanaToHepburn("ふぃ")).toBe("fi");
    expect(kanaToHepburn("ふぇ")).toBe("fe");
    expect(kanaToHepburn("ふぉ")).toBe("fo");
    expect(kanaToHepburn("ウィ")).toBe("wi");
    expect(kanaToHepburn("ウェ")).toBe("we");
    expect(kanaToHepburn("ウォ")).toBe("wo");
    expect(kanaToHepburn("ティ")).toBe("ti"); // common loanword consonant
    expect(kanaToHepburn("ディ")).toBe("di");
    expect(kanaToHepburn("チェ")).toBe("che");
    expect(kanaToHepburn("ジェ")).toBe("je");
    expect(kanaToHepburn("シェ")).toBe("she");
  });
});
