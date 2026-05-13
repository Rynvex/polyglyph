/**
 * TDD spec: JapaneseHiraganaIME.flush() — end-of-input handling.
 *
 * Real-world Mozc commits a trailing `n` as ん when the user stops
 * typing. Mid-input the IME can't tell `n` apart from a future `na`,
 * so the buffer waits. flush() resolves that ambiguity at end-of-input.
 *
 * Anything else left in the buffer (stray prefix like `k`, broken
 * romaji like `desigh`) gets dumped as raw chars — the engine then
 * surfaces those as typos so the user can correct them.
 */

import { describe, expect, test } from "vitest";
import { JapaneseHiraganaIME } from "@/lib/typing/ime/japanese";

function compose(ime: JapaneseHiraganaIME, raw: string): string[] {
  const out: string[] = [];
  for (const c of ime.feed(raw)) out.push(c);
  if (typeof ime.flush === "function") {
    for (const c of ime.flush()) out.push(c);
  }
  return out;
}

describe("JapaneseHiraganaIME.flush()", () => {
  test("trailing n commits as ん at end of input", () => {
    expect(compose(new JapaneseHiraganaIME(), "un")).toEqual(["う", "ん"]);
  });

  test("trailing n still commits even after a complete syllable", () => {
    expect(compose(new JapaneseHiraganaIME(), "konban")).toEqual([
      "こ",
      "ん",
      "ば",
      "ん",
    ]);
  });

  test("flush leaves nothing buffered", () => {
    const ime = new JapaneseHiraganaIME();
    Array.from(ime.feed("un"));
    Array.from(ime.flush!());
    expect(ime.buffer()).toBe("");
  });

  test("flush is a no-op when buffer is already empty", () => {
    const ime = new JapaneseHiraganaIME();
    Array.from(ime.feed("ohayou"));
    expect([...ime.flush!()]).toEqual([]);
  });

  test("non-n prefix residue dumps as raw at flush (so validator catches it)", () => {
    // 'k' alone has no kana. flush surfaces it as a raw 'k' typo.
    const out = compose(new JapaneseHiraganaIME(), "k");
    expect(out).toEqual(["k"]);
  });
});
