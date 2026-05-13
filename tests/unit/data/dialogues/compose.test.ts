/**
 * TDD spec: composeDialogue(blueprint, translation) -> Dialogue.
 *
 * Output must conform to the existing DialogueSchema so the rest of the
 * runtime (controller, scene, engine) keeps working without changes.
 */

import { describe, expect, test } from "vitest";
import { DialogueSchema } from "@/lib/data/schema";
import type { Blueprint, Translation } from "@/lib/data/dialogues/schema";
import { composeDialogue } from "@/lib/data/dialogues/compose";

const blueprint: Blueprint = {
  schema_version: 1,
  id: "cafe_basic_a2",
  level: "A2",
  topic: "food",
  estimated_minutes: 4,
  tags: ["cafe"],
  turns: [
    { id: "t1", speaker: "bot", has_templates: false },
    { id: "t2", speaker: "player", has_templates: true, template_count: 1 },
  ],
};

const translation: Translation = {
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
      templates: [{ id: "t2.0", text: "An americano, please." }],
    },
  },
};

describe("composeDialogue", () => {
  test("produces a valid Dialogue parsed by DialogueSchema", () => {
    const dialogue = composeDialogue(blueprint, translation);
    expect(() => DialogueSchema.parse(dialogue)).not.toThrow();
  });

  test("dialogue.id encodes language + blueprint id", () => {
    const dialogue = composeDialogue(blueprint, translation);
    // id format: <lang>.<blueprint_id>.<level lowercase>
    expect(dialogue.id).toBe("en.cafe_basic_a2.a2");
  });

  test("preserves blueprint level and topic", () => {
    const dialogue = composeDialogue(blueprint, translation);
    expect(dialogue.level).toBe("A2");
    expect(dialogue.topic).toBe("food");
  });

  test("merges title/description from translation", () => {
    const dialogue = composeDialogue(blueprint, translation);
    expect(dialogue.title).toBe("At the cafe");
    expect(dialogue.description).toBe("Order a coffee.");
  });

  test("turn order matches blueprint, content from translation", () => {
    const dialogue = composeDialogue(blueprint, translation);
    expect(dialogue.turns).toHaveLength(2);
    expect(dialogue.turns[0]).toMatchObject({
      id: "t1",
      speaker: "bot",
      text: "Hi, what can I get you?",
    });
    expect(dialogue.turns[1]).toMatchObject({
      id: "t2",
      speaker: "player",
    });
    expect(dialogue.turns[1].templates).toHaveLength(1);
    expect(dialogue.turns[1].templates?.[0]).toMatchObject({
      id: "t2.0",
      text: "An americano, please.",
    });
  });

  test("throws when translation is missing a turn the blueprint declares", () => {
    const incomplete: Translation = {
      ...translation,
      turns: { t1: { text: "Hi." } },
    };
    expect(() => composeDialogue(blueprint, incomplete)).toThrow(
      /missing turn t2/i,
    );
  });

  test("throws when blueprint id and translation blueprint_id don't match", () => {
    const wrongRef: Translation = {
      ...translation,
      blueprint_id: "different_blueprint",
    };
    expect(() => composeDialogue(blueprint, wrongRef)).toThrow(
      /blueprint id mismatch/i,
    );
  });

  test("throws when bot turn has no text in translation", () => {
    const noBotText: Translation = {
      ...translation,
      turns: {
        t1: {},
        t2: { templates: [{ id: "t2.0", text: "An americano, please." }] },
      },
    };
    expect(() => composeDialogue(blueprint, noBotText)).toThrow(
      /turn t1.*text/i,
    );
  });

  test("throws when player turn has no templates in translation", () => {
    const noTemplates: Translation = {
      ...translation,
      turns: {
        t1: { text: "Hi." },
        t2: {},
      },
    };
    expect(() => composeDialogue(blueprint, noTemplates)).toThrow(
      /turn t2.*templates/i,
    );
  });
});

