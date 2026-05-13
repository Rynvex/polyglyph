#!/usr/bin/env tsx
/**
 * assign-visuals — populate `Concept.visual` for every concept that
 * lacks one, using the deterministic rules in
 * `lib/visual/concept-visual-rules.ts`. Idempotent — concepts that
 * already have `visual` are left untouched.
 *
 * Writes back to `public/concepts/concepts.json` and prints a summary
 * of what changed.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { classifyVisual } from "../lib/visual/concept-visual-rules";
import {
  ConceptsFileSchema,
  type Concept,
} from "../lib/data/vocab/schema";

const CONCEPTS_FILE = path.resolve(
  process.cwd(),
  "public",
  "concepts",
  "concepts.json",
);

async function main(): Promise<void> {
  const raw = await fs.readFile(CONCEPTS_FILE, "utf-8");
  const parsed = ConceptsFileSchema.parse(JSON.parse(raw));

  let assigned = 0;
  let skipped = 0;
  const byKind = new Map<string, number>();

  const updated: Concept[] = parsed.concepts.map((c) => {
    if (c.visual) {
      skipped += 1;
      return c;
    }
    const visual = classifyVisual(c);
    assigned += 1;
    byKind.set(visual.kind, (byKind.get(visual.kind) ?? 0) + 1);
    return { ...c, visual };
  });

  // Preserve original formatting style (compact-ish JSON).
  await fs.writeFile(
    CONCEPTS_FILE,
    JSON.stringify({ ...parsed, concepts: updated }, null, 2) + "\n",
    "utf-8",
  );

  process.stdout.write(
    `Assigned ${assigned} visuals (skipped ${skipped} pre-existing).\n` +
      Array.from(byKind.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `  ${k}: ${n}`)
        .join("\n") +
      "\n",
  );
}

main().catch((err) => {
  process.stderr.write(`assign-visuals failed: ${String(err)}\n`);
  process.exit(1);
});
