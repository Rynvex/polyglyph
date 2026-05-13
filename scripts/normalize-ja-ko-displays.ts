#!/usr/bin/env tsx
/**
 * One-shot: for every ja/ko translation, set each player template's
 * `display` equal to its `text`. The pure-romaji design means there's
 * no separate native-script bubble anymore — the user sees what they
 * type. Bot turns are untouched (those still show kanji/hangul).
 *
 * Idempotent — safe to re-run.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "public", "dialogues", "translations");

interface Template {
  id: string;
  text: string;
  display?: string;
  hint_zh?: string;
  weight?: number;
  next?: string;
}

interface Turn {
  text?: string;
  templates?: Template[];
}

interface Translation {
  schema_version: number;
  blueprint_id: string;
  language: string;
  title: string;
  description?: string;
  characters?: unknown;
  turns: Record<string, Turn>;
}

const TARGET_LANGS = new Set(["ja", "ko"]);

async function main(): Promise<void> {
  let normalized = 0;
  let touchedFiles = 0;

  const blueprints = await fs.readdir(ROOT);
  for (const bp of blueprints) {
    for (const lang of ["ja", "ko"]) {
      if (!TARGET_LANGS.has(lang)) continue;
      const file = path.join(ROOT, bp, `${lang}.json`);
      let raw: string;
      try {
        raw = await fs.readFile(file, "utf-8");
      } catch {
        continue;
      }
      const t: Translation = JSON.parse(raw);
      let dirty = false;
      for (const turn of Object.values(t.turns)) {
        if (!turn.templates) continue;
        for (const tmpl of turn.templates) {
          if (tmpl.display !== tmpl.text) {
            tmpl.display = tmpl.text;
            dirty = true;
            normalized++;
          }
        }
      }
      if (dirty) {
        await fs.writeFile(file, JSON.stringify(t, null, 2) + "\n");
        touchedFiles++;
      }
    }
  }

  console.log(
    `Normalized ${normalized} player template displays across ${touchedFiles} files.`,
  );
}

main();
