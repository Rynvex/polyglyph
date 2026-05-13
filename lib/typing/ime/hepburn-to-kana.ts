/**
 * hepburnToKana — best-effort reverse of kanaToHepburn for the A3
 * migration. Produces hiragana from wapuro Hepburn ASCII.
 *
 * Coverage: standard syllables + yoon + sokuon (including `tch` pattern
 * for っち rows) + the digraphs (sh*, ch*, ts*). Long vowels stay
 * literal (`ou`→おう, `ee`→ええ).
 *
 * Ambiguities: Hepburn collapses ぢ/じ and づ/ず. The reverse picks the
 * common kana (じ, ず). Callers that need the rare kana should adjust
 * manually after migration.
 *
 * NOT a pure inverse of kanaToHepburn — kanji-derived ro is not
 * reversible without dictionary lookup, so callers must verify the
 * round-trip kanaToHepburn(hepburnToKana(ro)) === ro and worklist any
 * mismatch.
 */

const HEPBURN_3: Record<string, string> = {
  // s-row yoon
  sha: "しゃ", shu: "しゅ", sho: "しょ", she: "しぇ",
  // ch-row
  chi: "ち", cha: "ちゃ", chu: "ちゅ", cho: "ちょ", che: "ちぇ",
  // ts-row
  tsu: "つ", tsa: "つぁ", tse: "つぇ", tso: "つぉ", tsi: "つぃ",
  // sh-row (shi has 3 chars too)
  shi: "し",
  // k-row yoon
  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  // n-row yoon
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  // h-row yoon
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  // m-row yoon
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  // r-row yoon
  rya: "りゃ", ryu: "りゅ", ryo: "りょ",
};

const HEPBURN_2: Record<string, string> = {
  // vowels — fall through to 1-char map
  // k-row
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  // s-row (sa/su/se/so; shi/sha/shu/sho in 3-char)
  sa: "さ", su: "す", se: "せ", so: "そ",
  za: "ざ", zu: "ず", ze: "ぜ", zo: "ぞ",
  // t-row (ta/te/to; chi/tsu/cha/chu/cho/tsu in 3-char)
  ta: "た", te: "て", to: "と",
  da: "だ", de: "で", do: "ど",
  // n-row
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  // h-row (ha/hi/he/ho; fu via 2-char, fa/fi/fe/fo foreign)
  ha: "は", hi: "ひ", he: "へ", ho: "ほ",
  fu: "ふ", fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  // m-row
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  // y-row
  ya: "や", yu: "ゆ", yo: "よ",
  // r-row
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  // w-row
  wa: "わ", wo: "を", wi: "うぃ", we: "うぇ",
  // j-row (single syllables ji/ju/jo/ja; je foreign)
  ja: "じゃ", ji: "じ", ju: "じゅ", jo: "じょ", je: "じぇ",
  // foreign t-row
  ti: "てぃ", di: "でぃ",
  // v-row (loanwords)
  va: "ヴァ", vi: "ヴィ", vu: "ヴ", ve: "ヴェ", vo: "ヴォ",
};

const HEPBURN_1: Record<string, string> = {
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  n: "ん",
};

const CONSONANTS = new Set([
  "k", "g", "s", "z", "t", "d", "h", "f", "b", "p", "m", "y", "r", "w", "j", "v",
]);

/**
 * Convert wapuro Hepburn ASCII to hiragana. Detects sokuon (doubled
 * consonants and the `tch` pattern) plus yoon (sha-row, cha-row,
 * tsu-row, and Cya yoon).
 */
export function hepburnToKana(ro: string): string {
  let out = "";
  let i = 0;
  while (i < ro.length) {
    // Sokuon: `tch` (e.g. itchi → いっち)
    if (
      ro[i] === "t" &&
      ro[i + 1] === "c" &&
      ro[i + 2] === "h"
    ) {
      out += "っ";
      i += 1;
      continue;
    }
    // Sokuon: doubled consonant (excluding n; nn handled as ん + n)
    if (
      i + 1 < ro.length &&
      ro[i + 1] === ro[i] &&
      CONSONANTS.has(ro[i])
    ) {
      out += "っ";
      i += 1;
      continue;
    }
    // Longest match: 3, 2, 1
    if (i + 3 <= ro.length) {
      const key = ro.slice(i, i + 3);
      const k = HEPBURN_3[key];
      if (k !== undefined) {
        out += k;
        i += 3;
        continue;
      }
    }
    if (i + 2 <= ro.length) {
      const key = ro.slice(i, i + 2);
      const k = HEPBURN_2[key];
      if (k !== undefined) {
        out += k;
        i += 2;
        continue;
      }
    }
    const k = HEPBURN_1[ro[i]];
    if (k !== undefined) {
      out += k;
      i += 1;
      continue;
    }
    // Unknown char (digit, punct, unexpected) — pass through.
    out += ro[i];
    i += 1;
  }
  return out;
}
