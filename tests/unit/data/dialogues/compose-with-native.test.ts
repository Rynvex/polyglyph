/**
 * TDD spec: composeDialogueWithNative(blueprint, translation, nativeTranslation?)
 *
 * Same shape as composeDialogue, with one additive behavior: when a
 * native-language Translation is supplied, the produced Turn / Template
 * carries an optional `nativeText` string for the translation strip UI.
 *
 *   - NPC turn nativeText  = nativeTranslation.turns[turnId].text
 *   - Player template nativeText = matching template's (display ?? text)
 *
 * Degradation is graceful: missing keys → undefined `nativeText`, no
 * throw. Same-language pair / undefined native translation → no
 * `nativeText` populated anywhere (behaves like plain composeDialogue).
 */

import { describe, expect, test } from "vitest";
import { DialogueSchema } from "@/lib/data/schema";
import type { Blueprint, Translation } from "@/lib/data/dialogues/schema";
import {
  attachNativeText,
  composeDialogue,
  composeDialogueWithNative,
} from "@/lib/data/dialogues/compose";

const blueprint: Blueprint = {
  schema_version: 1,
  id: "cafe_basic_a2",
  level: "A2",
  topic: "food",
  estimated_minutes: 4,
  tags: ["cafe"],
  turns: [
    { id: "t1", speaker: "bot", has_templates: false },
    { id: "t2", speaker: "player", has_templates: true, template_count: 2 },
  ],
};

const targetTranslation: Translation = {
  schema_version: 1,
  blueprint_id: "cafe_basic_a2",
  language: "es",
  title: "En la cafetería",
  characters: { bot: { name: "Barista" }, player: { name: "Tú" } },
  turns: {
    t1: { text: "Hola, ¿qué te pongo?" },
    t2: {
      templates: [
        { id: "t2.0", display: "Un americano, por favor.", text: "Un americano, por favor." },
        { id: "t2.1", display: "Un café con leche.", text: "Un cafe con leche." },
      ],
    },
  },
};

const nativeTranslationZh: Translation = {
  schema_version: 1,
  blueprint_id: "cafe_basic_a2",
  language: "zh-tw",
  title: "在咖啡店",
  characters: { bot: { name: "咖啡師" } },
  turns: {
    t1: { text: "你好,要喝什麼?" },
    t2: {
      templates: [
        { id: "t2.0", text: "請給我一杯美式。" },
        { id: "t2.1", text: "拿鐵一杯。" },
      ],
    },
  },
};

describe("composeDialogueWithNative — produces valid Dialogue", () => {
  test("with native translation, output still parses via DialogueSchema", () => {
    const dialogue = composeDialogueWithNative(
      blueprint,
      targetTranslation,
      nativeTranslationZh,
    );
    expect(() => DialogueSchema.parse(dialogue)).not.toThrow();
  });

  test("without native translation, behaves like composeDialogue", () => {
    const dialogue = composeDialogueWithNative(blueprint, targetTranslation);
    expect(() => DialogueSchema.parse(dialogue)).not.toThrow();
    // No nativeText anywhere when no native source.
    expect(dialogue.turns[0].nativeText).toBeUndefined();
    expect(dialogue.turns[1].templates?.[0].nativeText).toBeUndefined();
    expect(dialogue.turns[1].templates?.[1].nativeText).toBeUndefined();
  });
});

describe("composeDialogueWithNative — populates nativeText", () => {
  test("NPC turn carries nativeText from native translation", () => {
    const dialogue = composeDialogueWithNative(
      blueprint,
      targetTranslation,
      nativeTranslationZh,
    );
    expect(dialogue.turns[0].speaker).toBe("bot");
    expect(dialogue.turns[0].nativeText).toBe("你好,要喝什麼?");
  });

  test("each player template carries its matching nativeText by id", () => {
    const dialogue = composeDialogueWithNative(
      blueprint,
      targetTranslation,
      nativeTranslationZh,
    );
    const templates = dialogue.turns[1].templates;
    expect(templates?.[0].id).toBe("t2.0");
    expect(templates?.[0].nativeText).toBe("請給我一杯美式。");
    expect(templates?.[1].id).toBe("t2.1");
    expect(templates?.[1].nativeText).toBe("拿鐵一杯。");
  });

  test("player template nativeText prefers display over text", () => {
    const nativeWithDisplay: Translation = {
      ...nativeTranslationZh,
      turns: {
        ...nativeTranslationZh.turns,
        t2: {
          templates: [
            { id: "t2.0", display: "請給我一杯美式。", text: "qing-gei-wo" },
            { id: "t2.1", display: "拿鐵一杯。", text: "na-tie" },
          ],
        },
      },
    };
    const dialogue = composeDialogueWithNative(
      blueprint,
      targetTranslation,
      nativeWithDisplay,
    );
    expect(dialogue.turns[1].templates?.[0].nativeText).toBe(
      "請給我一杯美式。",
    );
    expect(dialogue.turns[1].templates?.[1].nativeText).toBe("拿鐵一杯。");
  });
});

