/**
 * Player-template validator for ja and ko translations.
 *
 * Japanese (ja) rules — pure-romaji input + native-script prompt:
 *   - `text` (typing target) must be pure ASCII with no whitespace.
 *     Continuous romaji like `ohayougozaimasu`. The user types this
 *     character-for-character.
 *   - `display` (chat bubble + first prompt line) is unrestricted.
 *     Typically the kanji+kana form like `おはようございます`. Free
 *     to differ from `text` — that's the whole point.
 *   - `display_romaji` (second prompt line, optional) must be pure
 *     ASCII; spaces are allowed. Used so learners can see word
 *     boundaries even though the typed `text` is space-free.
 *
 * Korean (ko) rules — pure-romaja input, native-script bubble not
 * separately stored yet:
 *   - `text` must be pure ASCII (spaces allowed; Revised Romanization
 *     conventionally separates eojeol).
 *   - `display`, when present, must be pure ASCII and equal `text`
 *     (legacy invariant; can be relaxed later if ko also gets a
 *     separate kanji-style prompt line).
 *
 * Bot turns are not validated: bots speak in the target language's
 * native script directly and never get typed.
 */

import type { Language } from "@/lib/data/schema";
import { hangulToRomaja } from "@/lib/typing/ime/hangul-to-romaja";
import { kanaToHepburn } from "@/lib/typing/ime/kana-to-hepburn";
import type { Translation, TranslationTemplate } from "./schema";

const HANGUL_PRESENT = /[가-힣]/;

const NON_ASCII = /[^\x20-\x7E]/;
const WHITESPACE = /\s/;
// Any CJK ideograph (kanji) in the kana field means the reading wasn't
// resolved during migration. ASCII (loanword brands like "Wi-Fi"),
// hiragana, katakana, and CJK punctuation are all allowed — anything
// that kanaToHepburn can map back to ASCII.
const CONTAINS_KANJI = /[一-鿿]/;
// Native Japanese script: hiragana, katakana (incl. half-width), or
// CJK Unified Ideographs (kanji). At least one of these characters
// must appear in a player template's display so the chat bubble shows
// real Japanese, not raw romaji.
const CONTAINS_JA_NATIVE = /[぀-ゟ゠-ヿｦ-ﾟ一-鿿]/;

export interface ImeValidationIssue {
  turnId: string;
  templateId: string;
  field: "text" | "display" | "display_romaji" | "display_furigana";
  problem: string;
  composed: string;
  offending: string;
}

const ROMAJI_LANGUAGES: ReadonlySet<Language> = new Set(["ja", "ko"]);

function nonAsciiOffenders(s: string): string {
  const matches = s.match(/[^\x20-\x7E]+/g);
  return matches ? matches.join(" / ") : "";
}

function pushIssue(
  issues: ImeValidationIssue[],
  turnId: string,
  templateId: string,
  field: ImeValidationIssue["field"],
  problem: string,
  composed: string,
  offending: string,
): void {
  issues.push({ turnId, templateId, field, problem, composed, offending });
}

