/**
 * KoreanRomajaIME — converts Revised Romanization input → Hangul.
 *
 * Each emitted character is one Hangul syllable block, formed by the
 * standard Unicode composition formula:
 *
 *   code = 0xAC00 + (initial_idx * 588) + (vowel_idx * 28) + final_idx
 *
 * The IME pre-computes every (initial, vowel, final) combination at
 * module load (~11k entries) so syllable lookup is a single Map.get().
 *
 * Disambiguation strategy: SHORTEST-first parse with remainder
 * lookahead. We only commit a syllable when the remaining buffer can
 * start a valid next syllable (initial + vowel). This prevents greedy
 * "am" → 암 when the user actually meant 아 + "me..." for 아메리카노.
 *
 * Out of scope (deferred):
 *   - Compound batchim (ㄳ, ㄵ, ㄶ etc.) — common subset only
 *   - Hanja conversion (Korean rarely uses Hanja in modern text)
 *   - True jamo-keyboard mode (this is romanization-based)
 */

import type { InputMethod } from "./types";

// 19 initial consonants in Hangul Unicode order.
// FINAL romanizations follow Revised Romanization conventions where
// finals are spelled differently from initials (ㄱ initial = "g",
// ㄱ final = "k"; ㅂ initial = "b", ㅂ final = "p"; etc.).
const INITIALS: readonly string[] = [
  "g", "kk", "n", "d", "tt", "r",
  "m", "b", "pp", "s", "ss", "",
  "j", "jj", "ch", "k", "t", "p", "h",
];

// 21 vowels.
const VOWELS: readonly string[] = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye",
  "o", "wa", "wae", "oe", "yo", "u", "wo", "we",
  "wi", "yu", "eu", "ui", "i",
];

// 28 finals (index 0 = no final). Romanizations use Revised Romanization
// final-position spelling (ㄱ → "k", ㄷ → "t", ㅂ → "p", ㄹ → "l").
// Collisions with aspirated finals (ㅋ ㅌ ㅍ) resolved by
// first-write-wins so the more common plain final is preferred.
const FINALS: readonly string[] = [
  "",     // 0
  "k",    // 1  ㄱ
  "kk",   // 2  ㄲ
  "ks",   // 3  ㄳ
  "n",    // 4  ㄴ
  "nj",   // 5  ㄵ
  "nh",   // 6  ㄶ
  "t",    // 7  ㄷ
  "l",    // 8  ㄹ
  "lk",   // 9  ㄺ
  "lm",   // 10 ㄻ
  "lp",   // 11 ㄼ
  "ls",   // 12 ㄽ
  "lt",   // 13 ㄾ
  "lph",  // 14 ㄿ (rare; spelled distinctly to avoid collision with ㄼ)
  "lh",   // 15 ㅀ
  "m",    // 16 ㅁ
  "p",    // 17 ㅂ
  "ps",   // 18 ㅄ
  "s",    // 19 ㅅ
  "ss",   // 20 ㅆ
  "ng",   // 21 ㅇ
  "j",    // 22 ㅈ
  "ch",   // 23 ㅊ
  "k",    // 24 ㅋ — collides with ㄱ; first-write-wins keeps ㄱ
  "t",    // 25 ㅌ — collides with ㄷ
  "p",    // 26 ㅍ — collides with ㅂ
  "h",    // 27 ㅎ
];

const HANGUL_BASE = 0xac00;

// Compose every valid (initial, vowel, final) combination once.
const SYLLABLE_MAP: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (let i = 0; i < INITIALS.length; i++) {
    for (let v = 0; v < VOWELS.length; v++) {
      for (let f = 0; f < FINALS.length; f++) {
        const code =
          HANGUL_BASE +
          i * VOWELS.length * FINALS.length +
          v * FINALS.length +
          f;
        const hangul = String.fromCharCode(code);
        const romaja = INITIALS[i] + VOWELS[v] + FINALS[f];
        if (romaja.length === 0) continue;
        if (!m.has(romaja)) m.set(romaja, hangul);
        // Initial `l` aliases initial `r` — Revised Romanization writes
        // syllable-initial ㄹ as `r` (`라` = ra), but the doubled-l
        // pattern in words like `allyeo` (알려) and `pulli` (풀리)
        // surfaces `l` at syllable boundaries. Mozc and MS-IME accept
        // both spellings interchangeably.
        if (INITIALS[i] === "r") {
          const aliased = "l" + VOWELS[v] + FINALS[f];
          if (!m.has(aliased)) m.set(aliased, hangul);
        }
      }
    }
  }
  return m;
})();

const MAX_ROMAJA_LEN = 7;

// Initials and vowels sorted by length DESC for greedy prefix matching
// during the lookahead validity check. Empty initial is handled
// separately so it doesn't pre-empt all consonants. `l` is included
// as an alias of `r` (see SYLLABLE_MAP construction).
const INITIALS_NONEMPTY_DESC: readonly string[] = [
  ...INITIALS.filter((s) => s.length > 0),
  "l",
]
  .slice()
  .sort((a, b) => b.length - a.length);
