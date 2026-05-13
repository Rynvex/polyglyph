/**
 * Source material persistence.
 *
 * Sources are the raw text the user pastes (article, transcript, notes)
 * before turning them into dialogues via LLM. Stored separately from
 * generated dialogues so the same source can be re-used to create
 * variations.
 *
 * Layout:
 *   polyglyph:source:<id>          — entry JSON
 *   polyglyph:sources:index        — array of ids in insertion order
 */

const ENTRY_PREFIX = "polyglyph:source:";
const INDEX_KEY = "polyglyph:sources:index";

export type SourceKind = "paste" | "url" | "file";

export interface SourceEntry {
  id: string;
  title: string;
  content: string;
  kind: SourceKind;
  /** Optional URL or filename when kind is "url" / "file". */
  origin?: string;
  createdAtMs: number;
}

export interface NewSource {
  title: string;
  content: string;
  kind: SourceKind;
  origin?: string;
}

interface AdapterOpts {
  storage: Storage | null;
}

function defaultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getStorage(opts?: Partial<AdapterOpts>): Storage | null {
  if (opts && "storage" in opts) return opts.storage ?? null;
  return defaultStorage();
}

function readIndex(s: Storage): string[] {
  const raw = s.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(s: Storage, ids: string[]): void {
  s.setItem(INDEX_KEY, JSON.stringify(ids));
}

function makeId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .padStart(4, "0");
  return `src-${ts}-${rand}`;
}

export function saveSource(input: NewSource, opts?: Partial<AdapterOpts>): string {
  const s = getStorage(opts);
  if (!s) throw new Error("sources: no storage available");
  const entry: SourceEntry = {
    id: makeId(),
    title: input.title.trim() || "Untitled source",
    content: input.content,
    kind: input.kind,
    origin: input.origin,
    createdAtMs: Date.now(),
  };
  s.setItem(ENTRY_PREFIX + entry.id, JSON.stringify(entry));
  const ids = readIndex(s);
  ids.push(entry.id);
  writeIndex(s, ids);
  return entry.id;
}

export function loadSource(
  id: string,
  opts?: Partial<AdapterOpts>,
): SourceEntry | null {
  const s = getStorage(opts);
  if (!s) return null;
  const raw = s.getItem(ENTRY_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SourceEntry;
  } catch {
    return null;
  }
}

export function listSources(opts?: Partial<AdapterOpts>): SourceEntry[] {
  const s = getStorage(opts);
  if (!s) return [];
  const ids = readIndex(s);
  const out: SourceEntry[] = [];
  for (const id of ids) {
    const entry = loadSource(id, { storage: s });
    if (entry) out.push(entry);
  }
  return out.sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export function deleteSource(id: string, opts?: Partial<AdapterOpts>): void {
  const s = getStorage(opts);
  if (!s) return;
  s.removeItem(ENTRY_PREFIX + id);
  const ids = readIndex(s).filter((x) => x !== id);
  writeIndex(s, ids);
}
