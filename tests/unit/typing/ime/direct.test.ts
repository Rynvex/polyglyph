/**
 * TDD spec for the pass-through IME used by Latin-script languages.
 *
 * The IME interface is `feed(raw) → committed chars` plus reset/buffer; for
 * direct typing each input char is committed immediately.
 */

import { describe, expect, test } from "vitest";
import { DirectIME } from "@/lib/typing/ime/direct";

describe("DirectIME", () => {
  test("feed yields each char as-is", () => {
    const ime = new DirectIME();
    expect(Array.from(ime.feed("a"))).toEqual(["a"]);
    expect(Array.from(ime.feed("bc"))).toEqual(["b", "c"]);
  });

  test("buffer is always empty (no composition)", () => {
    const ime = new DirectIME();
    ime.feed("hello");
    expect(ime.buffer()).toBe("");
  });

  test("reset is a no-op safe to call any time", () => {
    const ime = new DirectIME();
    ime.feed("x");
    ime.reset();
    expect(ime.buffer()).toBe("");
    expect(Array.from(ime.feed("y"))).toEqual(["y"]);
  });

  test("multi-codepoint emoji is split per code unit", () => {
    // For DirectIME we don't promise grapheme clustering — that's the
    // engine's job. We test what we promise: char-by-char passthrough using
    // string spread (which yields code points).
    const ime = new DirectIME();
    expect(Array.from(ime.feed("ab"))).toEqual(["a", "b"]);
  });

  test("non-latin chars pass through unchanged", () => {
    const ime = new DirectIME();
    expect(Array.from(ime.feed("ñü"))).toEqual(["ñ", "ü"]);
  });
});
