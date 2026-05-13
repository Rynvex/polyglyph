/**
 * Blueprint + Translation schemas — the language-independent dialogue
 * layer. Mirrors the vocab module's split: a Blueprint is the canonical
 * skeleton (turn order, speaker, level, topic, voice/character keys),
 * Translation supplies the per-language strings. composeDialogue() merges
 * them into the runtime Dialogue shape used by the engine and UI.
 */

import { z } from "zod";
import {
  LanguageSchema,
  LevelSchema,
  SpeakerSchema,
  TopicSchema,
} from "@/lib/data/schema";

const BlueprintTurnSchema = z.object({
  id: z.string(),
  speaker: SpeakerSchema,
  has_templates: z.boolean(),
  template_count: z.number().int().positive().optional(),
});

export const BlueprintSchema = z
  .object({
    schema_version: z.literal(1),
    id: z.string().regex(/^[a-z0-9_]+$/, "Blueprint id must be lowercase letters/digits/underscore"),
    level: LevelSchema,
    topic: TopicSchema,
    estimated_minutes: z.number().int().positive().optional(),
    tags: z.array(z.string()).default([]),
    turns: z.array(BlueprintTurnSchema).min(1, "Blueprint must have at least one turn"),
  })
  .refine(
    (b) =>
      b.turns.every((t) =>
        t.speaker === "player" ? t.has_templates === true : true,
      ),
    { message: "Player turns must have has_templates: true" },
  );

const TranslationCharacterSchema = z.object({
  name: z.string(),
  voice: z.string().optional(),
  avatar: z.string().optional(),
});

const FuriganaSegmentSchema = z
  .object({
    /** A native-script chunk — usually a word or a particle. */
    jp: z.string().min(1),
    /** Reading in kana. When present, `ro` is derived programmatically
     * via `kanaToHepburn` at compose time. Authoritative for new ja
     * data; legacy entries that only carry `ro` continue to work. */
    kana: z.string().min(1).optional(),
    /** Hepburn romaji for that chunk. Optional now: when `kana` is
     * given, `ro` is computed by compose; when only `ro` is given
     * (legacy / pre-A3 migration), it is used directly. Rendered as
     * `<rt>` ruby annotation either way. */
    ro: z.string().min(1).optional(),
  })
  .refine((seg) => seg.kana !== undefined || seg.ro !== undefined, {
    message: "Furigana segment must provide kana or ro",
  });

const TranslationTemplateSchema = z.object({
  id: z.string(),
  /** Typing target. May be omitted for ja templates that supply
   * `display_furigana[].kana` — compose derives `text` as the
   * concatenation of `kanaToHepburn(seg.kana)` for every segment. */
  text: z.string().optional(),
  /** Native-script form for the chat bubble after commit and the first
   * line of the prompt above the typing area (e.g. kanji+kana for ja,
   * Hangul for ko). Falls back to `text` when absent. */
  display: z.string().optional(),
  /** Optional second line of the prompt above the typing area: the
   * spaced romaji form for ja, useful so learners can see word
   * boundaries even though the typed text is space-free. Superseded by
   * `display_furigana` when both are present. */
  display_romaji: z.string().optional(),
  /** Structured furigana — list of {jp, ro} segments rendered with
   * HTML <ruby> so the romaji floats inline above each chunk of native
   * script. The richest UX for ja learners; falls back to display +
   * display_romaji when absent. */
  display_furigana: z.array(FuriganaSegmentSchema).optional(),
  hint_zh: z.string().optional(),
  weight: z.number().optional(),
  next: z.string().optional(),
});

const TranslationTurnSchema = z.object({
  text: z.string().optional(),
  templates: z.array(TranslationTemplateSchema).optional(),
});

export const TranslationSchema = z.object({
  schema_version: z.literal(1),
  blueprint_id: z.string(),
  language: LanguageSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  characters: z
    .object({
      bot: TranslationCharacterSchema.optional(),
      player: TranslationCharacterSchema.optional(),
    })
    .optional(),
  turns: z.record(z.string(), TranslationTurnSchema).refine(
    (rec) => Object.keys(rec).length > 0,
    { message: "Translation must define at least one turn" },
  ),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;
export type BlueprintTurn = z.infer<typeof BlueprintTurnSchema>;
export type Translation = z.infer<typeof TranslationSchema>;
export type TranslationTemplate = z.infer<typeof TranslationTemplateSchema>;
