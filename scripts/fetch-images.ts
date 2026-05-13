#!/usr/bin/env tsx
/**
 * fetch-images — pull L3 photos for concepts whose
 * visual.kind === "photo". Caches by Unsplash photo id in
 * public/concepts/photos/ so repeat runs are free.
 *
 * Requires UNSPLASH_ACCESS_KEY. Without it the script logs the
 * concepts that need photos and exits — placeholder text-only cards
 * render in the meantime.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
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
const PHOTOS_DIR = path.resolve(
  process.cwd(),
  "public",
  "concepts",
  "photos",
);

interface UnsplashHit {
  id: string;
  urls: { regular: string };
  user: { name: string; links: { html: string } };
}

async function searchUnsplash(
  query: string,
  key: string,
): Promise<UnsplashHit | null> {
  const url = `https://api.unsplash.com/search/photos?per_page=1&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { results: UnsplashHit[] };
  return json.results[0] ?? null;
}

async function downloadPhoto(url: string, outFile: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);
}

async function main(): Promise<void> {
  const raw = await fs.readFile(CONCEPTS_FILE, "utf-8");
  const parsed = ConceptsFileSchema.parse(JSON.parse(raw));
  const needPhotos: Concept[] = parsed.concepts.filter(
    (c) => c.visual?.kind === "photo",
  );

  if (needPhotos.length === 0) {
    process.stdout.write("No concepts marked visual.kind === 'photo'.\n");
    return;
  }

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    process.stderr.write(
      `UNSPLASH_ACCESS_KEY not set — ${needPhotos.length} concept(s) await photos:\n`,
    );
    for (const c of needPhotos) process.stderr.write(`  - ${c.id}\n`);
    process.exit(1);
  }

  await fs.mkdir(PHOTOS_DIR, { recursive: true });
  for (const c of needPhotos) {
    if (c.visual?.asset) {
      const cached = path.join(PHOTOS_DIR, `${c.visual.asset}.jpg`);
      try {
        await fs.stat(cached);
        continue; // already downloaded
      } catch {
        // not cached; fetch
      }
    }
    const hit = await searchUnsplash(c.id.replace(/_/g, " "), key);
    if (!hit) {
      process.stderr.write(`  miss: ${c.id}\n`);
      continue;
    }
    const out = path.join(PHOTOS_DIR, `${hit.id}.jpg`);
    await downloadPhoto(hit.urls.regular, out);
    process.stdout.write(
      `  ${c.id} ← ${hit.id} (by ${hit.user.name})\n`,
    );
  }
}

main().catch((err) => {
  process.stderr.write(`fetch-images failed: ${String(err)}\n`);
  process.exit(1);
});
