#!/usr/bin/env tsx
/**
 * One-shot: remove all whitespace from ja player template text/display.
 * Pure-romaji input + space-free bubble = the player types and sees a
 * single continuous romaji string, matching the natural lack of spaces
 * in written Japanese. Bot turns are untouched (they're already in
 * kanji+kana).
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

async function main(): Promise<void> {
  let stripped = 0;
  let touchedFiles = 0;

  const blueprints = await fs.readdir(ROOT);
  for (const bp of blueprints) {
    const file = path.join(ROOT, bp, "ja.json");
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
        const newText = tmpl.text.replace(/\s+/g, "");
        if (newText !== tmpl.text) {
          tmpl.text = newText;
          dirty = true;
          stripped++;
        }
        if (tmpl.display !== undefined) {
          const newDisplay = tmpl.display.replace(/\s+/g, "");
          if (newDisplay !== tmpl.display) {
            tmpl.display = newDisplay;
            dirty = true;
          }
          // Keep display in sync with text in case stripping caused drift.
          if (tmpl.display !== tmpl.text) {
            tmpl.display = tmpl.text;
            dirty = true;
          }
        }
      }
    }
    if (dirty) {
      await fs.writeFile(file, JSON.stringify(t, null, 2) + "\n");
      touchedFiles++;
    }
  }

  console.log(
    `Stripped whitespace from ${stripped} ja player templates across ${touchedFiles} files.`,
  );
}

main();
