/**
 * TDD spec: validateTranslationIme.
 *
 * Japanese rules (under the pure-romaji input + native-script prompt
 * design):
 *   - `text` (typing target) must be pure ASCII with no whitespace.
 *   - `display` (chat bubble + first prompt line) is unrestricted —
 *     typically kanji+kana. Free to differ from `text`.
 *   - `display_romaji` (second prompt line) must be ASCII; spaces
 *     allowed. Optional.
 *
 * Korean rules (still pure-romaja input):
 *   - `text` must be pure ASCII (spaces allowed).
 *   - `display`, when present, must be ASCII and equal `text`.
 */

import { describe, expect, test } from "vitest";
import { validateTranslationIme } from "@/lib/data/dialogues/validate-ime";
import type { Translation } from "@/lib/data/dialogues/schema";

interface TestTemplate {
  id: string;
  text?: string;
  display?: string;
  display_romaji?: string;
  display_furigana?: Array<{ jp: string; ro?: string; kana?: string }>;
}

function ja(templates: TestTemplate[]): Translation {
  return {
    schema_version: 1,
    blueprint_id: "test",
    language: "ja",
    title: "test",
    turns: { t1: { templates } },
  };
}

function ko(templates: TestTemplate[]): Translation {
  return {
    schema_version: 1,
    blueprint_id: "test",
    language: "ko",
    title: "test",
    turns: { t1: { templates } },
  };
}

describe("validateTranslationIme — Japanese display must carry native script", () => {
  test("flags a player template whose display is pure ASCII with no furigana", () => {
    // Regression: many B1/B2 ja files predate the Sprint 1 migration and
    // still ship player templates as raw romaji strings. They render in
    // the chat bubble as `convolutionalneuralnetworkdesu…`, which is
    // useless to a learner. Validator must catch them.
    const issues = validateTranslationIme(
      ja([
        {
          id: "t2.0",
          text: "convolutionalneuralnetworkdesu",
          display: "convolutionalneuralnetworkdesu",
        },
      ]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("display");
    expect(issues[0].problem).toMatch(/native script/i);
  });

  test("accepts a player template with hiragana display", () => {
    const issues = validateTranslationIme(
      ja([{ id: "t1.0", text: "konnichiwa", display: "こんにちは" }]),
    );
    expect(issues).toEqual([]);
  });

  test("accepts a player template with kanji+kana display", () => {
    const issues = validateTranslationIme(
      ja([{ id: "t1.0", text: "honntouni", display: "本当に" }]),
    );
    expect(issues).toEqual([]);
  });

  test("accepts a player template with display_furigana (compose derives display)", () => {
    const issues = validateTranslationIme(
      ja([
        {
          id: "t1.0",
          display: "本当",
          display_furigana: [{ jp: "本当", kana: "ほんとう" }],
        } as TestTemplate,
      ]),
    );
    expect(issues).toEqual([]);
  });
});

describe("validateTranslationIme — Japanese pure romaji", () => {
  test("space-free ASCII player text passes", () => {
    expect(
      validateTranslationIme(
        ja([{ id: "t1.0", text: "ohayougozaimasu", display: "おはようございます" }]),
      ),
    ).toEqual([]);
  });

  test("text + native-script display passes", () => {
    expect(
      validateTranslationIme(
        ja([{ id: "t1.0", text: "ohayou", display: "おはよう" }]),
      ),
    ).toEqual([]);
  });

  test("text containing a space is rejected", () => {
    const issues = validateTranslationIme(
      ja([
        { id: "t1.0", text: "ohayou gozaimasu", display: "おはようございます" },
      ]),
    );
    expect(issues.length).toBeGreaterThan(0);
    const textIssue = issues.find((i) => i.field === "text");
    expect(textIssue?.problem).toMatch(/space|whitespace/i);
  });

  test("display can contain spaces (kanji-mixed prompts often do)", () => {
    expect(
      validateTranslationIme(
        ja([{ id: "t1.0", text: "ohayou", display: "おはよう ございます" }]),
      ),
    ).toEqual([]);
  });

  test("text containing kanji is rejected", () => {
    const issues = validateTranslationIme(
      ja([{ id: "t1.0", text: "ohayou 元気", display: "おはよう元気" }]),
    );
    expect(issues.find((i) => i.field === "text")?.problem).toMatch(/non-ASCII/i);
  });

  test("text containing hiragana is rejected", () => {
    const issues = validateTranslationIme(
      ja([{ id: "t1.0", text: "おはよう", display: "おはよう" }]),
    );
    expect(issues.find((i) => i.field === "text")).toBeDefined();
  });

  test("display containing kanji+kana is OK for ja (it's the prompt above the typing area)", () => {
    expect(
      validateTranslationIme(
        ja([{ id: "t1.0", text: "ohayougozaimasu", display: "おはようございます" }]),
      ),
    ).toEqual([]);
  });

  test("ja display does NOT need to equal text (it shows the native-script prompt)", () => {
    expect(
      validateTranslationIme(
        ja([{ id: "t1.0", text: "ohayougozaimasu", display: "おはようございます" }]),
      ),
    ).toEqual([]);
  });

  test("ja display_romaji must be ASCII when present", () => {
    const issues = validateTranslationIme(
      ja([
        {
          id: "t1.0",
          text: "ohayougozaimasu",
          display: "おはよう",
          display_romaji: "おはよう gozaimasu",
        },
      ]),
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].field).toBe("display_romaji");
  });

  test("ja display_romaji with proper spaced romaji passes", () => {
    expect(
      validateTranslationIme(
        ja([
          {
            id: "t1.0",
            text: "ohayougozaimasu",
            display: "おはようございます",
            display_romaji: "ohayou gozaimasu",
          },
        ]),
      ),
    ).toEqual([]);
  });

  test("ja display_furigana with all-ASCII ro segments passes", () => {
    expect(
      validateTranslationIme(
        ja([
          {
            id: "t1.0",
            text: "anatagasonzai",
            display_furigana: [
              { jp: "あなた", ro: "anata" },
              { jp: "が", ro: "ga" },
              { jp: "存在", ro: "sonzai" },
            ],
          },
        ]),
      ),
    ).toEqual([]);
  });

  test("ja display_furigana with non-ASCII ro is rejected", () => {
    const issues = validateTranslationIme(
      ja([
        {
          id: "t1.0",
          text: "sonzai",
          display_furigana: [{ jp: "存在", ro: "そんざい" }],
        },
      ]),
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].field).toBe("display_furigana");
  });

  test("ja display_furigana with whitespace inside a single ro segment is rejected", () => {
    const issues = validateTranslationIme(
      ja([
        {
          id: "t1.0",
          text: "shitehoshii",
          display_furigana: [{ jp: "してほしい", ro: "shite hoshii" }],
        },
      ]),
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].field).toBe("display_furigana");
    expect(issues[0].problem).toMatch(/whitespace|space/i);
  });

  test("ja text must equal the concatenation of display_furigana[].ro", () => {
    const issues = validateTranslationIme(
      ja([
        {
          id: "t1.0",
          text: "anatagahaiku",
          display_furigana: [
            { jp: "あなた", ro: "anata" },
            { jp: "が", ro: "ga" },
            { jp: "存在", ro: "sonzai" },
          ],
        },
      ]),
    );
    expect(issues.length).toBeGreaterThan(0);
    const concatIssue = issues.find((i) => /concat|match/i.test(i.problem));
    expect(concatIssue).toBeDefined();
    expect(concatIssue?.field).toBe("text");
  });

  test("ja text matching concatenation of ro segments passes", () => {
    expect(
      validateTranslationIme(
        ja([
          {
            id: "t1.0",
            text: "anatagasonzai",
            display_furigana: [
              { jp: "あなた", ro: "anata" },
              { jp: "が", ro: "ga" },
              { jp: "存在", ro: "sonzai" },
            ],
          },
        ]),
      ),
    ).toEqual([]);
  });

  test("display with native script is required (no longer falls back to ASCII text)", () => {
    // Post-Sprint-7: a player template without any native-script
    // display is rejected so chat bubbles always render real Japanese.
    const issues = validateTranslationIme(
      ja([{ id: "t1.0", text: "ohayou" }]),
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].field).toBe("display");
  });

  test("punctuation and digits in ja text are fine (only spaces are banned)", () => {
    expect(
      validateTranslationIme(
        ja([
          {
            id: "t1.0",
            text: "ohayou,gozaimasu!ogenki?",
            display: "おはよう、ございます!お元気?",
          },
        ]),
      ),
    ).toEqual([]);
  });

  test("ko text WITH spaces is still allowed (rule is ja-only)", () => {
    expect(
      validateTranslationIme(ko([{ id: "t1.0", text: "annyeong haseyo" }])),
    ).toEqual([]);
  });
});

