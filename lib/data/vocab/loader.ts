/**
 * Server-side loaders for vocab data files. Used by route segments at
 * SSR/SSG time. Browser code that needs the data should pass it down as
 * props from the page.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  ConceptSchema,
  ConceptsFileSchema,
  DeckSchema,
  TranslationsFileSchema,
  type Concept,
  type Deck,
  type Translation,
} from "./schema";

const CONCEPTS_DIR = ["public", "concepts"];
const TRANSLATIONS_DIR = ["public", "concepts", "translations"];
const DECKS_DIR = ["public", "decks"];

async function readJson(...segments: string[]): Promise<unknown> {
  const full = path.join(process.cwd(), ...segments);
  const raw = await fs.readFile(full, "utf-8");
  return JSON.parse(raw);
}

export async function loadConcepts(): Promise<Concept[]> {
  const parsed = ConceptsFileSchema.parse(await readJson(...CONCEPTS_DIR, "concepts.json"));
  return parsed.concepts.map((c) => ConceptSchema.parse(c));
}

export async function loadTranslations(language: string): Promise<Translation[]> {
  const parsed = TranslationsFileSchema.parse(
    await readJson(...TRANSLATIONS_DIR, `${language}.json`),
  );
  return parsed.translations;
}

export async function listSupportedLanguages(): Promise<string[]> {
  const dir = path.join(process.cwd(), ...TRANSLATIONS_DIR);
  const entries = await fs.readdir(dir);
  return entries
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export async function loadDeck(deckId: string): Promise<Deck | null> {
  if (!/^[a-z0-9_]+$/i.test(deckId)) return null;
  try {
    return DeckSchema.parse(await readJson(...DECKS_DIR, `${deckId}.json`));
  } catch {
    return null;
  }
}

export async function listDecks(): Promise<Deck[]> {
  const dir = path.join(process.cwd(), ...DECKS_DIR);
  const entries = await fs.readdir(dir);
  const decks: Deck[] = [];
  for (const file of entries) {
    if (!file.endsWith(".json")) continue;
    const parsed = DeckSchema.safeParse(await readJson(...DECKS_DIR, file));
    if (parsed.success) decks.push(parsed.data);
  }
  return decks;
}
