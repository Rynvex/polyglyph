import { describe, expect, test } from "vitest";
import { buildPrompt } from "@/lib/llm/prompt";

describe("buildPrompt", () => {
  test("substitutes all placeholders", () => {
    const out = buildPrompt({
      level: "B1",
      botName: "Barista",
      topic: "food",
      title: "Coffee chat",
      source: "Original article goes here.",
    });
    expect(out).toContain("B1");
    expect(out).toContain("Barista");
    expect(out).toContain("food");
    expect(out).toContain("Coffee chat");
    expect(out).toContain("Original article goes here.");
    expect(out).not.toContain("{{LEVEL}}");
    expect(out).not.toContain("{{SOURCE}}");
  });

  test("requires JSON-only output (rule #1)", () => {
    const out = buildPrompt({
      level: "A1",
      botName: "x",
      topic: "daily",
      title: "x",
      source: "x",
    });
    expect(out).toMatch(/Output ONLY/i);
  });
});
