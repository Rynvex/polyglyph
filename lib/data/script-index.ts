/**
 * Script index — server-side reader that powers the landing page.
 *
 * Reads the blueprint/translation layer at `<dialoguesRoot>/blueprints/*.json`
 * and `<dialoguesRoot>/translations/<id>/<lang>.json`. For each blueprint
 * that has a translation in the requested language, projects out the
 * metadata the landing card needs.
 *
 * Pure grouping/sorting helpers (importable from client components) live
 * in lib/data/script-grouping.ts.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  BlueprintSchema,
  TranslationSchema,
} from "@/lib/data/dialogues/schema";
import type { ScriptIndexItem } from "@/lib/data/script-grouping";

export type { ScriptIndexItem } from "@/lib/data/script-grouping";
export {
  groupByLevel,
  groupByTopic,
  sortByLevel,
} from "@/lib/data/script-grouping";

async function readJsonOrNull(file: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function listBlueprintFiles(dialoguesRoot: string): Promise<string[]> {
  const dir = path.join(dialoguesRoot, "blueprints");
  try {
    return (await fs.readdir(dir))
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

export async function readScriptIndex(
  dialoguesRoot: string,
  language: string,
): Promise<ScriptIndexItem[]> {
  const items: ScriptIndexItem[] = [];
  for (const file of await listBlueprintFiles(dialoguesRoot)) {
    const raw = await fs.readFile(file, "utf-8");
    const blueprint = BlueprintSchema.parse(JSON.parse(raw));
    const translationPath = path.join(
      dialoguesRoot,
      "translations",
      blueprint.id,
      `${language}.json`,
    );
    const translationPayload = await readJsonOrNull(translationPath);
    if (!translationPayload) continue;
    const translation = TranslationSchema.parse(translationPayload);
    items.push({
      scriptId: blueprint.id,
      id: `${translation.language}.${blueprint.id}.${blueprint.level.toLowerCase()}`,
      title: translation.title,
      level: blueprint.level,
      topic: blueprint.topic,
      language: translation.language,
      description: translation.description,
      estimatedMinutes: blueprint.estimated_minutes,
      tags: blueprint.tags,
    });
  }
  return items;
}

/**
 * Map of language → ScriptIndexItem[] for all supported languages. Used
 * by the landing page so the client can switch active language without
 * a server round-trip.
 */
export async function readAllLanguageIndexes(
  dialoguesRoot: string,
  languages: readonly string[],
): Promise<Record<string, ScriptIndexItem[]>> {
  const entries = await Promise.all(
    languages.map(async (lang) => {
      const items = await readScriptIndex(dialoguesRoot, lang);
      return [lang, items] as const;
    }),
  );
  return Object.fromEntries(entries);
}
