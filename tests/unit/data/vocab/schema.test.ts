/**
 * Schema-level tests for the vocab module — focused on the register
 * field that gates colloquial / formal / slang variants.
 */

import { describe, expect, test } from "vitest";
import {
  ConceptKindSchema,
  ConceptSchema,
  RegisterSchema,
  TranslationSchema,
  type Register,
} from "@/lib/data/vocab/schema";

describe("RegisterSchema", () => {
  test("accepts the allowed registers", () => {
    const allowed: Register[] = [
      "formal",
      "neutral",
      "casual",
      "slang",
      "idiom",
    ];
    for (const r of allowed) {
      expect(RegisterSchema.safeParse(r).success).toBe(true);
    }
  });

  test("rejects arbitrary strings", () => {
    expect(RegisterSchema.safeParse("polite").success).toBe(false);
    expect(RegisterSchema.safeParse("").success).toBe(false);
  });
});

describe("TranslationSchema register field", () => {
  test("accepts a translation with a valid register", () => {
    const parsed = TranslationSchema.safeParse({
      conceptId: "cop",
      language: "en",
      text: "cop",
      register: "slang",
    });
    expect(parsed.success).toBe(true);
  });

  test("accepts a translation without a register (optional)", () => {
    const parsed = TranslationSchema.safeParse({
      conceptId: "police_officer",
      language: "en",
      text: "police officer",
    });
    expect(parsed.success).toBe(true);
  });

  test("rejects a translation with an invalid register", () => {
    const parsed = TranslationSchema.safeParse({
      conceptId: "police_officer",
      language: "en",
      text: "officer",
      register: "polite",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("ConceptKindSchema — letter kind (alphabet drill support)", () => {
  test.each(["noun", "verb", "adjective", "phrase", "letter"])(
    "accepts %s",
    (kind) => {
      expect(ConceptKindSchema.safeParse(kind).success).toBe(true);
    },
  );

  test("rejects unknown kind", () => {
    expect(ConceptKindSchema.safeParse("particle").success).toBe(false);
  });

  test("a hiragana letter concept parses (native char as emoji)", () => {
    const parsed = ConceptSchema.safeParse({
      id: "hira_a",
      kind: "letter",
      cefr: "A1",
      category: "alphabet.hiragana",
      emoji: "あ",
    });
    expect(parsed.success).toBe(true);
  });

  test("a hangul syllable letter concept parses", () => {
    const parsed = ConceptSchema.safeParse({
      id: "hangul_ga",
      kind: "letter",
      cefr: "A1",
      category: "alphabet.hangul",
      emoji: "가",
    });
    expect(parsed.success).toBe(true);
  });
});