function checkJapanese(
  turnId: string,
  tmpl: TranslationTemplate,
  issues: ImeValidationIssue[],
): void {
  // text is optional now — compose derives it from display_furigana[].kana
  // when missing. When present, it must be pure ASCII and space-free.
  if (tmpl.text !== undefined) {
    if (NON_ASCII.test(tmpl.text)) {
      pushIssue(
        issues,
        turnId,
        tmpl.id,
        "text",
        "ja text must be pure ASCII (no kanji, kana, or other non-ASCII)",
        tmpl.text,
        nonAsciiOffenders(tmpl.text),
      );
    } else if (WHITESPACE.test(tmpl.text)) {
      pushIssue(
        issues,
        turnId,
        tmpl.id,
        "text",
        "ja text must be space-free — spaces belong on display_romaji",
        tmpl.text,
        "(whitespace)",
      );
    }
  }
  // display: anything goes (kanji+kana prompt). No validation.
  if (tmpl.display_romaji !== undefined && NON_ASCII.test(tmpl.display_romaji)) {
    pushIssue(
      issues,
      turnId,
      tmpl.id,
      "display_romaji",
      "ja display_romaji must be pure ASCII (spaces allowed)",
      tmpl.display_romaji,
      nonAsciiOffenders(tmpl.display_romaji),
    );
  }
  // Every player template should put native Japanese on screen via at
  // least one of display / display_furigana — otherwise the chat
  // bubble renders raw romaji like `convolutionalneuralnetworkdesu`,
  // which is useless. display_furigana satisfies the rule (compose
  // derives display from it when display is absent).
  const hasFurigana =
    tmpl.display_furigana !== undefined && tmpl.display_furigana.length > 0;
  const displayHasNative =
    tmpl.display !== undefined && CONTAINS_JA_NATIVE.test(tmpl.display);
  if (!hasFurigana && !displayHasNative) {
    pushIssue(
      issues,
      turnId,
      tmpl.id,
      "display",
      "ja player template must show native script (kanji/kana) — either populate display with Japanese or provide display_furigana segments",
      tmpl.display ?? "(no display)",
      tmpl.display ?? "",
    );
  }

  if (tmpl.display_furigana !== undefined) {
    const derivedSegments: string[] = [];
    for (let i = 0; i < tmpl.display_furigana.length; i++) {
      const seg = tmpl.display_furigana[i];

      let segRo: string | null = null;

      // Prefer kana when present — derives ro programmatically.
      if (seg.kana !== undefined) {
        if (CONTAINS_KANJI.test(seg.kana)) {
          pushIssue(
            issues,
            turnId,
            tmpl.id,
            "display_furigana",
            `ja display_furigana[${i}].kana still contains kanji — the reading was not resolved during migration`,
            `${seg.jp} → ${seg.kana}`,
            seg.kana,
          );
        }
        segRo = kanaToHepburn(seg.kana);
        if (NON_ASCII.test(segRo)) {
          pushIssue(
            issues,
            turnId,
            tmpl.id,
            "display_furigana",
            `ja display_furigana[${i}].kana could not be fully converted to Hepburn — kanaToHepburn returned non-ASCII`,
            `${seg.jp} → ${seg.kana} → ${segRo}`,
            nonAsciiOffenders(segRo),
          );
          segRo = null;
        }
        // If author also supplied ro, it must match the derived value.
        if (segRo !== null && seg.ro !== undefined && seg.ro !== segRo) {
          pushIssue(
            issues,
            turnId,
            tmpl.id,
            "display_furigana",
            `ja display_furigana[${i}].ro disagrees with kanaToHepburn(kana)`,
            `${seg.jp} kana=${seg.kana} stored ro="${seg.ro}" derived ro="${segRo}"`,
            "",
          );
        }
      } else if (seg.ro !== undefined) {
        if (NON_ASCII.test(seg.ro)) {
          pushIssue(
            issues,
            turnId,
            tmpl.id,
            "display_furigana",
            `ja display_furigana[${i}].ro must be pure ASCII (Hepburn romaji)`,
            `${seg.jp} → ${seg.ro}`,
            nonAsciiOffenders(seg.ro),
          );
        } else if (WHITESPACE.test(seg.ro)) {
          pushIssue(
            issues,
            turnId,
            tmpl.id,
            "display_furigana",
            `ja display_furigana[${i}].ro must not contain whitespace — split into separate segments instead`,
            `${seg.jp} → ${seg.ro}`,
            "(whitespace)",
          );
        }
        segRo = seg.ro;
      } else {
        pushIssue(
          issues,
          turnId,
          tmpl.id,
          "display_furigana",
          `ja display_furigana[${i}] must provide kana or ro`,
          `${seg.jp}`,
          "",
        );
      }

      derivedSegments.push(segRo ?? "");
    }

    // If stored text is present it must equal the concatenated derived ro.
    if (tmpl.text !== undefined) {
      const concat = derivedSegments.join("");
      if (concat !== tmpl.text) {
        pushIssue(
          issues,
          turnId,
          tmpl.id,
          "text",
          "ja text does not match concatenation of display_furigana derived ro — typing target diverges from the shown prompt",
          `text="${tmpl.text}" concat="${concat}"`,
          "",
        );
      }
    }
  } else if (tmpl.text === undefined) {
    pushIssue(
      issues,
      turnId,
      tmpl.id,
      "text",
      "ja template must provide text or display_furigana so compose can derive a typing target",
      "(neither text nor display_furigana)",
      "",
    );
  }
}

