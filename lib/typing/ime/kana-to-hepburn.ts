/**
 * kanaToHepburn — pure function: hiragana / katakana → wapuro Hepburn ASCII.
 *
 * Conventions (locked 2026-05):
 *   - Long vowels written literally as kana: おう→ou, おお→oo, えい→ei
 *     (no macron, no ō/ē).
 *   - ん is always `n`. No nasal-assimilation rule: しんぶん → shinbun.
 *   - は/へ/を always ha/he/wo (kana literal, NOT particle pronunciation).
 *   - Sokuon doubles the next consonant. ち-row uses Hepburn convention:
 *     っち → tchi (single t before ch digraph), っちゃ → tcha.
 *   - Katakana ー (chōonpu) repeats the previous Hepburn vowel character.
 *   - Foreign-sound combinations (ふぁ, ティ, チェ, ウィ…) covered.
 *   - Anything that isn't a kana passes through unchanged. Trailing
 *     sokuon with no following consonant kana is emitted as the raw
 *     small-tsu so the validator can flag it.
 *
 * Used by:
 *   - A2 compose layer (auto-derive `ro` and `text` from {jp, kana})
 *   - A3 migration script
 *   - E1 validator (sanity-check stored Hepburn against kana)
 */

// Single-kana → romaji. Yoon (composite) uses YOON below.
const KANA_BASE: Record<string, string> = {
  // Hiragana — vowels & n
  あ: "a", い: "i", う: "u", え: "e", お: "o", ん: "n",
  // Hiragana — k/g
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  // Hiragana — s/z
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  // Hiragana — t/d
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  // Hiragana — n
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  // Hiragana — h/b/p
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  // Hiragana — m
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  // Hiragana — y / r / w
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", ゐ: "wi", ゑ: "we", を: "wo",

  // Katakana — vowels & n
  ア: "a", イ: "i", ウ: "u", エ: "e", オ: "o", ン: "n",
  // Katakana — k/g
  カ: "ka", キ: "ki", ク: "ku", ケ: "ke", コ: "ko",
  ガ: "ga", ギ: "gi", グ: "gu", ゲ: "ge", ゴ: "go",
  // Katakana — s/z
  サ: "sa", シ: "shi", ス: "su", セ: "se", ソ: "so",
  ザ: "za", ジ: "ji", ズ: "zu", ゼ: "ze", ゾ: "zo",
  // Katakana — t/d
  タ: "ta", チ: "chi", ツ: "tsu", テ: "te", ト: "to",
  ダ: "da", ヂ: "ji", ヅ: "zu", デ: "de", ド: "do",
  // Katakana — n
  ナ: "na", ニ: "ni", ヌ: "nu", ネ: "ne", ノ: "no",
  // Katakana — h/b/p
  ハ: "ha", ヒ: "hi", フ: "fu", ヘ: "he", ホ: "ho",
  バ: "ba", ビ: "bi", ブ: "bu", ベ: "be", ボ: "bo",
  パ: "pa", ピ: "pi", プ: "pu", ペ: "pe", ポ: "po",
  // Katakana — m
  マ: "ma", ミ: "mi", ム: "mu", メ: "me", モ: "mo",
  // Katakana — y / r / w
  ヤ: "ya", ユ: "yu", ヨ: "yo",
  ラ: "ra", リ: "ri", ル: "ru", レ: "re", ロ: "ro",
  ワ: "wa", ヰ: "wi", ヱ: "we", ヲ: "wo",
  // Katakana — small-vowel combos handled in YOON below.
  ヴ: "vu",

  // Standalone small vowels — fall back to bare vowel.
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o",
  ァ: "a", ィ: "i", ゥ: "u", ェ: "e", ォ: "o",
};