describe("validateTranslationIme — Korean pure romaja", () => {
  test("plain ASCII passes", () => {
    expect(
      validateTranslationIme(ko([{ id: "t1.0", text: "annyeonghaseyo" }])),
    ).toEqual([]);
  });

  test("hangul in text is rejected", () => {
    const issues = validateTranslationIme(ko([{ id: "t1.0", text: "안녕" }]));
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("text");
  });

  test("hangul display + matching RR text is accepted", () => {
    // B2: ko now allows display as 한글; text must equal
    // hangulToRomaja(display) when supplied alongside.
    const issues = validateTranslationIme(
      ko([{ id: "t1.0", text: "annyeong", display: "안녕" }]),
    );
    expect(issues).toEqual([]);
  });

  test("hangul display + mismatched RR text is rejected", () => {
    const issues = validateTranslationIme(
      ko([{ id: "t1.0", text: "wrong", display: "안녕" }]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("text");
  });

  test("hangul display with text omitted is accepted (compose derives)", () => {
    const issues = validateTranslationIme(
      ko([{ id: "t1.0", display: "안녕" }]),
    );
    expect(issues).toEqual([]);
  });
});

describe("validateTranslationIme — non-IME languages skip validation", () => {
  test("English with display matching is fine", () => {
    const t: Translation = {
      schema_version: 1,
      blueprint_id: "test",
      language: "en",
      title: "test",
      turns: { t1: { templates: [{ id: "t1.0", text: "Hello" }] } },
    };
    expect(validateTranslationIme(t)).toEqual([]);
  });

  test("zh-tw player text in Chinese characters is fine (DirectIME types CJK directly)", () => {
    const t: Translation = {
      schema_version: 1,
      blueprint_id: "test",
      language: "zh-tw",
      title: "test",
      turns: { t1: { templates: [{ id: "t1.0", text: "你好" }] } },
    };
    expect(validateTranslationIme(t)).toEqual([]);
  });
});

describe("validateTranslationIme — bot turns are skipped", () => {
  test("bot text in kanji is fine (not typed by player)", () => {
    const t: Translation = {
      schema_version: 1,
      blueprint_id: "test",
      language: "ja",
      title: "test",
      turns: {
        t1: { text: "おはようございます。元気ですか?" },
        t2: {
          templates: [
            { id: "t2.0", text: "genkidesu", display: "元気です" },
          ],
        },
      },
    };
    expect(validateTranslationIme(t)).toEqual([]);
  });
});
