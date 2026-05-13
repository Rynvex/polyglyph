/**
 * composeDialogue — merge a Blueprint with a Translation into the runtime
 * Dialogue shape consumed by the engine, controller, and scene. Errors
 * surface bad combinations early (missing turn text, mismatched
 * blueprint id) rather than letting the runtime fail mid-conversation.
 *
 * For ja translations using `display_furigana[].kana`, the Hepburn `ro`
 * for each segment and the template `text` are derived here via
 * `kanaToHepburn` so authors can stop hand-writing romaji. Legacy
 * translations that supply `ro` directly still work — `kana` simply
 * takes precedence when both are present.
 */

import {
  DialogueSchema,
  type Dialogue,
  type Template,
  type Turn,
} from "@/lib/data/schema";
import { germanFold, latinFold } from "@/lib/typing/ime/diacritic-fold";
import { hangulToRomaja } from "@/lib/typing/ime/hangul-to-romaja";
import { kanaToHepburn } from "@/lib/typing/ime/kana-to-hepburn";
import type {
  Blueprint,
  Translation,
  TranslationTemplate,
} from "./schema";

const HANGUL_PRESENT = /[가-힣]/;

interface DerivedSegment {
  readonly jp: string;
  readonly ro: string;
}

function deriveSegment(seg: { jp: string; kana?: string; ro?: string }): DerivedSegment {
  if (seg.kana !== undefined) {
    return { jp: seg.jp, ro: kanaToHepburn(seg.kana) };
  }
  if (seg.ro !== undefined) {
    return { jp: seg.jp, ro: seg.ro };
  }
  throw new Error(`Furigana segment for "${seg.jp}" has neither kana nor ro`);
}

function deriveTemplate(
  turnId: string,
  t: TranslationTemplate,
  language: string,
): Template {
  const segments = t.display_furigana?.map(deriveSegment);
  const text = (() => {
    if (t.text !== undefined && t.text !== "") return t.text;
    if (segments && segments.length > 0) return segments.map((s) => s.ro).join("");
    // ko: derive text from hangul display via Revised Romanization.
    if (
      language === "ko" &&
      t.display !== undefined &&
      HANGUL_PRESENT.test(t.display)
    ) {
      return hangulToRomaja(t.display);
    }
    // de: derive ASCII text by folding ä/ö/ü/ß. Pure-ASCII display
    // round-trips unchanged so the fold path doubles as a generic
    // "display is the text" fallback for de templates.
    if (language === "de" && t.display !== undefined) {
      return germanFold(t.display);
    }
    // es / it: derive ASCII text by stripping diacritics. Same generic
    // fallback property as `de` above — fold of pure ASCII is itself.
    if (
      (language === "es" || language === "it") &&
      t.display !== undefined
    ) {
      return latinFold(t.display);
    }
    // en / zh-tw / any other: use display verbatim as text.
    if (t.display !== undefined && t.display !== "") {
      return t.display;
    }
    throw new Error(
      `Template ${turnId}/${t.id} requires text, display_furigana, or a display string`,
    );
  })();

  return {
    id: t.id,
    text,
    display: t.display,
    display_romaji: t.display_romaji,
    display_furigana: segments,
    hint_zh: t.hint_zh,
    weight: t.weight ?? 1.0,
    next: t.next,
  };
}

/**
 * Pick the human-readable native form of a template — what a native
 * speaker would actually read. `display` wins when present (raw kanji /
 * hangul / accented Latin); `text` is the ASCII fallback used by
 * languages whose typing target IS the display form (en, zh-tw).
 */
function pickTemplateNativeText(
  t: TranslationTemplate,
): string | undefined {
  if (t.display !== undefined && t.display !== "") return t.display;
  if (t.text !== undefined && t.text !== "") return t.text;
  return undefined;
}

/**
 * Overlay native-language strings onto an already-composed Dialogue.
 * Used client-side when the native translation is fetched separately
 * from a localStorage-driven preference. Same degradation rules as
 * composeDialogueWithNative.
 *
 * Returns the same Dialogue reference when the native language matches
 * the dialogue's language (preserves React referential equality so the
 * scene does not re-render needlessly).
 */
export function attachNativeText(
  dialogue: Dialogue,
  nativeTranslation: Translation,
): Dialogue {
  if (nativeTranslation.language === dialogue.language) return dialogue;

  const annotatedTurns: Turn[] = dialogue.turns.map((turn) => {
    const nativeSlot = nativeTranslation.turns[turn.id];
    if (!nativeSlot) return turn;

    if (turn.templates && turn.templates.length > 0) {
      const nativeTemplates = nativeSlot.templates ?? [];
      const annotatedTemplates: Template[] = turn.templates.map((tmpl) => {
        const match = nativeTemplates.find((nt) => nt.id === tmpl.id);
        if (!match) return tmpl;
        const nativeText = pickTemplateNativeText(match);
        if (nativeText === undefined) return tmpl;
        return { ...tmpl, nativeText };
      });
      return { ...turn, templates: annotatedTemplates };
    }

    if (nativeSlot.text === undefined || nativeSlot.text === "") return turn;
    return { ...turn, nativeText: nativeSlot.text };
  });

  return { ...dialogue, turns: annotatedTurns };
}

/**
 * Variant of composeDialogue that additionally attaches `nativeText` to
 * Turns and Templates from a parallel native-language Translation. See
 * the schema docstrings for `Turn.nativeText` / `Template.nativeText`.
 *
 * Degradation rules (intentional, no throws):
 *   - `nativeTranslation === undefined` → no nativeText anywhere.
 *   - `nativeTranslation.language === translation.language` → ditto.
 *   - Turn id missing in native → that turn has no nativeText.
 *   - Template id not matched in native → that template has no nativeText.
 */
export function composeDialogueWithNative(
  blueprint: Blueprint,
  translation: Translation,
  nativeTranslation?: Translation,
): Dialogue {
  const base = composeDialogue(blueprint, translation);
  if (!nativeTranslation) return base;
  return attachNativeText(base, nativeTranslation);
}

export function composeDialogue(
  blueprint: Blueprint,
  translation: Translation,
): Dialogue {
  if (blueprint.id !== translation.blueprint_id) {
    throw new Error(
      `Blueprint id mismatch: blueprint=${blueprint.id}, translation=${translation.blueprint_id}`,
    );
  }

  const turns: Turn[] = blueprint.turns.map((bt) => {
    const slot = translation.turns[bt.id];
    if (!slot) {
      throw new Error(
        `Translation (${translation.language}) is missing turn ${bt.id}`,
      );
    }
    if (bt.has_templates) {
      const templates = slot.templates;
      if (!templates || templates.length === 0) {
        throw new Error(
          `Translation (${translation.language}) turn ${bt.id} requires templates`,
        );
      }
      const mapped = templates.map((t) =>
        deriveTemplate(bt.id, t, translation.language),
      );
      return {
        id: bt.id,
        speaker: bt.speaker,
        templates: mapped,
      };
    }
    if (!slot.text) {
      throw new Error(
        `Translation (${translation.language}) turn ${bt.id} requires text`,
      );
    }
    return { id: bt.id, speaker: bt.speaker, text: slot.text };
  });

  const dialogue = {
    schema_version: 1,
    id: `${translation.language}.${blueprint.id}.${blueprint.level.toLowerCase()}`,
    language: translation.language,
    level: blueprint.level,
    topic: blueprint.topic,
    title: translation.title,
    description: translation.description,
    estimated_minutes: blueprint.estimated_minutes,
    tags: blueprint.tags,
    characters: translation.characters,
    turns,
  };

  return DialogueSchema.parse(dialogue);
}