describe("composeDialogueWithNative — same-language and missing data", () => {
  test("same language as target → no nativeText attached", () => {
    const dialogue = composeDialogueWithNative(
      blueprint,
      targetTranslation,
      targetTranslation, // same lang
    );
    expect(dialogue.turns[0].nativeText).toBeUndefined();
    expect(dialogue.turns[1].templates?.[0].nativeText).toBeUndefined();
  });

  test("missing turn in native translation → that turn has no nativeText, does not throw", () => {
    const partialNative: Translation = {
      ...nativeTranslationZh,
      turns: {
        // t1 missing intentionally
        t2: nativeTranslationZh.turns.t2,
      },
    };
    const dialogue = composeDialogueWithNative(
      blueprint,
      targetTranslation,
      partialNative,
    );
    expect(dialogue.turns[0].nativeText).toBeUndefined();
    expect(dialogue.turns[1].templates?.[0].nativeText).toBe(
      "請給我一杯美式。",
    );
  });

  test("missing template id in native → that template has no nativeText, others do", () => {
    const partialNative: Translation = {
      ...nativeTranslationZh,
      turns: {
        ...nativeTranslationZh.turns,
        t2: {
          templates: [
            { id: "t2.0", text: "請給我一杯美式。" },
            // t2.1 missing intentionally
          ],
        },
      },
    };
    const dialogue = composeDialogueWithNative(
      blueprint,
      targetTranslation,
      partialNative,
    );
    expect(dialogue.turns[1].templates?.[0].nativeText).toBe(
      "請給我一杯美式。",
    );
    expect(dialogue.turns[1].templates?.[1].nativeText).toBeUndefined();
  });
});

describe("attachNativeText — client-side overlay onto a composed Dialogue", () => {
  test("attaches nativeText equivalent to composeDialogueWithNative", () => {
    const fromCompose = composeDialogueWithNative(
      blueprint,
      targetTranslation,
      nativeTranslationZh,
    );
    const base = composeDialogue(blueprint, targetTranslation);
    const fromAttach = attachNativeText(base, nativeTranslationZh);
    expect(fromAttach.turns[0].nativeText).toBe(fromCompose.turns[0].nativeText);
    expect(fromAttach.turns[1].templates?.[0].nativeText).toBe(
      fromCompose.turns[1].templates?.[0].nativeText,
    );
    expect(fromAttach.turns[1].templates?.[1].nativeText).toBe(
      fromCompose.turns[1].templates?.[1].nativeText,
    );
  });

  test("same-language native → returns the same Dialogue reference (referential equality)", () => {
    const base = composeDialogue(blueprint, targetTranslation);
    const out = attachNativeText(base, targetTranslation);
    expect(out).toBe(base);
  });

  test("does not mutate the source Dialogue", () => {
    const base = composeDialogue(blueprint, targetTranslation);
    const before = JSON.parse(JSON.stringify(base));
    attachNativeText(base, nativeTranslationZh);
    expect(JSON.parse(JSON.stringify(base))).toEqual(before);
  });

  test("missing native turns leave the original Dialogue untouched at those turns", () => {
    const base = composeDialogue(blueprint, targetTranslation);
    const partialNative: Translation = {
      ...nativeTranslationZh,
      turns: {
        t2: nativeTranslationZh.turns.t2,
      },
    };
    const out = attachNativeText(base, partialNative);
    expect(out.turns[0].nativeText).toBeUndefined();
    expect(out.turns[1].templates?.[0].nativeText).toBe("請給我一杯美式。");
  });
});

describe("composeDialogueWithNative — does not mutate input", () => {
  test("input translations are unchanged after compose", () => {
    const targetClone = JSON.parse(JSON.stringify(targetTranslation));
    const nativeClone = JSON.parse(JSON.stringify(nativeTranslationZh));
    composeDialogueWithNative(blueprint, targetTranslation, nativeTranslationZh);
    expect(targetTranslation).toEqual(targetClone);
    expect(nativeTranslationZh).toEqual(nativeClone);
  });
});