// Composite syllables (yoon + foreign-sound combinations).
const YOON: Record<string, string> = {
  // Standard hiragana yoon.
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  じゃ: "ja", じゅ: "ju", じょ: "jo",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  // Foreign-sound hiragana (loanwords).
  ふぁ: "fa", ふぃ: "fi", ふぇ: "fe", ふぉ: "fo",
  ぢゃ: "ja", ぢゅ: "ju", ぢょ: "jo",
  // Standard katakana yoon.
  キャ: "kya", キュ: "kyu", キョ: "kyo",
  ギャ: "gya", ギュ: "gyu", ギョ: "gyo",
  シャ: "sha", シュ: "shu", ショ: "sho",
  ジャ: "ja", ジュ: "ju", ジョ: "jo",
  チャ: "cha", チュ: "chu", チョ: "cho",
  ニャ: "nya", ニュ: "nyu", ニョ: "nyo",
  ヒャ: "hya", ヒュ: "hyu", ヒョ: "hyo",
  ビャ: "bya", ビュ: "byu", ビョ: "byo",
  ピャ: "pya", ピュ: "pyu", ピョ: "pyo",
  ミャ: "mya", ミュ: "myu", ミョ: "myo",
  リャ: "rya", リュ: "ryu", リョ: "ryo",
  // Foreign-sound katakana.
  ファ: "fa", フィ: "fi", フェ: "fe", フォ: "fo",
  ティ: "ti", ディ: "di", トゥ: "tu", ドゥ: "du",
  ウィ: "wi", ウェ: "we", ウォ: "wo",
  チェ: "che", ジェ: "je", シェ: "she",
  ツァ: "tsa", ツィ: "tsi", ツェ: "tse", ツォ: "tso",
  ヴァ: "va", ヴィ: "vi", ヴェ: "ve", ヴォ: "vo",
};

const SOKUON_HIRAGANA = "っ";
const SOKUON_KATAKANA = "ッ";
const CHOONPU = "ー"; // katakana long-vowel mark

// Visual-only characters that contribute nothing to the typing target.
// Dropped so the derived Hepburn stays pure ASCII.
const DROP_CHARS = new Set([
  "・", // katakana middle dot (separator, no spoken value)
]);

const VOWELS = new Set(["a", "i", "u", "e", "o"]);

/**
 * Convert a kana / mixed-kana string to wapuro Hepburn ASCII.
 *
 * Non-kana characters (kanji, ASCII, CJK punctuation) pass through.
 * The function does not interpret particles — `は` always becomes `ha`,
 * never `wa`. Use it to derive the Hepburn ro from a fully-kana
 * `kana` field; if the source contains kanji, the kanji segment will
 * pass through verbatim and require manual reading-resolution upstream.
 */
export function kanaToHepburn(input: string): string {
  let out = "";
  let i = 0;

  // Iterate by code point. All hiragana / katakana fit in BMP (single
  // UTF-16 code unit), so charAt-style indexing is safe.
  while (i < input.length) {
    const ch = input[i];

    // 1. Sokuon — doubles the leading consonant of the next syllable.
    //    For ch* yoon (cha/chi/chu/cho), the convention is `t` prefix
    //    not `c` doubling: っちゃ → tcha. Trailing sokuon with no
    //    following kana (e.g. expressive 「はっ」) is silently dropped
    //    since there is no consonant to double.
    if (ch === SOKUON_HIRAGANA || ch === SOKUON_KATAKANA) {
      const next = readNext(input, i + 1);
      if (next === null) {
        i += 1;
        continue;
      }
      const prefix = next.romaji.startsWith("ch") ? "t" : next.romaji[0];
      out += prefix + next.romaji;
      i = next.endIndex;
      continue;
    }

    // 1b. Drop visual-only separators (e.g. ・).
    if (DROP_CHARS.has(ch)) {
      i += 1;
      continue;
    }

    // 2. Chōonpu — repeat previous vowel.
    if (ch === CHOONPU) {
      const prev = out[out.length - 1];
      if (prev !== undefined && VOWELS.has(prev)) {
        out += prev;
      } else {
        out += ch; // fallback: emit raw
      }
      i += 1;
      continue;
    }

    // 3. Try YOON (2-kana composite) first.
    if (i + 1 < input.length) {
      const pair = ch + input[i + 1];
      const yoon = YOON[pair];
      if (yoon !== undefined) {
        out += yoon;
        i += 2;
        continue;
      }
    }

    // 4. Single kana lookup.
    const single = KANA_BASE[ch];
    if (single !== undefined) {
      out += single;
      i += 1;
      continue;
    }

    // 5. Pass-through (ASCII, kanji, punctuation).
    out += ch;
    i += 1;
  }

  return out;
}

interface NextSyllable {
  readonly romaji: string;
  readonly endIndex: number;
}

/** Read the next syllable starting at `start`. Returns null if the
 * character there is not a recognised kana (so sokuon can decide
 * whether to fall back to verbatim). */
function readNext(input: string, start: number): NextSyllable | null {
  if (start >= input.length) return null;
  const ch = input[start];
  if (start + 1 < input.length) {
    const pair = ch + input[start + 1];
    const yoon = YOON[pair];
    if (yoon !== undefined) {
      return { romaji: yoon, endIndex: start + 2 };
    }
  }
  const single = KANA_BASE[ch];
  if (single !== undefined) {
    return { romaji: single, endIndex: start + 1 };
  }
  return null;
}
