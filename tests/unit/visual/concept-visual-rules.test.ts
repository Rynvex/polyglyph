/**
 * TDD spec for classifyVisual — assigns Visual {kind, asset} per the
 * decision algorithm in docs/VISUAL_STRATEGY.md.
 */
import { describe, expect, test } from "vitest";
import { classifyVisual } from "@/lib/visual/concept-visual-rules";
import type { Concept } from "@/lib/data/vocab/schema";

function concept(over: Partial<Concept>): Concept {
  return {
    id: "test",
    category: "misc",
    cefr: "A1",
    kind: "noun",
    ...over,
  };
}

describe("classifyVisual", () => {
  test("explicit emoji wins over rules", () => {
    expect(classifyVisual(concept({ emoji: "🍎" }))).toEqual({
      kind: "emoji",
      asset: "🍎",
    });
  });

  test("curated id mapping returns icon", () => {
    expect(classifyVisual(concept({ id: "thought" }))).toEqual({
      kind: "icon",
      asset: "lightbulb",
    });
    expect(classifyVisual(concept({ id: "justice" }))).toEqual({
      kind: "icon",
      asset: "scale",
    });
  });

  test("function-word POS routes to none (text-only card)", () => {
    expect(classifyVisual(concept({ pos: "preposition" }))).toEqual({
      kind: "none",
      asset: null,
    });
    expect(classifyVisual(concept({ pos: "conjunction" }))).toEqual({
      kind: "none",
      asset: null,
    });
  });

  test("emoji-preferred category without emoji falls back to icon", () => {
    const out = classifyVisual(
      concept({ category: "food", pos: "noun-concrete" }),
    );
    expect(out.kind).toBe("icon");
    expect(typeof out.asset).toBe("string");
  });

  test("abstract noun routes to icon", () => {
    const out = classifyVisual(concept({ pos: "noun-abstract" }));
    expect(out.kind).toBe("icon");
  });

  test("state verb routes to icon", () => {
    const out = classifyVisual(concept({ pos: "verb-state" }));
    expect(out.kind).toBe("icon");
  });

  test("unknown pos still produces a sane icon fallback", () => {
    const out = classifyVisual(concept({ pos: undefined }));
    expect(out.kind).toBe("icon");
    expect(typeof out.asset).toBe("string");
  });
});
