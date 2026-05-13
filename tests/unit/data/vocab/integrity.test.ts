/**
 * Data integrity invariants for the on-disk vocab corpus.
 *
 * These tests don't exercise functions — they read the JSON straight from
 * `public/` and assert content-level guarantees so that future content
 * additions can't silently drift (missing translations, dangling deck
 * references, duplicate concept ids, empty strings, etc.).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import {
  ConceptsFileSchema,
  DeckSchema,
  TranslationsFileSchema,
  type Concept,
  type Translation,
} from "@/lib/data/vocab/schema";

const ROOT = path.join(process.cwd(), "public");
const SUPPORTED_LANGUAGES = ["en", "zh-tw", "es", "ja", "ko", "it", "de"] as const;

/**
 * Alphabet drill concepts (`kind === "letter"`) ship in only one
 * language by design — they teach the script itself, so e.g. a German
 * speaker has nothing to learn from a "ka → か" card. The cross-language
 * coverage tests below exempt them.
 */
function isVocabConcept(c: Concept): boolean {
  return c.kind !== "letter";
}

let concepts: Concept[];
const translationsByLang = new Map<string, Translation[]>();
let decks: { id: string; conceptIds: string[]; cefr: string }[];

async function readJson(p: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(p, "utf-8"));
}

beforeAll(async () => {
  concepts = ConceptsFileSchema.parse(
    await readJson(path.join(ROOT, "concepts", "concepts.json")),
  ).concepts;
  for (const lang of SUPPORTED_LANGUAGES) {
    const parsed = TranslationsFileSchema.parse(
      await readJson(path.join(ROOT, "concepts", "translations", `${lang}.json`)),
    );
    translationsByLang.set(lang, parsed.translations);
  }
  const deckDir = path.join(ROOT, "decks");
  const files = await fs.readdir(deckDir);
  decks = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const parsed = DeckSchema.parse(await readJson(path.join(deckDir, f)));
    decks.push({ id: parsed.id, conceptIds: parsed.conceptIds, cefr: parsed.cefr });
  }
});

describe("concepts.json", () => {
  test("ids are unique", () => {
    const seen = new Map<string, number>();
    for (const c of concepts) {
      seen.set(c.id, (seen.get(c.id) ?? 0) + 1);
    }
    const dupes = Array.from(seen.entries())
      .filter(([, n]) => n > 1)
      .map(([id]) => id);
    expect(dupes, `duplicate concept ids: ${dupes.join(", ")}`).toEqual([]);
  });

  test("every concept has an emoji (visual anchor)", () => {
    const missing = concepts.filter((c) => !c.emoji).map((c) => c.id);
    expect(missing, `concepts missing emoji: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("translations cross-cover the concept catalog", () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    test(`every (non-letter) concept has a ${lang} translation`, () => {
      const list = translationsByLang.get(lang) ?? [];
      const byId = new Set(list.map((t) => t.conceptId));
      const missing = concepts
        .filter(isVocabConcept)
        .filter((c) => !byId.has(c.id))
        .map((c) => c.id);
      expect(missing, `${lang} missing: ${missing.join(", ")}`).toEqual([]);
    });

    test(`alphabet (letter-kind) concepts ship only in their target language`, () => {
      // Letter concepts have an implicit target language baked into the
      // category (alphabet.hiragana / alphabet.katakana / alphabet.hangul).
      // They should appear only in ja / ko respectively, never elsewhere.
      const TARGET: Record<string, "ja" | "ko"> = {
        "alphabet.hiragana.basic": "ja",
        "alphabet.hiragana.dakuten": "ja",
        "alphabet.hiragana.yoon": "ja",
        "alphabet.katakana.basic": "ja",
        "alphabet.katakana.dakuten": "ja",
        "alphabet.katakana.yoon": "ja",
        "alphabet.hangul.basic": "ko",
        "alphabet.hangul.aspirated": "ko",
        "alphabet.hangul.palatalized": "ko",
      };
      const list = translationsByLang.get(lang) ?? [];
      const byId = new Set(list.map((t) => t.conceptId));
      const wrong = concepts
        .filter((c) => c.kind === "letter")
        .filter((c) => byId.has(c.id) && TARGET[c.category] !== lang)
        .map((c) => c.id);
      expect(wrong, `${lang} should not have letter rows: ${wrong.join(", ")}`).toEqual([]);
    });

    test(`${lang} has no orphan translations (every conceptId resolves)`, () => {
      const conceptIds = new Set(concepts.map((c) => c.id));
      const list = translationsByLang.get(lang) ?? [];
      const orphans = list
        .filter((t) => !conceptIds.has(t.conceptId))
        .map((t) => t.conceptId);
      expect(orphans, `${lang} orphans: ${orphans.join(", ")}`).toEqual([]);
    });

    test(`${lang} translation text is never empty`, () => {
      const list = translationsByLang.get(lang) ?? [];
      const empties = list.filter((t) => t.text.trim() === "").map((t) => t.conceptId);
      expect(empties, `${lang} empty text: ${empties.join(", ")}`).toEqual([]);
    });
  }
});

describe("decks reference valid concepts", () => {
  test("every deck.conceptId resolves to a real concept", () => {
    const conceptIds = new Set(concepts.map((c) => c.id));
    const errors: string[] = [];
    for (const d of decks) {
      for (const id of d.conceptIds) {
        if (!conceptIds.has(id)) {
          errors.push(`${d.id}: ${id}`);
        }
      }
    }
    expect(errors).toEqual([]);
  });

  test("deck conceptIds are unique within each deck", () => {
    const errors: string[] = [];
    for (const d of decks) {
      const seen = new Set<string>();
      for (const id of d.conceptIds) {
        if (seen.has(id)) errors.push(`${d.id}: dup ${id}`);
        seen.add(id);
      }
    }
    expect(errors).toEqual([]);
  });

  test("each deck has at least 4 cards (worth a session)", () => {
    const tooSmall = decks.filter((d) => d.conceptIds.length < 4).map((d) => d.id);
    expect(tooSmall, `decks <4 cards: ${tooSmall.join(", ")}`).toEqual([]);
  });
});

describe("register field (when present) uses an allowed value", () => {
  const ALLOWED = new Set(["formal", "neutral", "casual", "slang", "idiom"]);

  for (const lang of SUPPORTED_LANGUAGES) {
    test(`${lang} register values are valid`, () => {
      const list = translationsByLang.get(lang) ?? [];
      const bad = list
        .filter((t) => {
          const r = (t as Translation & { register?: string }).register;
          return r !== undefined && !ALLOWED.has(r);
        })
        .map((t) => `${t.conceptId}=${(t as Translation & { register?: string }).register}`);
      expect(bad, `${lang} bad register: ${bad.join(", ")}`).toEqual([]);
    });
  }
});
