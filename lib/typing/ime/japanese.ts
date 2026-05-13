/**
 * JapaneseHiraganaIME — converts Hepburn romaji input to hiragana.
 *
 * Each emitted character corresponds to one cell in the typing target.
 * Yoon (composite syllables like きゃ) emit two characters since the
 * target text spells them as two cells.
 *
 * Scope:
 *   - Full hiragana coverage (vowels, k/g/s/z/t/d/n/h/f/b/p/m/y/r/w rows,
 *     yoon, sokuon, ん rules)
 *   - ASCII punctuation auto-converted to Japanese form (,→、 .→。)
 *   - Case-insensitive input
 *   - Native CJK punctuation passes through unchanged
 *
 * Out of scope (deferred to future IME work):
 *   - Katakana (typing target rewritten in hiragana for now)
 *   - Kanji conversion (kana spelling used in typing target)
 *   - Long-vowel mark ー (use うう / ええ / おう conventions instead)
 */

import type { InputMethod } from "./types";

const SINGLE: Record<string, string> = {
  a: "あ",
  i: "い",
  u: "う",
  e: "え",
  o: "お",
};

// 2-char input. Includes special syllables (shi-style 3-char are in TRIPLE).
const PAIR: Record<string, string> = {
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  sa: "さ", su: "す", se: "せ", so: "そ",
  za: "ざ", ze: "ぜ", zo: "ぞ",
  ta: "た", te: "て", to: "と",
  da: "だ", de: "で", "do": "ど",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", he: "へ", ho: "ほ",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wo: "を",
  // Special length-2 (irregular romanization)
  fu: "ふ", ji: "じ", zu: "ず",
  // J-row yoon (2-char input → 2-char kana output)
  ja: "じゃ", ju: "じゅ", jo: "じょ",
  // Kunrei-shiki / Nihon-shiki aliases — Mozc and MS-IME accept both.
  // Same kana output as the Hepburn forms in TRIPLE / PAIR.
  si: "し", ti: "ち", tu: "つ",
  zi: "じ", di: "じ", du: "ず", hu: "ふ",
  // Foreign-sound combinations (loanword phonetics). Hiragana with
  // small vowels — common in カタカナ words like マフィン (mafin),
  // ウェブ (webu), パーティー (paatii), ジェット (jetto).
  fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ",
  we: "うぇ", wi: "うぃ", je: "じぇ", ye: "いぇ",
};

// 3-char input. shi/chi/tsu produce single kana; the rest are yoon
// (2-char kana output).
const TRIPLE: Record<string, string> = {
  shi: "し", chi: "ち", tsu: "つ",
  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  // Kunrei-shiki / common alt yoon spellings.
  sya: "しゃ", syu: "しゅ", syo: "しょ",
  tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ",
  zya: "じゃ", zyu: "じゅ", zyo: "じょ",
  jya: "じゃ", jyu: "じゅ", jyo: "じょ",
};

// ASCII → Japanese punctuation. Full-width Japanese punctuation already
// in the input passes through unchanged via the non-letter branch.
const PUNCT_MAP: Record<string, string> = {
  ",": "、",
  ".": "。",
  "?": "?",
  "!": "!",
  "-": "ー", // long-vowel mark (Mozc default behavior)
  "~": "〜", // wave dash
  "[": "「",
  "]": "」",
};

const VOWELS = new Set(["a", "i", "u", "e", "o"]);
const SOKUON_CONSONANTS = /^[kgszjtdhfbpmrw]$/;

// Build the set of valid prefixes from all keys so the IME knows when
// to wait vs. flush an unmatched first char.
const PREFIXES = (() => {
  const out = new Set<string>();
  const allKeys = [
    ...Object.keys(SINGLE),
    ...Object.keys(PAIR),
    ...Object.keys(TRIPLE),
  ];
  for (const k of allKeys) {
    for (let i = 1; i < k.length; i++) out.add(k.slice(0, i));
  }
  return out;
})();

export class JapaneseHiraganaIME implements InputMethod {
  private buf = "";

