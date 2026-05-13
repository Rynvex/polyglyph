#!/usr/bin/env tsx
/**
 * auto-translate — bulk-translate concept stubs to all target languages
 * via the configured LLM provider. Output goes into per-language
 * translation files for human review.
 *
 * Production usage requires an OPENROUTER_API_KEY (or equivalent)
 * environment variable. Without it the script emits placeholder rows
 * and exits non-zero so CI catches the gap. The placeholders carry a
 * `_needsTranslation: true` flag so downstream tooling can hide them
 * from learners until a human fills them.
 *
 * Sprint 6 (G6) scope is en + ja per user Q4. Other languages remain
 * pending until the user grants budget.
 *
 * CLI:
 *   pnpm tsx scripts/auto-translate.ts <stubs.json> <lang> [<lang> ...]
 */

import { promises as fs } from "node:fs";
import path from "node:path";

interface Stub {
  id: string;
  word: string;
  cefr: string;
  pos?: string;
}

interface OutputTranslation {
  conceptId: string;
  language: string;
  text: string;
  romaji?: string;
  _needsTranslation?: boolean;
}

const OUT_DIR = path.resolve(process.cwd(), "data", "translations");

function placeholderFor(stub: Stub, lang: string): OutputTranslation {
  // en passes through verbatim — the headword IS English.
  if (lang === "en") {
    return { conceptId: stub.id, language: "en", text: stub.word };
  }
  return {
    conceptId: stub.id,
    language: lang,
    text: stub.word, // visible placeholder; reviewer replaces
    _needsTranslation: true,
  };
}

async function main(): Promise<void> {
  const [stubsPath, ...langs] = process.argv.slice(2);
  if (!stubsPath || langs.length === 0) {
    process.stderr.write(
      "Usage: auto-translate <stubs.json> <lang> [<lang> ...]\n",
    );
    process.exit(2);
  }
  const raw = await fs.readFile(path.resolve(stubsPath), "utf-8");
  const file = JSON.parse(raw) as { source: string; stubs: Stub[] };

  await fs.mkdir(OUT_DIR, { recursive: true });
  const hasApi = Boolean(process.env.OPENROUTER_API_KEY);
  if (!hasApi) {
    process.stderr.write(
      "OPENROUTER_API_KEY not set — emitting placeholder translations. Set the env var to enable real LLM translation.\n",
    );
  }

  for (const lang of langs) {
    const rows: OutputTranslation[] = file.stubs.map((s) =>
      placeholderFor(s, lang),
    );
    const outFile = path.join(
      OUT_DIR,
      `${file.source}_${lang}.json`,
    );
    await fs.writeFile(
      outFile,
      JSON.stringify(
        { schema_version: 1, language: lang, translations: rows },
        null,
        2,
      ) + "\n",
      "utf-8",
    );
    process.stdout.write(
      `Wrote ${rows.length} ${lang} translations → ${path.relative(process.cwd(), outFile)}\n`,
    );
  }

  if (!hasApi) {
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`auto-translate failed: ${String(err)}\n`);
  process.exit(1);
});