function checkKorean(
  turnId: string,
  tmpl: TranslationTemplate,
  issues: ImeValidationIssue[],
): void {
  // ko now allows two shapes:
  //   (a) Legacy: display === text, both pure-ASCII RR.
  //   (b) New: display is hangul; text is omitted (compose derives via
  //       hangulToRomaja). If text is supplied alongside hangul display,
  //       it must equal hangulToRomaja(display).
  const hasHangulDisplay =
    tmpl.display !== undefined && HANGUL_PRESENT.test(tmpl.display);

  if (hasHangulDisplay) {
    if (tmpl.text !== undefined) {
      if (NON_ASCII.test(tmpl.text)) {
        pushIssue(
          issues,
          turnId,
          tmpl.id,
          "text",
          "ko text must be pure ASCII (Revised Romanization)",
          tmpl.text,
          nonAsciiOffenders(tmpl.text),
        );
      } else {
        const derived = hangulToRomaja(tmpl.display!);
        if (derived !== tmpl.text) {
          pushIssue(
            issues,
            turnId,
            tmpl.id,
            "text",
            "ko text disagrees with hangulToRomaja(display)",
            `display="${tmpl.display}" stored text="${tmpl.text}" derived="${derived}"`,
            "",
          );
        }
      }
    }
    return;
  }

  // Legacy / ASCII-only shape.
  if (tmpl.text === undefined) {
    pushIssue(
      issues,
      turnId,
      tmpl.id,
      "text",
      "ko template requires text (Revised Romanization) or a hangul display",
      "(missing)",
      "",
    );
    return;
  }
  if (NON_ASCII.test(tmpl.text)) {
    pushIssue(
      issues,
      turnId,
      tmpl.id,
      "text",
      "ko text must be pure ASCII (Revised Romanization)",
      tmpl.text,
      nonAsciiOffenders(tmpl.text),
    );
  }
  if (tmpl.display !== undefined) {
    if (NON_ASCII.test(tmpl.display)) {
      pushIssue(
        issues,
        turnId,
        tmpl.id,
        "display",
        "ko display must be pure ASCII when no hangul is supplied",
        tmpl.display,
        nonAsciiOffenders(tmpl.display),
      );
    } else if (tmpl.display !== tmpl.text) {
      pushIssue(
        issues,
        turnId,
        tmpl.id,
        "display",
        "ko display must equal text (legacy ASCII shape) or be hangul",
        `text="${tmpl.text}" display="${tmpl.display}"`,
        "",
      );
    }
  }
}

export function validateTranslationIme(
  translation: Translation,
): ImeValidationIssue[] {
  const language = translation.language as Language;
  if (!ROMAJI_LANGUAGES.has(language)) return [];

  const issues: ImeValidationIssue[] = [];

  for (const [turnId, slot] of Object.entries(translation.turns)) {
    if (!slot.templates) continue;
    for (const tmpl of slot.templates) {
      if (language === "ja") checkJapanese(turnId, tmpl, issues);
      else if (language === "ko") checkKorean(turnId, tmpl, issues);
    }
  }

  return issues;
}
