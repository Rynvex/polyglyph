#!/usr/bin/env tsx
/**
 * categorize-concepts — fill in `pos` and `category` for concept stubs
 * produced by import-frequency-list. Uses an LLM in production; this
 * script ships with a deterministic fallback keyed on common
 * lexical patterns so the pipeline still progresses when no API
 * credentials are present.
 *
 * Inputs:  data/concepts/<list>_stubs.json (with TODO category/kind)
 * Outputs: same file, with category/kind/pos populated and a
 *          `_categorize: { method, ts }` audit field per entry.
 *
 * Run after import-frequency-list and before assign-visuals.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

interface Stub {
  id: string;
  word: string;
  cefr: string;
  frequency: { source: string; rank: number };
  category: string;
  kind: string;
  pos?: string;
  _categorize?: { method: string; ts: string };
}

// Lightweight rule-based fallback. Augment with an LLM call in prod;
// see lib/llm/prompt.ts for the polyglyph prompt style.
const POS_HINTS: Array<{ pattern: RegExp; pos: string; kind: string }> = [
  { pattern: /(ly)$/, pos: "adverb", kind: "adjective" },
  { pattern: /(ness|ment|tion|sion|ity|ence|ance|ism)$/, pos: "noun-abstract", kind: "noun" },
  { pattern: /(er|or|ist|ian)$/, pos: "noun-concrete", kind: "noun" },
  { pattern: /(ize|ise|ate|ify|en)$/, pos: "verb-action", kind: "verb" },
  { pattern: /(ous|ive|able|ible|ful|less|al)$/, pos: "adjective", kind: "adjective" },
];

const FUNCTION_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "when", "while", "because",
  "of", "in", "on", "at", "by", "for", "with", "without", "from", "to",
  "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
]);

function heuristic(word: string): { pos: string; kind: string; category: string } {
  const w = word.toLowerCase();
  if (FUNCTION_WORDS.has(w)) {
    return { pos: "determiner", kind: "phrase", category: "function" };
  }
  for (const rule of POS_HINTS) {
    if (rule.pattern.test(w)) {
      return { pos: rule.pos, kind: rule.kind, category: "TODO-review" };
    }
  }
  // Default: assume noun-concrete; reviewer fixes during G6 audit.
  return { pos: "noun-concrete", kind: "noun", category: "TODO-review" };
}

async function main(): Promise<void> {
  const stubsPath = process.argv[2];
  if (!stubsPath) {
    process.stderr.write("Usage: categorize-concepts <stubs.json>\n");
    process.exit(2);
  }
  const full = path.resolve(stubsPath);
  const raw = await fs.readFile(full, "utf-8");
  const file = JSON.parse(raw) as { source: string; stubs: Stub[] };

  let updated = 0;
  for (const s of file.stubs) {
    if (s.pos && s.category !== "TODO") continue;
    const h = heuristic(s.word);
    s.pos = s.pos ?? h.pos;
    s.kind = s.kind === "TODO" ? h.kind : s.kind;
    s.category = s.category === "TODO" ? h.category : s.category;
    s._categorize = { method: "heuristic", ts: new Date().toISOString() };
    updated += 1;
  }

  await fs.writeFile(full, JSON.stringify(file, null, 2) + "\n", "utf-8");
  process.stdout.write(
    `Categorised ${updated} stubs in ${path.relative(process.cwd(), full)} (heuristic fallback; review TODO-review entries).\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`categorize-concepts failed: ${String(err)}\n`);
  process.exit(1);
});
