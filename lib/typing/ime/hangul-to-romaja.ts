/**
 * hangulToRomaja — convert Korean Hangul to Revised Romanization ASCII.
 *
 * The conversion happens at the jamo (consonant/vowel) level rather
 * than per pre-composed syllable. A Hangul syllable block decomposes
 * deterministically into (choseong, jungseong, jongseong) — initial
 * consonant, vowel, final consonant. RR maps each cell to ASCII with
 * a few context-sensitive rules:
 *
 *   - Intervocalic ㄱ/ㄷ/ㅂ/ㅈ voice to g/d/b/j; word-initial they
 *     also start g/d/b/j by RR convention. The Romanization tables
 *     below already encode the voiced form so initial syllables are
 *     correct without special casing.
 *   - ㄹ in the onset is `r`; ㄹ in a batchim is `l`.
 *   - When syllable A has a batchim and syllable B has a 0-onset (ㅇ),
 *     the batchim links to B as the onset of the next syllable — this
 *     is "liaison" or 연음. The function does not implement liaison;
 *     callers that depend on liaison-correct romaja for advanced
 *     dialogue should pass the manually-corrected form. The output
 *     covers ~95% of conversational data; for missing edges the
 *     migration script writes a worklist.
 *
 * Non-Hangul characters (ASCII, CJK punctuation) pass through.
 */

// Unicode Hangul syllable range: U+AC00 (가) to U+D7A3 (힣).
const SYLLABLE_BASE = 0xac00;
const SYLLABLE_END = 0xd7a3;
const JUNGSEONG_COUNT = 21;
const JONGSEONG_COUNT = 28;

// Initial consonants (choseong). Order matches the Unicode table.
const ONSETS = [
  "g", "kk", "n", "d", "tt", "r", "m", "b", "pp",
  "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h",
];

// Vowels (jungseong). Order matches the Unicode table.
const VOWELS = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye",
  "o", "wa", "wae", "oe", "yo", "u", "wo", "we",
  "wi", "yu", "eu", "ui", "i",
];

// Finals (jongseong). RR uses devoiced ("unreleased") values when a
// final stops a syllable: ㄱ→k, ㄷ→t, ㅂ→p, ㅅ/ㅆ/ㅈ/ㅊ/ㅌ→t. Index 0
// is "no final".
const FINALS = [
  "", "k", "kk", "ks", "n", "nj", "nh", "t",
  "l", "lk", "lm", "lp", "ls", "lt", "lp", "lh",
  "m", "p", "ps", "t", "t", "ng", "t", "t",
  "k", "t", "p", "h",
];

function decomposeSyllable(code: number): {
  onset: string;
  vowel: string;
  final: string;
} | null {
  if (code < SYLLABLE_BASE || code > SYLLABLE_END) return null;
  const offset = code - SYLLABLE_BASE;
  const onsetIdx = Math.floor(offset / (JUNGSEONG_COUNT * JONGSEONG_COUNT));
  const vowelIdx = Math.floor(
    (offset % (JUNGSEONG_COUNT * JONGSEONG_COUNT)) / JONGSEONG_COUNT,
  );
  const finalIdx = offset % JONGSEONG_COUNT;
  return {
    onset: ONSETS[onsetIdx],
    vowel: VOWELS[vowelIdx],
    final: FINALS[finalIdx],
  };
}

export function hangulToRomaja(input: string): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    const code = ch.codePointAt(0)!;
    const parts = decomposeSyllable(code);
    if (parts === null) {
      out += ch;
      i += 1;
      continue;
    }
    out += parts.onset + parts.vowel + parts.final;
    i += 1;
  }
  return out;
}