describe("composeDialogue — ja display_furigana derivation", () => {
  const jaBlueprint: Blueprint = {
    schema_version: 1,
    id: "morning_commute_a2",
    level: "A2",
    topic: "daily",
    tags: [],
    turns: [
      { id: "t1", speaker: "bot", has_templates: false },
      { id: "t2", speaker: "player", has_templates: true, template_count: 1 },
    ],
  };

  test("derives ro from kana when kana is provided", () => {
    const t: Translation = {
      schema_version: 1,
      blueprint_id: "morning_commute_a2",
      language: "ja",
      title: "渋滞にハマってる",
      turns: {
        t1: { text: "ねえ、今どこ?" },
        t2: {
          templates: [
            {
              id: "t2.0",
              display: "本当にごめん。",
              display_furigana: [
                { jp: "本当", kana: "ほんとう" },
                { jp: "に", kana: "に" },
                { jp: "ごめん。", kana: "ごめん" },
              ],
            },
          ],
        },
      },
    };
    const dialogue = composeDialogue(jaBlueprint, t);
    const tmpl = dialogue.turns[1].templates![0];
    expect(tmpl.display_furigana).toEqual([
      { jp: "本当", ro: "hontou" },
      { jp: "に", ro: "ni" },
      { jp: "ごめん。", ro: "gomen" },
    ]);
    expect(tmpl.text).toBe("hontounigomen");
  });

  test("falls back to legacy ro when kana is absent", () => {
    const t: Translation = {
      schema_version: 1,
      blueprint_id: "morning_commute_a2",
      language: "ja",
      title: "...",
      turns: {
        t1: { text: "..." },
        t2: {
          templates: [
            {
              id: "t2.0",
              text: "hontounigomen",
              display: "本当にごめん。",
              display_furigana: [
                { jp: "本当", ro: "hontou" },
                { jp: "に", ro: "ni" },
                { jp: "ごめん。", ro: "gomen" },
              ],
            },
          ],
        },
      },
    };
    const dialogue = composeDialogue(jaBlueprint, t);
    const tmpl = dialogue.turns[1].templates![0];
    expect(tmpl.display_furigana).toEqual([
      { jp: "本当", ro: "hontou" },
      { jp: "に", ro: "ni" },
      { jp: "ごめん。", ro: "gomen" },
    ]);
    expect(tmpl.text).toBe("hontounigomen");
  });

  test("kana takes precedence over ro when both are given", () => {
    const t: Translation = {
      schema_version: 1,
      blueprint_id: "morning_commute_a2",
      language: "ja",
      title: "...",
      turns: {
        t1: { text: "..." },
        t2: {
          templates: [
            {
              id: "t2.0",
              display: "二十分",
              display_furigana: [
                // legacy ro is wrong (`hunnijuppun`); kana is the truth.
                { jp: "二十分", kana: "にじゅっぷん", ro: "hunnijuppun" },
              ],
            },
          ],
        },
      },
    };
    const dialogue = composeDialogue(jaBlueprint, t);
    const tmpl = dialogue.turns[1].templates![0];
    expect(tmpl.display_furigana![0].ro).toBe("nijuppun");
    expect(tmpl.text).toBe("nijuppun");
  });

  test("text takes precedence over derived concat when both are given", () => {
    // Authors sometimes need a one-off override (rare). Stored text wins.
    const t: Translation = {
      schema_version: 1,
      blueprint_id: "morning_commute_a2",
      language: "ja",
      title: "...",
      turns: {
        t1: { text: "..." },
        t2: {
          templates: [
            {
              id: "t2.0",
              text: "OVERRIDE",
              display: "本当",
              display_furigana: [{ jp: "本当", kana: "ほんとう" }],
            },
          ],
        },
      },
    };
    const dialogue = composeDialogue(jaBlueprint, t);
    expect(dialogue.turns[1].templates![0].text).toBe("OVERRIDE");
  });

  test("throws when template has no text and no display_furigana", () => {
    const t: Translation = {
      schema_version: 1,
      blueprint_id: "morning_commute_a2",
      language: "ja",
      title: "...",
      turns: {
        t1: { text: "..." },
        t2: {
          templates: [{ id: "t2.0" }],
        },
      },
    };
    expect(() => composeDialogue(jaBlueprint, t)).toThrow(
      /requires text, display_furigana/,
    );
  });
});
