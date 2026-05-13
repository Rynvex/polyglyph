#!/usr/bin/env tsx
/**
 * One-off survey: run validateTranslationIme on every ja/ko translation
 * file and tally how many fail. Prints summary + per-file issue counts.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { TranslationSchema } from "../lib/data/dialogues/schema";
import { validateTranslationIme } from "../lib/data/dialogues/validate-ime";

const ROOT = path.resolve(process.cwd(), "public", "dialogues", "translations");

const dirs = readdirSync(ROOT);
const summary: Array<{ blueprint: string; lang: string; issues: number }> = [];

for (const blueprint of dirs) {
  const blueprintDir = path.join(ROOT, blueprint);
  for (const lang of ["ja", "ko"]) {
    const file = path.join(blueprintDir, `${lang}.json`);
    let translation;
    try {
      translation = TranslationSchema.parse(JSON.parse(readFileSync(file, "utf-8")));
    } catch {
      continue;
    }
    const issues = validateTranslationIme(translation);
    if (issues.length > 0) {
      summary.push({ blueprint, lang, issues: issues.length });
    }
  }
}

const ja = summary.filter((s) => s.lang === "ja");
const ko = summary.filter((s) => s.lang === "ko");
console.log(`ja files failing: ${ja.length}/39`);
console.log(`ko files failing: ${ko.length}/39`);
console.log(`Total issues: ${summary.reduce((sum, s) => sum + s.issues, 0)}`);
console.log("");
console.log("Per file:");
for (const s of summary) {
  console.log(`  ${s.lang}/${s.blueprint}: ${s.issues} issues`);
}
