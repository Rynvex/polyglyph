/**
 * JapaneseRomajiIME — Kunrei → Hepburn input normalizer.
 *
 * Dialogue typing targets store ja text in Hepburn (`shi`, `chi`, `tsu`,
 * `fu`, `ji`, `zu`, `sha`/`cha`/`ja` and yoon variants). Real Mozc /
 * MS-IME accept Kunrei / Nihon-shiki spellings (`si`, `ti`, `tu`, `hu`,
 * `zi`, `du`, `sya`, `tya`, `zya`, `jya`) interchangeably. This IME
 * folds Kunrei tokens into their Hepburn equivalents while leaving
 * Hepburn input untouched, so the engine sees ASCII matching the stored
 * target either way.
 *
 * Strategy: longest-match greedy reduction with a 1- or 2-char prefix
 * wait set. Kunrei keys map to their Hepburn outputs; Hepburn 3-char
 * syllables (sh*, ch*) are also matched as a unit so that mid-stream
 * Kunrei subsequences (e.g. `hu` inside `shu`) don't get mis-converted.
 * flush() drains residue verbatim so trailing partial input becomes
 * typo cells rather than disappearing.
 */

import type { InputMethod } from "./types";

const KUNREI_TO_HEPBURN: Record<string, string> = {
  si: "shi",
  ti: "chi",
  tu: "tsu",
  hu: "fu",
  zi: "ji",
  di: "ji",
  du: "zu",
  sya: "sha",
  syu: "shu",
  syo: "sho",
  tya: "cha",
  tyu: "chu",
  tyo: "cho",
  zya: "ja",
  zyu: "ju",
  zyo: "jo",
  jya: "ja",
  jyu: "ju",
  jyo: "jo",
};

const KUNREI_3 = new Set<string>(
  Object.keys(KUNREI_TO_HEPBURN).filter((k) => k.length === 3),
);
const KUNREI_2 = new Set<string>(
  Object.keys(KUNREI_TO_HEPBURN).filter((k) => k.length === 2),
);

// Hepburn 3-char syllables that share a leading char with a Kunrei key.
// Matched as a unit so a mid-stream `hu` / `tu` subsequence doesn't get
// mis-rewritten (e.g. `shu` must not become `sfu`).
const HEPBURN_3 = new Set<string>([
  "sha", "shi", "shu", "she", "sho",
  "cha", "chi", "chu", "che", "cho",
]);

// 1-char prefixes that could still extend into a Kunrei key OR a
// Hepburn 3-char syllable (sh*, ch*).
const PREFIX_1 = new Set<string>(["s", "t", "h", "z", "d", "j", "c"]);
// 2-char prefixes that could still extend into a 3-char key.
const PREFIX_2 = new Set<string>([
  "sy", "ty", "zy", "jy", // Kunrei yoon prefixes
  "sh", "ch",             // Hepburn digraphs
]);

export class JapaneseRomajiIME implements InputMethod {
  private buf = "";
  private pending = "";

  *feed(raw: string): Iterable<string> {
    for (const ch of raw) {
      this.buf += ch.toLowerCase();
      while (this.tryEmit()) {
        // drain
      }
      yield* this.takePending();
    }
  }

  reset(): void {
    this.buf = "";
    this.pending = "";
  }

  *flush(): Iterable<string> {
    // Drain the buffer verbatim. Any unconsumed prefix is partial
    // Kunrei input that the player abandoned; expose it as raw chars
    // so the engine flags wrong cells instead of swallowing input.
    const remaining = this.buf;
    this.buf = "";
    for (const ch of remaining) yield ch;
  }

  buffer(): string {
    return this.buf;
  }

  private *takePending(): Iterable<string> {
    const out = this.pending;
    this.pending = "";
    for (const ch of out) yield ch;
  }

  private push(out: string): void {
    this.pending += out;
  }

  /** Commit one segment from the buffer. Returns true if anything
   * was emitted; caller loops to drain. */
  private tryEmit(): boolean {
    if (this.buf.length === 0) return false;

    // 1. Longest match against 3-char keys (Kunrei first, then Hepburn).
    if (this.buf.length >= 3) {
      const key = this.buf.slice(0, 3);
      if (KUNREI_3.has(key)) {
        this.push(KUNREI_TO_HEPBURN[key]);
        this.buf = this.buf.slice(3);
        return true;
      }
      if (HEPBURN_3.has(key)) {
        this.push(key);
        this.buf = this.buf.slice(3);
        return true;
      }
    }

    // 2. 2-char Kunrei keys.
    if (this.buf.length >= 2) {
      const key = this.buf.slice(0, 2);
      if (KUNREI_2.has(key)) {
        this.push(KUNREI_TO_HEPBURN[key]);
        this.buf = this.buf.slice(2);
        return true;
      }
    }

    // 3. Wait if buf could still extend to a key.
    if (this.buf.length === 1 && PREFIX_1.has(this.buf)) return false;
    if (this.buf.length === 2 && PREFIX_2.has(this.buf)) return false;

    // 4. Otherwise commit the leading char verbatim and re-evaluate.
    this.push(this.buf[0]);
    this.buf = this.buf.slice(1);
    return true;
  }
}
