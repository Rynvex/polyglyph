#!/usr/bin/env tsx
/**
 * import-frequency-list — read a CSV of (rank, word) from
 * data/sources/<list>.csv and produce concept stubs ready for the
 * categorize-concepts pipeline.
 *
 * Each stub carries:
 *   - id: snake_case of the word
 *   - cefr: estimated band based on rank (see VOCAB_FREQUENCY_SOURCES.md)
 *   - frequency: { source, rank }
 *   - category: "TODO" placeholder; categorize-concepts fills it
 *   - kind: "TODO" placeholder
 *
 * Output: `data/concepts/<list>_stubs.json` for human review before
 * the row is merged into `public/concepts/concepts.json`.
 *
 * CLI:
 *   pnpm tsx scripts/import-frequency-list.ts <list-name> <csv-path>
 *
 * Example:
 *   pnpm tsx scripts/import-frequency-list.ts ngsl data/sources/ngsl_2_8k.csv
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve(process.cwd(), "data", "concepts");

function rankToCefr(rank: number): string {
  if (rank <= 500) return "A1";
  if (rank <= 1500) return "A2";
  if (rank <= 3500) return "B1";
  if (rank <= 6500) return "B2";
  return "C1";
}

function snakeCase(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function main(): Promise<void> {
  const [listName, csvPath] = process.argv.slice(2);
  if (!listName || !csvPath) {
    process.stderr.write(
      "Usage: import-frequency-list <list-name> <csv-path>\n",
    );
    process.exit(2);
  }

  const raw = await fs.readFile(path.resolve(csvPath), "utf-8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  const stubs: Array<{
    id: string;
    word: string;
    cefr: string;
    frequency: { source: string; rank: number };
    category: string;
    kind: string;
  }> = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Accept "rank,word" or "word,rank" — heuristic on first column type.
    const cells = line.split(",").map((c) => c.trim());
    if (cells.length < 2) continue;
    let rank: number, word: string;
    if (/^\d+$/.test(cells[0])) {
      rank = Number(cells[0]);
      word = cells[1];
    } else if (/^\d+$/.test(cells[1])) {
      word = cells[0];
      rank = Number(cells[1]);
    } else {
      continue;
    }
    const id = snakeCase(word);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    stubs.push({
      id,
      word,
      cefr: rankToCefr(rank),
      frequency: { source: listName, rank },
      category: "TODO",
      kind: "TODO",
    });
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${listName}_stubs.json`);
  await fs.writeFile(
    outFile,
    JSON.stringify({ source: listName, count: stubs.length, stubs }, null, 2) +
      "\n",
    "utf-8",
  );
  process.stdout.write(
    `Imported ${stubs.length} concept stubs from ${listName} → ${path.relative(process.cwd(), outFile)}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`import-frequency-list failed: ${String(err)}\n`);
  process.exit(1);
});
