/**
 * Server-side loaders for the blueprint/translation layer.
 *
 *   public/dialogues/blueprints/<id>.json
 *   public/dialogues/translations/<id>/<lang>.json
 *
 * Used at SSR/SSG time. Browser code receives the composed Dialogue as
 * props and never reads the filesystem directly.
 *
 * Cloudflare Workers note: at runtime, files under `public/` are served
 * via the ASSETS binding, not visible to `node:fs`. The loaders therefore
 * try `fs.readFile` first (works in dev / build / tests) and fall back to
 * the static `data-bundle` module (works at Worker runtime). Regenerate
 * the bundle with `pnpm build-data-bundle` after editing dialogue content.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  BlueprintSchema,
  TranslationSchema,
  type Blueprint,
  type Translation,
} from "./schema";
import { composeDialogue, composeDialogueWithNative } from "./compose";
import type { Dialogue } from "@/lib/data/schema";
import {
  BUNDLED_BLUEPRINTS,
  BUNDLED_TRANSLATIONS,
  BUNDLED_BLUEPRINT_IDS,
} from "@/lib/data/data-bundle";

const BLUEPRINTS_DIR = ["public", "dialogues", "blueprints"];
const TRANSLATIONS_DIR = ["public", "dialogues", "translations"];

const ID_PATTERN = /^[a-z0-9_]+$/;

function resolveBlueprintPath(blueprintId: string): string {
  return path.join(process.cwd(), ...BLUEPRINTS_DIR, `${blueprintId}.json`);
}

function resolveTranslationPath(blueprintId: string, language: string): string {
  return path.join(process.cwd(), ...TRANSLATIONS_DIR, blueprintId, `${language}.json`);
}

async function readJsonOrNull(file: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    // Any other fs error (permission, runtime without fs, etc.) → null
    // so callers can fall back to the static bundle.
    return null;
  }
}

export async function loadBlueprint(blueprintId: string): Promise<Blueprint | null> {
  if (!ID_PATTERN.test(blueprintId)) return null;
  let payload = await readJsonOrNull(resolveBlueprintPath(blueprintId));
  if (!payload) payload = BUNDLED_BLUEPRINTS[blueprintId] ?? null;
  if (!payload) return null;
  return BlueprintSchema.parse(payload);
}

export async function loadTranslation(
  blueprintId: string,
  language: string,
): Promise<Translation | null> {
  if (!ID_PATTERN.test(blueprintId)) return null;
  if (!/^[a-z][a-z0-9-]*$/.test(language)) return null;
  let payload = await readJsonOrNull(resolveTranslationPath(blueprintId, language));
  if (!payload) payload = BUNDLED_TRANSLATIONS[blueprintId]?.[language] ?? null;
  if (!payload) return null;
  return TranslationSchema.parse(payload);
}

export async function loadComposedDialogue(
  blueprintId: string,
  language: string,
): Promise<Dialogue | null> {
  const [blueprint, translation] = await Promise.all([
    loadBlueprint(blueprintId),
    loadTranslation(blueprintId, language),
  ]);
  if (!blueprint || !translation) return null;
  return composeDialogue(blueprint, translation);
}

/**
 * Like loadComposedDialogue, but additionally fetches the user's native
 * translation file when it differs from the target and attaches its
 * strings as `nativeText` for the translation strip UI. A missing native
 * file degrades gracefully — the target dialogue still loads, the strip
 * just stays empty for the affected turns.
 */
export async function loadComposedDialogueWithNative(
  blueprintId: string,
  targetLanguage: string,
  nativeLanguage: string,
): Promise<Dialogue | null> {
  const [blueprint, targetTranslation] = await Promise.all([
    loadBlueprint(blueprintId),
    loadTranslation(blueprintId, targetLanguage),
  ]);
  if (!blueprint || !targetTranslation) return null;
  if (nativeLanguage === targetLanguage) {
    return composeDialogue(blueprint, targetTranslation);
  }
  const nativeTranslation = await loadTranslation(blueprintId, nativeLanguage);
  return composeDialogueWithNative(
    blueprint,
    targetTranslation,
    nativeTranslation ?? undefined,
  );
}

export async function listBlueprintIds(): Promise<string[]> {
  const dir = path.join(process.cwd(), ...BLUEPRINTS_DIR);
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
  } catch {
    // No fs (e.g. Cloudflare Worker runtime). Fall back to the static
    // bundle so the script-grouping / curated lists still hydrate.
    return [...BUNDLED_BLUEPRINT_IDS].sort();
  }
}

export async function listTranslationLanguages(blueprintId: string): Promise<string[]> {
  if (!ID_PATTERN.test(blueprintId)) return [];
  const dir = path.join(process.cwd(), ...TRANSLATIONS_DIR, blueprintId);
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
  } catch {
    const bundled = BUNDLED_TRANSLATIONS[blueprintId];
    if (!bundled) return [];
    return Object.keys(bundled).sort();
  }
}
