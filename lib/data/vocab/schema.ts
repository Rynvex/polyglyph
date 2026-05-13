/**
 * Vocab module schema (zod).
 *
 * Concept = language-independent semantic atom (e.g., "apple" or "to run").
 * Translation = per-language label + optional pronunciation aids.
 * Deck = curated list of conceptIds for a practice session.
 */

import { z } from "zod";

export const ConceptKindSchema = z.enum([
  "noun",
  "verb",
  "adjective",
  "phrase",
  /** Single character (hiragana / katakana / hangul syllable) for the
   * alphabet drill. Renders differently in VocabCard — the native char
   * itself is the visual anchor, not an emoji. */
  "letter",
]);
export const VocabLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1"]);

/**
 * Part of speech finer-grained than `kind` — used by the visual rule
 * engine (G2/G3) to pick L1 emoji vs L2 icon vs L3 photo vs L4 text-only.
 */
export const PartOfSpeechSchema = z.enum([
  "noun-concrete",
  "noun-abstract",
  "verb-action",
  "verb-state",
  "adjective",
  "adverb",
  "preposition",
  "conjunction",
  "interjection",
  "determiner",
  "pronoun",
  "particle",
]);

/**
 * Visual strategy (see docs/VISUAL_STRATEGY.md).
 *   emoji  – L1: single emoji char, asset is the codepoint(s)
 *   icon   – L2: Lucide icon name (e.g. "lightbulb")
 *   photo  – L3: Unsplash photo id (Concept.visual.attribution carries credit)
 *   none   – L4: text-only card; asset must be null
 */
export const VisualKindSchema = z.enum(["emoji", "icon", "photo", "none"]);
export const VisualSchema = z.object({
  kind: VisualKindSchema,
  asset: z.string().nullable(),
  attribution: z.string().optional(),
});

export const FrequencySchema = z.object({
  /** Upstream list this rank came from (e.g. "ngsl", "coca-5k"). */
  source: z.string(),
  /** 1-based rank within that source list. */
  rank: z.number().int().positive(),
});

/** Optional usage example for a translation. */
export const TranslationExampleSchema = z.object({
  text: z.string(),
  /** Hint per native language (open record so adding hint_<lang> later
   * doesn't require schema changes). */
  hints: z.record(z.string(), z.string()).optional(),
});

/**
 * Register marks the speech-style of a translation:
 *   - formal:  textbook / business / written
 *   - neutral: default; safe in most contexts (default if omitted)
 *   - casual:  everyday spoken
 *   - slang:   in-group, generational, may date quickly
 *   - idiom:   fixed expression whose meaning isn't literal
 *
 * Multiple translations of the same concept can coexist with different
 * registers (e.g. "police officer" / "cop" / "5-0" all map to one
 * concept in en).
 */
export const RegisterSchema = z.enum([
  "formal",
  "neutral",
  "casual",
  "slang",
  "idiom",
]);

export const ConceptSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, "Concept id must be lowercase letters/digits/underscore"),
  /** Legacy single emoji field (forward-compatible — pre-G3 data). */
  emoji: z.string().optional(),
  category: z.string(),
  cefr: VocabLevelSchema,
  kind: ConceptKindSchema,
  notes: z.string().optional(),
  /** G3 fields — optional during migration, become required as the
   * 10,000-concept push lands. */
  pos: PartOfSpeechSchema.optional(),
  visual: VisualSchema.optional(),
  frequency: FrequencySchema.optional(),
});

export const TranslationSchema = z.object({
  conceptId: z.string(),
  language: z.string(),
  text: z.string(),
  romaji: z.string().optional(),
  pronunciation: z.string().optional(),
  notes: z.string().optional(),
  register: RegisterSchema.optional(),
  /** G3 — example sentences attached to a translation. */
  examples: z.array(TranslationExampleSchema).optional(),
});

export const DeckKindSchema = z.enum(["vocab", "alphabet"]);

export const DeckSchema = z.object({
  id: z.string(),
  title: z.string(),
  cefr: VocabLevelSchema,
  description: z.string().optional(),
  conceptIds: z.array(z.string()).min(1),
  estimated_minutes: z.number().int().optional(),
  /** Defaults to "vocab" for backwards compatibility. Decks made up of
   * `kind: "letter"` concepts (hiragana / katakana / hangul drills)
   * mark themselves `"alphabet"` so the landing page can route them
   * through the dedicated Alphabet tab. */
  kind: DeckKindSchema.default("vocab"),
  /** Override the play-page target language. Alphabet decks set this
   * to the language whose script they teach (`ja` for kana, `ko` for
   * hangul) — clicking the deck routes to /vocab/<target>/<id>
   * regardless of which target the user picked, because the deck's
   * translations only exist for that one language. */
  target: z.string().optional(),
});

export type ConceptKind = z.infer<typeof ConceptKindSchema>;
export type DeckKind = z.infer<typeof DeckKindSchema>;
export type VocabLevel = z.infer<typeof VocabLevelSchema>;
export type Register = z.infer<typeof RegisterSchema>;
export type PartOfSpeech = z.infer<typeof PartOfSpeechSchema>;
export type VisualKind = z.infer<typeof VisualKindSchema>;
export type Visual = z.infer<typeof VisualSchema>;
export type Frequency = z.infer<typeof FrequencySchema>;
export type TranslationExample = z.infer<typeof TranslationExampleSchema>;
export type Concept = z.infer<typeof ConceptSchema>;
export type Translation = z.infer<typeof TranslationSchema>;
export type Deck = z.infer<typeof DeckSchema>;

export const ConceptsFileSchema = z.object({
  schema_version: z.literal(1),
  concepts: z.array(ConceptSchema),
});

export const TranslationsFileSchema = z.object({
  schema_version: z.literal(1),
  language: z.string(),
  translations: z.array(TranslationSchema),
});
