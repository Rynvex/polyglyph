/**
 * TDD spec for the forgiving char-pair comparator.
 *
 * Pinned down: exact match, case folding, accent stripping, and a strict
 * mode escape hatch.
 */

import { describe, expect, test } from "vitest";
import { normalizePair } from "@/lib/typing/normalizer";

describe("normalizePair", () => {
  test("exact equal chars match", () => {
    expect(normalizePair("a", "a")).toBe(true);
  });

  test("different chars do not match", () => {
    expect(normalizePair("a", "b")).toBe(false);
  });

  test("upper vs lower case match by default", () => {
    expect(normalizePair("A", "a")).toBe(true);
    expect(normalizePair("a", "A")).toBe(true);
  });

  test("ascii e vs accented é match by default", () => {
    expect(normalizePair("e", "é")).toBe(true);
    expect(normalizePair("é", "e")).toBe(true);
  });

  test("ascii vs umlaut match by default", () => {
    expect(normalizePair("u", "ü")).toBe(true);
    expect(normalizePair("o", "ö")).toBe(true);
  });

  test("strict mode rejects case differences", () => {
    expect(normalizePair("A", "a", { strict: true })).toBe(false);
  });

  test("strict mode rejects accent differences", () => {
    expect(normalizePair("e", "é", { strict: true })).toBe(false);
  });

  test("strict mode still accepts exact matches", () => {
    expect(normalizePair("a", "a", { strict: true })).toBe(true);
    expect(normalizePair("é", "é", { strict: true })).toBe(true);
  });

  test("space vs space matches", () => {
    expect(normalizePair(" ", " ")).toBe(true);
  });

  test("punctuation matches itself", () => {
    expect(normalizePair(",", ",")).toBe(true);
    expect(normalizePair("'", "'")).toBe(true);
  });

  test("punctuation does not match letters", () => {
    expect(normalizePair(",", "a")).toBe(false);
  });

  test("german eszett does NOT collapse to ss", () => {
    // ß is a single grapheme; we don't expand it.
    expect(normalizePair("ß", "s")).toBe(false);
  });

  test("digit matches itself", () => {
    expect(normalizePair("5", "5")).toBe(true);
  });

  test("kana exact match", () => {
    expect(normalizePair("あ", "あ")).toBe(true);
  });

  test("hangul exact match", () => {
    expect(normalizePair("가", "가")).toBe(true);
  });

  test("typed mismatch with kana fails", () => {
    expect(normalizePair("a", "あ")).toBe(false);
  });
});

describe("normalizePair — typographic forgiveness", () => {
  test("ASCII hyphen matches em dash", () => {
    expect(normalizePair("-", "—")).toBe(true);
    expect(normalizePair("—", "-")).toBe(true);
  });

  test("ASCII hyphen matches en dash", () => {
    expect(normalizePair("-", "–")).toBe(true);
  });

  test("ASCII hyphen matches Unicode minus sign", () => {
    expect(normalizePair("-", "−")).toBe(true);
  });

  test("ASCII apostrophe matches both curly quotes", () => {
    expect(normalizePair("'", "’")).toBe(true); // right single
    expect(normalizePair("'", "‘")).toBe(true); // left single
  });

  test("ASCII double quote matches both curly double quotes", () => {
    expect(normalizePair('"', "”")).toBe(true);
    expect(normalizePair('"', "“")).toBe(true);
  });

  test("space matches non-breaking space", () => {
    expect(normalizePair(" ", " ")).toBe(true);
  });

  test("strict mode rejects typographic equivalences", () => {
    expect(normalizePair("-", "—", { strict: true })).toBe(false);
    expect(normalizePair("'", "’", { strict: true })).toBe(false);
  });

  test("typography forgiveness is bidirectional", () => {
    // Whether the dialogue uses em dash or hyphen, both inputs work.
    expect(normalizePair("-", "—")).toBe(true);
    expect(normalizePair("—", "-")).toBe(true);
  });
});
