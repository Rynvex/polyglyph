/**
 * Server-side loaders for the blueprint/translation layer.
 *
 *   public/dialogues/blueprints/<id>.json
 *   public/dialogues/translations/<id>/<lang>.json
 *
 * Used at SSR/SSG time. Browser code receives the composed Dialogue as
 * props and never reads the filesystem directly.
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
    throw err;
  }
}

export async function loadBlueprint(blueprintId: string): Promise<Blueprint | null> {
  if (!ID_PATTERN.test(blueprintId)) return null;
  const payload = await readJsonOrNull(resolveBlueprintPath(blueprintId));
  if (!payload) return null;
  return BlueprintSchema.parse(payload);
}

export async function loadTranslation(
  blueprintId: string,
  language: string,
): Promise<Translation | null> {
  if (!ID_PATTERN.test(blueprintId)) return null;
  if (!/^[a-z][a-z0-9-]*$/.test(language)) return null;
  const payload = await readJsonOrNull(resolveTranslationPath(blueprintId, language));
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
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  return entries
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export async function listTranslationLanguages(blueprintId: string): Promise<string[]> {
  if (!ID_PATTERN.test(blueprintId)) return [];
  const dir = path.join(process.cwd(), ...TRANSLATIONS_DIR, blueprintId);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  return entries
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}
