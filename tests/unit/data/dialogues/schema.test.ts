/**
 * TDD spec: Blueprint + Translation schemas for the language-independent
 * dialogue layer.
 *
 * Mirrors the vocab module's split: a Blueprint is the language-agnostic
 * skeleton (turn order, speaker, level, topic), Translation supplies the
 * per-language strings. They compose into a runtime Dialogue.
 */

import { describe, expect, test } from "vitest";
import {
  BlueprintSchema,
  TranslationSchema,
} from "@/lib/data/dialogues/schema";

const VALID_BLUEPRINT = {
  schema_version: 1,
  id: "cafe_basic_a2",
  level: "A2",
  topic: "food",
  estimated_minutes: 4,
  tags: ["cafe", "service"],
  turns: [
    { id: "t1", speaker: "bot", has_templates: false },
    { id: "t2", speaker: "player", has_templates: true, template_count: 1 },
    { id: "t3", speaker: "bot", has_templates: false },
    { id: "t4", speaker: "player", has_templates: true, template_count: 1 },
  ],
};

describe("BlueprintSchema", () => {
  test("accepts a minimal valid blueprint", () => {
    expect(() => BlueprintSchema.parse(VALID_BLUEPRINT)).not.toThrow();
  });

  test("rejects blueprint with no turns", () => {
    expect(() =>
      BlueprintSchema.parse({ ...VALID_BLUEPRINT, turns: [] }),
    ).toThrow();
  });

  test("rejects unknown topic", () => {
    expect(() =>
      BlueprintSchema.parse({ ...VALID_BLUEPRINT, topic: "music" }),
    ).toThrow();
  });

  test("rejects unknown level", () => {
    expect(() =>
      BlueprintSchema.parse({ ...VALID_BLUEPRINT, level: "Z9" }),
    ).toThrow();
  });

  test("rejects player turn missing has_templates flag", () => {
    expect(() =>
      BlueprintSchema.parse({
        ...VALID_BLUEPRINT,
        turns: [{ id: "t1", speaker: "player" }],
      }),
    ).toThrow();
  });

  test("tags default to empty array when omitted", () => {
    const noTags = { ...VALID_BLUEPRINT };
    delete (noTags as Record<string, unknown>).tags;
    const parsed = BlueprintSchema.parse(noTags);
    expect(parsed.tags).toEqual([]);
  });
});

const VALID_TRANSLATION = {
  schema_version: 1,
  blueprint_id: "cafe_basic_a2",
  language: "en",
  title: "At the cafe",
  description: "Order a coffee.",
  characters: {
    bot: { name: "Barista", voice: "en-US-JennyNeural" },
    player: { name: "You" },
  },
  turns: {
    t1: { text: "Hi, what can I get you?" },
    t2: {
      templates: [
        { id: "t2.0", text: "An americano, please." },
      ],
    },
    t3: { text: "Room for milk?" },
    t4: {
      templates: [
        { id: "t4.0", text: "No, thanks." },
      ],
    },
  },
};

describe("TranslationSchema", () => {
  test("accepts a minimal valid translation", () => {
    expect(() => TranslationSchema.parse(VALID_TRANSLATION)).not.toThrow();
  });

  test("rejects unknown language", () => {
    expect(() =>
      TranslationSchema.parse({ ...VALID_TRANSLATION, language: "fr" }),
    ).toThrow();
  });

  test("accepts ja translation with display + hint_zh", () => {
    const ja = {
      ...VALID_TRANSLATION,
      language: "ja",
      title: "カフェで",
      turns: {
        t1: { text: "ご注文は何にしますか?" },
        t2: {
          templates: [
            {
              id: "t2.0",
              text: "amerikano onegaishimasu",
              display: "アメリカノお願いします。",
              hint_zh: "請來一杯美式咖啡。",
            },
          ],
        },
        t3: { text: "ミルクは入れますか?" },
        t4: {
          templates: [
            {
              id: "t4.0",
              text: "iie kekkou desu",
              display: "いいえ、結構です。",
              hint_zh: "不用了,謝謝。",
            },
          ],
        },
      },
    };
    expect(() => TranslationSchema.parse(ja)).not.toThrow();
  });

  test("rejects translation missing required title", () => {
    const bad = { ...VALID_TRANSLATION };
    delete (bad as Record<string, unknown>).title;
    expect(() => TranslationSchema.parse(bad)).toThrow();
  });

  test("rejects empty turns object", () => {
    expect(() =>
      TranslationSchema.parse({ ...VALID_TRANSLATION, turns: {} }),
    ).toThrow();
  });

  test("accepts ja translation with display_furigana segments on a player template", () => {
    const ja = {
      ...VALID_TRANSLATION,
      language: "ja",
      title: "挨拶",
      turns: {
        t1: { text: "おはよう。" },
        t2: {
          templates: [
            {
              id: "t2.0",
              text: "anatagasonzaisitehosii",
              display: "あなたが存在してほしい",
              display_furigana: [
                { jp: "あなた", ro: "anata" },
                { jp: "が", ro: "ga" },
                { jp: "存在", ro: "sonzai" },
                { jp: "してほしい", ro: "shitehoshii" },
              ],
              hint_zh: "我希望你存在。",
            },
          ],
        },
      },
    };
    expect(() => TranslationSchema.parse(ja)).not.toThrow();
    const parsed = TranslationSchema.parse(ja);
    const tmpl = parsed.turns.t2.templates?.[0];
    expect(tmpl?.display_furigana).toHaveLength(4);
    expect(tmpl?.display_furigana?.[2]).toEqual({ jp: "存在", ro: "sonzai" });
  });

  test("rejects display_furigana segments missing jp or ro", () => {
    const bad = {
      ...VALID_TRANSLATION,
      language: "ja",
      turns: {
        t1: { text: "ok" },
        t2: {
          templates: [
            {
              id: "t2.0",
              text: "ok",
              display_furigana: [{ jp: "あなた" }],
            },
          ],
        },
      },
    };
    expect(() => TranslationSchema.parse(bad)).toThrow();
  });

  test("accepts ja translation with display_romaji on a player template", () => {
    const ja = {
      ...VALID_TRANSLATION,
      language: "ja",
      title: "カフェ",
      turns: {
        t1: { text: "ご注文は?" },
        t2: {
          templates: [
            {
              id: "t2.0",
              text: "amerikanoonegaishimasu",
              display: "アメリカノお願いします。",
              display_romaji: "amerikano onegaishimasu",
              hint_zh: "請來一杯美式。",
            },
          ],
        },
      },
    };
    expect(() => TranslationSchema.parse(ja)).not.toThrow();
    const parsed = TranslationSchema.parse(ja);
    const tmpl = parsed.turns.t2.templates?.[0];
    expect(tmpl?.display_romaji).toBe("amerikano onegaishimasu");
  });
});
