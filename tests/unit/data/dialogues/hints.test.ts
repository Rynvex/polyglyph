/**
 * TDD spec for pickHint — native-language-aware hint selection for
 * dialogue templates. Today's data only ships hint_zh so the
 * fallback is the dominant path; future hint_<lang> backfills should
 * win when present.
 */
import { describe, expect, test } from "vitest";
import { pickHint } from "@/lib/data/dialogues/hints";
import type { Template } from "@/lib/data/schema";

const base: Template = {
  id: "t1.0",
  text: "irrelevant",
  hint_zh: "中文提示",
  weight: 1,
};

describe("pickHint", () => {
  test("returns hint_zh when nativeLang is zh-tw", () => {
    expect(pickHint(base, "zh-tw")).toBe("中文提示");
  });

  test("falls back to hint_zh when no localized hint exists", () => {
    expect(pickHint(base, "en")).toBe("中文提示");
    expect(pickHint(base, "ja")).toBe("中文提示");
  });

  test("prefers hint_<lang> when present", () => {
    const t = { ...base, hint_en: "English hint" } as Template & {
      hint_en?: string;
    };
    expect(pickHint(t, "en")).toBe("English hint");
    // zh-tw still wins for zh-tw users.
    expect(pickHint(t, "zh-tw")).toBe("中文提示");
  });

  test("returns undefined for undefined template", () => {
    expect(pickHint(undefined, "en")).toBeUndefined();
  });

  test("returns undefined when template has no hints at all", () => {
    const empty: Template = { id: "x", text: "y", weight: 1 };
    expect(pickHint(empty, "zh-tw")).toBeUndefined();
  });

  test("ignores empty-string hint", () => {
    const t = { ...base, hint_en: "" } as Template & { hint_en?: string };
    expect(pickHint(t, "en")).toBe("中文提示");
  });
});
