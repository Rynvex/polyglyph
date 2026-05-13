#!/usr/bin/env tsx
/**
 * Detailed per-issue dump for ja/ko translations. For every failing
 * template, prints the offending text + suggested fix surface so it's
 * easy to walk down the list.
 *
 * Usage:
 *   pnpm exec tsx scripts/survey-ime-detail.ts            # all files
 *   pnpm exec tsx scripts/survey-ime-detail.ts ja          # just ja
 *   pnpm exec tsx scripts/survey-ime-detail.ts <blueprint> # just one blueprint
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { TranslationSchema } from "../lib/data/dialogues/schema";
import { validateTranslationIme } from "../lib/data/dialogues/validate-ime";

const ROOT = path.resolve(process.cwd(), "public", "dialogues", "translations");
const filter = process.argv[2];

const dirs = readdirSync(ROOT);
let total = 0;

for (const blueprint of dirs) {
  if (filter && filter !== "ja" && filter !== "ko" && blueprint !== filter) continue;
  const blueprintDir = path.join(ROOT, blueprint);
  for (const lang of ["ja", "ko"]) {
    if (filter === "ja" && lang !== "ja") continue;
    if (filter === "ko" && lang !== "ko") continue;
    const file = path.join(blueprintDir, `${lang}.json`);
    let translation;
    try {
      translation = TranslationSchema.parse(JSON.parse(readFileSync(file, "utf-8")));
    } catch {
      continue;
    }
    const issues = validateTranslationIme(translation);
    if (issues.length === 0) continue;

    console.log(`\n=== ${lang}/${blueprint} (${issues.length} issues) ===`);
    for (const issue of issues) {
      const turn = translation.turns[issue.turnId];
      const tmpl = turn.templates?.find((t) => t.id === issue.templateId);
      console.log(
        `  ${issue.turnId}/${issue.templateId}  offending: "${issue.offending}"`,
      );
      console.log(`    text:    "${tmpl?.text}"`);
      console.log(`    display: "${tmpl?.display ?? "(no display)"}"`);
      total++;
    }
  }
}

console.log(`\nTotal issues: ${total}`);