const VOWELS_DESC: readonly string[] = VOWELS.slice().sort(
  (a, b) => b.length - a.length,
);

type StartShape = "consonant" | "vowel" | "none";

/**
 * Classify what kind of syllable start `s` could form. Used to prefer
 * parses where the remainder begins with a consonant initial (more
 * natural Korean parsing — consonants between vowels bind to the
 * NEXT syllable, e.g. "ame" → 아 + me, not 암 + e).
 */
function startShape(s: string): StartShape {
  if (s.length === 0) return "none";
  for (const init of INITIALS_NONEMPTY_DESC) {
    if (s.startsWith(init)) {
      const rest = s.slice(init.length);
      for (const v of VOWELS_DESC) {
        if (rest.startsWith(v)) return "consonant";
      }
      return "none";
    }
  }
  for (const v of VOWELS_DESC) {
    if (s.startsWith(v)) return "vowel";
  }
  return "none";
}

const ROMAN_LETTER = /^[a-zA-Z]$/;

export class KoreanRomajaIME implements InputMethod {
  private buf = "";

  *feed(raw: string): Iterable<string> {
    const out: string[] = [];
    this.buf += raw;
    while (this.tryEmit(out, /*finalDrain*/ false)) {
      // keep draining
    }
    for (const c of out) yield c;
  }

  /**
   * Drain remaining buffer at end of input. Without this, the trailing
   * syllable of a line stays buffered (because the IME can't know if
   * more chars are coming).
   */
  *flush(): Iterable<string> {
    const out: string[] = [];
    while (this.buf.length > 0 && this.tryEmit(out, /*finalDrain*/ true)) {
      // keep draining
    }
    if (this.buf.length > 0) {
      // Whatever's left is unmappable — pass through so input flows.
      for (const c of this.buf) out.push(c);
      this.buf = "";
    }
    for (const c of out) yield c;
  }

  reset(): void {
    this.buf = "";
  }

  buffer(): string {
    return this.buf;
  }

  private tryEmit(out: string[], finalDrain: boolean): boolean {
    if (this.buf.length === 0) return false;

    // 0. Non-letter (whitespace, punctuation, already-Hangul, etc.)
    //    flushes immediately — never participates in syllable parsing.
    if (!ROMAN_LETTER.test(this.buf[0])) {
      out.push(this.buf[0]);
      this.buf = this.buf.slice(1);
      return true;
    }

    // 1. Strong parse: SHORTEST candidate whose remainder starts with a
    //    CONSONANT-initialized syllable. Prefers natural Korean parsing
    //    (consonants bind to next syllable: "ame" → 아 + me).
    const max = Math.min(this.buf.length, MAX_ROMAJA_LEN);
    for (let len = 1; len <= max; len++) {
      const candidate = this.buf.slice(0, len);
      const hangul = SYLLABLE_MAP.get(candidate);
      if (hangul === undefined) continue;
      const remainder = this.buf.slice(len);
      if (startShape(remainder) === "consonant") {
        out.push(hangul);
        this.buf = remainder;
        return true;
      }
    }

    // 2. Weaker parses. LONGEST first so combined vowels like "eo" →
    //    어 don't get split into "e" + "o". Two acceptance paths:
    //
    //    (a) empty remainder during flush — clean line ending
    //    (b) vowel-led remainder, BUT only if no longer "could-extend"
    //        candidate exists; otherwise we wait for more input that
    //        might confirm the longer match.
    let hasWaitCandidate = false;
    for (let len = max; len > 0; len--) {
      const candidate = this.buf.slice(0, len);
      const hangul = SYLLABLE_MAP.get(candidate);
      if (hangul === undefined) continue;
      const remainder = this.buf.slice(len);
      if (remainder.length === 0) {
        if (finalDrain) {
          out.push(hangul);
          this.buf = remainder;
          return true;
        }
        hasWaitCandidate = true;
        continue;
      }
      if (startShape(remainder) === "vowel") {
        if (hasWaitCandidate) {
          // A longer empty-remainder candidate exists; wait for more
          // input to disambiguate (e.g. "eo" mid-stream — could be 어
          // alone, or 에 + 오 if input continues).
          continue;
        }
        out.push(hangul);
        this.buf = remainder;
        return true;
      }
    }

    // 3. No emit possible. Wait if any wait-candidate seen OR room
    //    in buffer.
    if (hasWaitCandidate) return false;
    if (!finalDrain && this.buf.length < MAX_ROMAJA_LEN) {
      return false;
    }

    // 4. Last-resort longest match (typo escape during finalDrain).
    for (let len = max; len > 0; len--) {
      const candidate = this.buf.slice(0, len);
      if (SYLLABLE_MAP.has(candidate)) {
        out.push(SYLLABLE_MAP.get(candidate)!);
        this.buf = this.buf.slice(len);
        return true;
      }
    }

    // 5. Pure escape.
    out.push(this.buf[0]);
    this.buf = this.buf.slice(1);
    return true;
  }
}
