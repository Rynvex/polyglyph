/**
 * Server-side loaders for vocab data files. Used by route segments at
 * SSR/SSG time. Browser code that needs the data should pass it down as
 * props from the page.
 *
 * Cloudflare Workers note: see the comment in dialogues/loader.ts.
 * Loaders fall back to the static `data-bundle` module when `fs.readFile`
 * is unavailable at runtime.
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
import {
  BUNDLED_CONCEPTS_BASE,
  BUNDLED_CONCEPT_TRANSLATIONS,
  BUNDLED_DECKS,
  BUNDLED_DECK_IDS,
} from "@/lib/data/data-bundle";

const CONCEPTS_DIR = ["public", "concepts"];
const TRANSLATIONS_DIR = ["public", "concepts", "translations"];
const DECKS_DIR = ["public", "decks"];

async function readJsonOrNull(...segments: string[]): Promise<unknown | null> {
  try {
    const full = path.join(process.cwd(), ...segments);
    const raw = await fs.readFile(full, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadConcepts(): Promise<Concept[]> {
  const payload =
    (await readJsonOrNull(...CONCEPTS_DIR, "concepts.json")) ??
    BUNDLED_CONCEPTS_BASE;
  const parsed = ConceptsFileSchema.parse(payload);
  return parsed.concepts.map((c) => ConceptSchema.parse(c));
}

export async function loadTranslations(language: string): Promise<Translation[]> {
  const payload =
    (await readJsonOrNull(...TRANSLATIONS_DIR, `${language}.json`)) ??
    BUNDLED_CONCEPT_TRANSLATIONS[language] ??
    null;
  if (!payload) return [];
  const parsed = TranslationsFileSchema.parse(payload);
  return parsed.translations;
}

export async function listSupportedLanguages(): Promise<string[]> {
  const dir = path.join(process.cwd(), ...TRANSLATIONS_DIR);
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
  } catch {
    return Object.keys(BUNDLED_CONCEPT_TRANSLATIONS).sort();
  }
}

export async function loadDeck(deckId: string): Promise<Deck | null> {
  if (!/^[a-z0-9_]+$/i.test(deckId)) return null;
  const payload =
    (await readJsonOrNull(...DECKS_DIR, `${deckId}.json`)) ??
    BUNDLED_DECKS[deckId] ??
    null;
  if (!payload) return null;
  const parsed = DeckSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export async function listDecks(): Promise<Deck[]> {
  const dir = path.join(process.cwd(), ...DECKS_DIR);
  let fileIds: string[] | null = null;
  try {
    const entries = await fs.readdir(dir);
    fileIds = entries
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    fileIds = null;
  }

  const ids = fileIds ?? [...BUNDLED_DECK_IDS];
  const decks: Deck[] = [];
  for (const id of ids) {
    const deck = await loadDeck(id);
    if (deck) decks.push(deck);
  }
  return decks;
}
