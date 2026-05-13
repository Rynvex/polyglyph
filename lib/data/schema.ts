/**
 * Zod schema for dialogue scripts.
 *
 * Forward-compatible: unknown fields are stripped silently (default zod
 * behavior) so adding fields in future schema versions never breaks old
 * clients. The document-level `schema_version` is reserved for breaking
 * migrations.
 */

import { z } from "zod";

export const SpeakerSchema = z.enum(["bot", "player"]);
export const LevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1"]);

/**
 * The seven languages Polyglyph practices in. Closed enum so the loader
 * knows which folders to scan and the UI knows which pickers to render.
 *
 *   en     English
 *   zh-tw  Traditional Chinese (Taiwan)
 *   ja     Japanese
 *   ko     Korean
 *   it     Italian
 *   de     German
 *   es     Spanish
 *
 * For non-Latin scripts (zh-tw, ja, ko) the typing target is the
 * romanized form (pinyin / romaji / revised romanization) until the
 * matching IME ships.
 */
export const LanguageSchema = z.enum([
  "en",
  "zh-tw",
  "ja",
  "ko",
  "it",
  "de",
  "es",
]);

/**
 * Canonical domains a dialogue can belong to. Closed enum so the
 * library stays browseable as it grows; granular sub-classifications
 * (e.g. "ordering_food") live in `tags[]`.
 *
 *   daily     small talk, weather, family, time, routine
 *   travel    airport, hotel, directions, transit
 *   food      restaurant, cafe, ordering, cooking
 *   services  health, shopping, banking, repair, customer service
 *   work      interviews, meetings, peer chat, manager 1-on-1, project
 *   tech      system design, ML/AI, programming, dev tools
 *   mind      decision-making, biases, mental models, methodology
 */
export const TopicSchema = z.enum([
  "daily",
  "travel",
  "food",
  "services",
  "work",
  "tech",
  "mind",
]);

export const CharacterSchema = z.object({
  name: z.string(),
  avatar: z.string().optional(),
  voice: z.string().optional(),
});

export const TemplateSchema = z.object({
  id: z.string(),
  /**
   * What the player types and what the typing engine matches against.
   * For non-Latin languages without a real IME this is a romanization
   * (romaji / pinyin / Revised Romanization).
   */
  text: z.string(),
  /**
   * Optional override for the chat bubble shown after commit. Used so
   * the player types romaji but the chat displays the native script
   * (e.g. type "ohayou gozaimasu", bubble shows おはようございます).
   * Falls back to `text` when absent so existing scripts are unaffected.
   */
  display: z.string().optional(),
  /**
   * Optional second-line hint shown above the typing area — the spaced
   * romaji form for languages where the typed `text` is intentionally
   * unspaced (currently ja). Display-only; not used for matching.
   */
  display_romaji: z.string().optional(),
  /**
   * Structured furigana — list of `{ jp, ro }` segments rendered with
   * HTML <ruby> so the Hepburn romaji floats inline above each chunk
   * of native script. Display-only; not used for matching.
   */
  display_furigana: z
    .array(z.object({ jp: z.string().min(1), ro: z.string() }))
    .optional(),
  weight: z.number().default(1.0),
  hint_zh: z.string().optional(),
  next: z.string().optional(),
  /**
   * Native-language display string for this template, attached by
   * composeDialogueWithNative when a native translation is available.
   * Rendered as a translation strip beneath the player bubble when the
   * user opts in. Undefined when no native source / same-lang pair /
   * missing template id in native file.
   */
  nativeText: z.string().optional(),
});

export const TurnSchema = z
  .object({
    id: z.string(),
    speaker: SpeakerSchema,
    text: z.string().optional(),
    templates: z.array(TemplateSchema).optional(),
    audio: z.string().optional(),
    translation_zh: z.string().optional(),
    /**
     * Native-language version of an NPC turn (no-templates path),
     * attached by composeDialogueWithNative when a native translation is
     * available. Rendered as a translation strip beneath the bot bubble
     * when the user opts in. Undefined when no native source / same-lang.
     */
    nativeText: z.string().optional(),
  })
  .refine(
    (t) => Boolean(t.text) || (t.templates && t.templates.length > 0),
    { message: "Turn must have either 'text' or 'templates'" },
  );

export const RewardTierSchema = z.object({
  xp: z.number().int().default(0),
  badge: z.string().optional(),
});

export const RewardsSchema = z.object({
  complete: RewardTierSchema.optional(),
  perfect: RewardTierSchema.optional(),
});

export const DialogueSchema = z.object({
  schema_version: z.number().int(),
  id: z.string(),
  language: LanguageSchema,
  level: LevelSchema,
  topic: TopicSchema,
  title: z.string(),
  description: z.string().optional(),
  estimated_minutes: z.number().int().optional(),
  tags: z.array(z.string()).default([]),
  characters: z.record(z.string(), CharacterSchema).optional(),
  turns: z.array(TurnSchema),
  rewards: RewardsSchema.optional(),
});

export type Speaker = z.infer<typeof SpeakerSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Language = z.infer<typeof LanguageSchema>;
export type Template = z.infer<typeof TemplateSchema>;
export type Turn = z.infer<typeof TurnSchema>;
export type Dialogue = z.infer<typeof DialogueSchema>;
