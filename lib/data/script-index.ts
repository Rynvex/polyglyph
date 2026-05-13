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
 *
 * Cloudflare Workers note: see the comment in dialogues/loader.ts.
 * Falls back to the static `data-bundle` module when `fs` is unavailable
 * at runtime so the landing page can still hydrate.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  BlueprintSchema,
  TranslationSchema,
} from "@/lib/data/dialogues/schema";
import type { ScriptIndexItem } from "@/lib/data/script-grouping";
import {
  BUNDLED_BLUEPRINTS,
  BUNDLED_BLUEPRINT_IDS,
  BUNDLED_TRANSLATIONS,
} from "@/lib/data/data-bundle";

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
  } catch {
    return null;
  }
}

interface DiscoveredBlueprint {
  id: string;
  blueprintPayload: unknown;
}

async function discoverBlueprints(
  dialoguesRoot: string,
): Promise<DiscoveredBlueprint[]> {
  const dir = path.join(dialoguesRoot, "blueprints");
  try {
    const entries = await fs.readdir(dir);
    const found: DiscoveredBlueprint[] = [];
    for (const f of entries) {
      if (!f.endsWith(".json")) continue;
      const id = f.replace(/\.json$/, "");
      const payload = await readJsonOrNull(path.join(dir, f));
      if (payload !== null) found.push({ id, blueprintPayload: payload });
    }
    return found;
  } catch {
    // No fs (Worker runtime). Use the bundled blueprint catalog.
    return BUNDLED_BLUEPRINT_IDS.map((id) => ({
      id,
      blueprintPayload: BUNDLED_BLUEPRINTS[id],
    })).filter((b) => b.blueprintPayload !== undefined);
  }
}

async function loadTranslationPayload(
  dialoguesRoot: string,
  id: string,
  language: string,
): Promise<unknown | null> {
  const filePayload = await readJsonOrNull(
    path.join(dialoguesRoot, "translations", id, `${language}.json`),
  );
  if (filePayload !== null) return filePayload;
  return BUNDLED_TRANSLATIONS[id]?.[language] ?? null;
}

export async function readScriptIndex(
  dialoguesRoot: string,
  language: string,
): Promise<ScriptIndexItem[]> {
  const items: ScriptIndexItem[] = [];
  for (const found of await discoverBlueprints(dialoguesRoot)) {
    const blueprint = BlueprintSchema.parse(found.blueprintPayload);
    const translationPayload = await loadTranslationPayload(
      dialoguesRoot,
      blueprint.id,
      language,
    );
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
