/**
 * One-shot migration: split each public/scripts/en/<topic>/<file>.json
 * into a language-independent blueprint plus an English translation
 * under public/dialogues/{blueprints,translations}/.
 *
 * Idempotent — re-running overwrites previous output, so it's safe to
 * iterate.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { DialogueSchema } from "../lib/data/schema";

const ROOT = path.join(process.cwd(), "public");
const SOURCE_DIR = path.join(ROOT, "scripts", "en");
const BLUEPRINTS_DIR = path.join(ROOT, "dialogues", "blueprints");
const TRANSLATIONS_DIR = path.join(ROOT, "dialogues", "translations");

async function* walkJson(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkJson(full);
    else if (e.isFile() && e.name.endsWith(".json")) yield full;
  }
}

interface Counts {
  blueprints: number;
  translations: number;
}

async function migrate(): Promise<Counts> {
  await fs.mkdir(BLUEPRINTS_DIR, { recursive: true });
  await fs.mkdir(TRANSLATIONS_DIR, { recursive: true });

  let blueprints = 0;
  let translations = 0;

  for await (const file of walkJson(SOURCE_DIR)) {
    const raw = await fs.readFile(file, "utf-8");
    const dialogue = DialogueSchema.parse(JSON.parse(raw));
    const blueprintId = path.basename(file).replace(/\.json$/, "");

    const blueprint = {
      schema_version: 1 as const,
      id: blueprintId,
      level: dialogue.level,
      topic: dialogue.topic,
      estimated_minutes: dialogue.estimated_minutes,
      tags: dialogue.tags,
      turns: dialogue.turns.map((t) => {
        const hasTemplates = Boolean(t.templates && t.templates.length > 0);
        return {
          id: t.id,
          speaker: t.speaker,
          has_templates: hasTemplates,
          ...(hasTemplates && t.templates ? { template_count: t.templates.length } : {}),
        };
      }),
    };

    const translationTurns: Record<string, unknown> = {};
    for (const t of dialogue.turns) {
      if (t.templates && t.templates.length > 0) {
        translationTurns[t.id] = {
          templates: t.templates.map((tmpl) => ({
            id: tmpl.id,
            text: tmpl.text,
            ...(tmpl.display ? { display: tmpl.display } : {}),
            ...(tmpl.hint_zh ? { hint_zh: tmpl.hint_zh } : {}),
            ...(tmpl.weight !== 1 && tmpl.weight !== undefined
              ? { weight: tmpl.weight }
              : {}),
          })),
        };
      } else if (t.text) {
        translationTurns[t.id] = { text: t.text };
      }
    }

    const translation = {
      schema_version: 1 as const,
      blueprint_id: blueprintId,
      language: "en" as const,
      title: dialogue.title,
      ...(dialogue.description ? { description: dialogue.description } : {}),
      ...(dialogue.characters ? { characters: dialogue.characters } : {}),
      turns: translationTurns,
    };

    const blueprintPath = path.join(BLUEPRINTS_DIR, `${blueprintId}.json`);
    const translationDir = path.join(TRANSLATIONS_DIR, blueprintId);
    await fs.mkdir(translationDir, { recursive: true });
    const translationPath = path.join(translationDir, "en.json");

    await fs.writeFile(blueprintPath, JSON.stringify(blueprint, null, 2) + "\n");
    await fs.writeFile(translationPath, JSON.stringify(translation, null, 2) + "\n");

    blueprints++;
    translations++;
  }

  return { blueprints, translations };
}

migrate().then((out) => {
  console.log(`Migrated ${out.blueprints} blueprints, ${out.translations} translations.`);
});