  *feed(raw: string): Iterable<string> {
    const out: string[] = [];
    for (const ch of raw) {
      this.buf += ch.toLowerCase();
      while (this.tryEmit(out)) {
        // keep draining
      }
    }
    for (const c of out) yield c;
  }

  reset(): void {
    this.buf = "";
  }

  *flush(): Iterable<string> {
    // Trailing standalone `n` is ambiguous mid-input (could become `na`),
    // so the buffer waits. At end-of-input we commit it as ん, matching
    // Mozc's real-world behavior when the user stops typing.
    if (this.buf === "n") {
      this.buf = "";
      yield "ん";
      return;
    }
    // Any other residue is unconsumable input — dump as raw so the
    // engine flags it as a typo and tooling (validator) can catch it.
    const remaining = this.buf;
    this.buf = "";
    for (const ch of remaining) yield ch;
  }

  buffer(): string {
    return this.buf;
  }

  private tryEmit(out: string[]): boolean {
    if (this.buf.length === 0) return false;

    // 1. Try TRIPLE (longest match first).
    if (this.buf.length >= 3) {
      const key = this.buf.slice(0, 3);
      const kana = TRIPLE[key];
      if (kana !== undefined) {
        for (const c of kana) out.push(c);
        this.buf = this.buf.slice(3);
        return true;
      }
    }

    // 2. Try PAIR.
    if (this.buf.length >= 2) {
      const key = this.buf.slice(0, 2);
      const kana = PAIR[key];
      if (kana !== undefined) {
        for (const c of kana) out.push(c);
        this.buf = this.buf.slice(2);
        return true;
      }
    }

    // 3. n-handling (must run before sokuon, since 'nn' shouldn't sokuon).
    //    Real-IME-style: 'n' followed by anything that isn't a vowel or
    //    'y' commits ん. That covers other consonant letters (`na/ni/...`
    //    can't start with `n<consonant>`) AND non-letter boundaries like
    //    spaces and punctuation — both signal "not extending into an
    //    n-syllable". The triggering char stays in the buffer for the
    //    next pass. Doubled 'nn' → ん, second 'n' kept then flushed.
    if (this.buf.length >= 2 && this.buf[0] === "n") {
      const next = this.buf[1];
      const formsValidStart = VOWELS.has(next) || next === "y";
      if (!formsValidStart) {
        out.push("ん");
        this.buf = this.buf.slice(1);
        return true;
      }
    }

    // 4. Sokuon: doubled consonant → っ + remainder.
    if (this.buf.length >= 2 && this.buf[0] === this.buf[1]) {
      if (SOKUON_CONSONANTS.test(this.buf[0])) {
        out.push("っ");
        this.buf = this.buf.slice(1);
        return true;
      }
    }

    // 5. SINGLE (vowel).
    const single = SINGLE[this.buf[0]];
    if (single !== undefined) {
      out.push(single);
      this.buf = this.buf.slice(1);
      return true;
    }

    // 6. Punctuation.
    const c0 = this.buf[0];
    if (PUNCT_MAP[c0] !== undefined) {
      out.push(PUNCT_MAP[c0]);
      this.buf = this.buf.slice(1);
      return true;
    }
    if (!/[a-z]/.test(c0)) {
      // Non-letter (CJK punctuation, digit, etc.) — emit as-is.
      out.push(c0);
      this.buf = this.buf.slice(1);
      return true;
    }

    // 7. Letter without immediate match — wait if it could still
    //    extend to a known mapping; otherwise dump first char as-is
    //    (typo escape so the user isn't stuck).
    if (this.buf.length === 1) {
      // Could extend (e.g. "k" → "ka"). Wait.
      return false;
    }
    if (this.buf.length === 2 && PREFIXES.has(this.buf)) {
      // 2-char prefix that could extend to a TRIPLE (e.g. "sh", "ky").
      return false;
    }
    // Unknown — dump first char so input flows.
    out.push(this.buf[0]);
    this.buf = this.buf.slice(1);
    return true;
  }
}
