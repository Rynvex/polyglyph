/**
 * TDD spec for the dialogue script zod schema.
 *
 * Mirrors the pydantic spec from the previous Python codebase: bot turns
 * need text, player turns need templates, level enums and speaker enums
 * reject bad values, defaults are applied, unknown fields don't crash.
 */

import { describe, expect, test } from "vitest";
import {
  DialogueSchema,
  TemplateSchema,
  TopicSchema,
  TurnSchema,
} from "@/lib/data/schema";

const cafeExample = {
  schema_version: 1,
  id: "en.cafe_basic.a2",
  language: "en",
  level: "A2",
  topic: "food",
  title: "Coffee Shop Basics",
  description: "Order a coffee and a pastry at a cafe.",
  estimated_minutes: 3,
  tags: ["food", "service", "casual"],
  characters: {
    bot: { name: "Barista", avatar: "barista.png", voice: "en-US-AriaNeural" },
    player: { name: "You" },
  },
  turns: [
    {
      id: "t1",
      speaker: "bot",
      text: "Hi there! What can I get you today?",
      audio: "tts/en/cafe_basic/t1.mp3",
      translation_zh: "嗨,今天要點什麼?",
    },
    {
      id: "t2",
      speaker: "player",
      templates: [
        {
          id: "t2.main",
          text: "I'd like a medium latte, please.",
          weight: 1.0,
          hint_zh: "我想要一杯中杯拿鐵,謝謝。",
          next: "t3.standard",
        },
        {
          id: "t2.oat",
          text: "Can I have a latte with oat milk?",
          weight: 0.8,
          hint_zh: "可以幫我加燕麥奶嗎?",
          next: "t3.oat",
        },
      ],
    },
    {
      id: "t3.standard",
      speaker: "bot",
      text: "One medium latte coming right up. Anything else?",
      audio: "tts/en/cafe_basic/t3a.mp3",
    },
    {
      id: "t3.oat",
      speaker: "bot",
      text: "Sure, oat milk it is. That'll be a dollar extra.",
      audio: "tts/en/cafe_basic/t3b.mp3",
    },
  ],
  rewards: {
    complete: { xp: 50 },
    perfect: { xp: 100, badge: "barista_friend" },
  },
};

describe("TurnSchema", () => {
  test("minimal bot turn validates", () => {
    const t = TurnSchema.parse({ id: "t1", speaker: "bot", text: "Hello" });
    expect(t.speaker).toBe("bot");
    expect(t.text).toBe("Hello");
  });

  test("player turn with templates validates", () => {
    const t = TurnSchema.parse({
      id: "t2",
      speaker: "player",
      templates: [{ id: "t2.a", text: "Hi" }],
    });
    expect(t.speaker).toBe("player");
    expect(t.templates?.[0].text).toBe("Hi");
  });

  test("turn without text or templates is rejected", () => {
    expect(() => TurnSchema.parse({ id: "t1", speaker: "bot" })).toThrow();
  });

  test("invalid speaker rejected", () => {
    expect(() => TurnSchema.parse({ id: "t1", speaker: "narrator", text: "x" })).toThrow();
  });
});

describe("TemplateSchema", () => {
  test("default weight is 1.0 when omitted", () => {
    const t = TemplateSchema.parse({ id: "x", text: "hi" });
    expect(t.weight).toBe(1.0);
  });
});

describe("DialogueSchema", () => {
  test("invalid level rejected", () => {
    const bad = { ...cafeExample, level: "Z9" };
    expect(() => DialogueSchema.parse(bad)).toThrow();
  });

  test("full cafe example validates", () => {
    const d = DialogueSchema.parse(cafeExample);
    expect(d.id).toBe("en.cafe_basic.a2");
    expect(d.level).toBe("A2");
    expect(d.turns).toHaveLength(4);
    expect(d.turns[1].templates?.[0].next).toBe("t3.standard");
  });

  test("unknown extra field is silently dropped (forward compat)", () => {
    const d = DialogueSchema.parse({ ...cafeExample, future_field: "unused" });
    expect(d.id).toBe("en.cafe_basic.a2");
  });

  test("schema_version must be int", () => {
    const bad = { ...cafeExample, schema_version: "v1" };
    expect(() => DialogueSchema.parse(bad)).toThrow();
  });
});

describe("TemplateSchema.display (typed romanization → displayed script)", () => {
  test("accepts a template with optional display field", () => {
    const parsed = TemplateSchema.safeParse({
      id: "t1.0",
      text: "ohayou gozaimasu",
      display: "おはようございます",
      hint_zh: "早安。",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.display).toBe("おはようございます");
    }
  });

  test("display is optional — older templates still parse", () => {
    const parsed = TemplateSchema.safeParse({
      id: "t1.0",
      text: "hello",
      hint_zh: "你好",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.display).toBeUndefined();
    }
  });

  test("display must be a string when present", () => {
    const parsed = TemplateSchema.safeParse({
      id: "t1.0",
      text: "hello",
      display: 123,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("LanguageSchema (closed 7-enum)", () => {
  test("accepts the seven supported languages", async () => {
    const { LanguageSchema } = await import("@/lib/data/schema");
    const allowed = ["en", "zh-tw", "ja", "ko", "it", "de", "es"];
    for (const lang of allowed) {
      expect(LanguageSchema.safeParse(lang).success).toBe(true);
    }
  });

  test("rejects arbitrary language codes", async () => {
    const { LanguageSchema } = await import("@/lib/data/schema");
    expect(LanguageSchema.safeParse("fr").success).toBe(false);
    expect(LanguageSchema.safeParse("zh-cn").success).toBe(false);
    expect(LanguageSchema.safeParse("").success).toBe(false);
  });

  test("DialogueSchema requires language to be one of the seven", () => {
    const good = { ...cafeExample, language: "en" };
    expect(() => DialogueSchema.parse(good)).not.toThrow();
    const bad = { ...cafeExample, language: "fr" };
    expect(() => DialogueSchema.parse(bad)).toThrow();
  });
});

describe("TopicSchema (closed enum)", () => {
  test("accepts the seven canonical domains", () => {
    const allowed = ["daily", "travel", "food", "services", "work", "tech", "mind"];
    for (const t of allowed) {
      expect(TopicSchema.safeParse(t).success).toBe(true);
    }
  });

  test("rejects free-form values", () => {
    expect(TopicSchema.safeParse("ordering_food").success).toBe(false);
    expect(TopicSchema.safeParse("machine_learning").success).toBe(false);
    expect(TopicSchema.safeParse("").success).toBe(false);
  });

  test("DialogueSchema requires topic to be one of the canonical domains", () => {
    const good = { ...cafeExample, topic: "food" };
    expect(() => DialogueSchema.parse(good)).not.toThrow();
    const bad = { ...cafeExample, topic: "ordering_food" };
    expect(() => DialogueSchema.parse(bad)).toThrow();
  });
});
