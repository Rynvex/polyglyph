/**
 * User-generated dialogue scripts persisted in localStorage.
 *
 * Lifecycle: a generated dialogue starts as `status: "draft"` and moves to
 * `published` only when the user explicitly publishes it. Drafts are
 * editable; published scripts feed the landing library and play page.
 *
 * Layout:
 *   polyglyph:user-script:<id>     — entry JSON
 *   polyglyph:user-scripts:index   — array of ids in insertion order
 */

import { DialogueSchema, type Dialogue } from "./schema";

const ENTRY_PREFIX = "polyglyph:user-script:";
const INDEX_KEY = "polyglyph:user-scripts:index";
const EXPORT_FORMAT = "polyglyph.user-scripts.v1";

export type ScriptStatus = "draft" | "published";

export interface UserScriptEntry {
  scriptId: string;
  createdAtMs: number;
  dialogue: Dialogue;
  /** Pre-v0.4 entries default to "published" via migration. */
  status: ScriptStatus;
  /** Optional free-form tags for filtering on the landing page. */
  tags: string[];
  /** Optional source-id link if generated through the pipeline. */
  sourceId?: string;
}

export interface UserScriptsExport {
  format: string;
  entries: UserScriptEntry[];
}

interface AdapterOpts {
  storage: Storage | null;
}

interface SaveOptions {
  status?: ScriptStatus;
  tags?: string[];
  sourceId?: string;
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
  return `user-${ts}-${rand}`;
}

/** Coerce a possibly-legacy entry into the current shape. */
function migrateEntry(raw: unknown): UserScriptEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<UserScriptEntry> & { dialogue?: unknown };
  const dialogueParsed = DialogueSchema.safeParse(obj.dialogue);
  if (!dialogueParsed.success) return null;
  return {
    scriptId: typeof obj.scriptId === "string" ? obj.scriptId : "",
    createdAtMs: typeof obj.createdAtMs === "number" ? obj.createdAtMs : 0,
    dialogue: dialogueParsed.data,
    status: obj.status === "draft" ? "draft" : "published",
    tags: Array.isArray(obj.tags) ? obj.tags.filter((t) => typeof t === "string") : [],
    sourceId: typeof obj.sourceId === "string" ? obj.sourceId : undefined,
  };
}

export function saveUserScript(
  dialogue: Dialogue,
  opts?: Partial<AdapterOpts> & SaveOptions,
): string {
  const s = getStorage(opts);
  if (!s) throw new Error("user-scripts: no storage available");
  const scriptId = makeId();
  const entry: UserScriptEntry = {
    scriptId,
    createdAtMs: Date.now(),
    dialogue,
    status: opts?.status ?? "published",
    tags: opts?.tags ?? [],
    sourceId: opts?.sourceId,
  };
  s.setItem(ENTRY_PREFIX + scriptId, JSON.stringify(entry));
  const ids = readIndex(s);
  ids.push(scriptId);
  writeIndex(s, ids);
  return scriptId;
}

export function loadUserScript(
  scriptId: string,
  opts?: Partial<AdapterOpts>,
): Dialogue | null {
  const s = getStorage(opts);
  if (!s) return null;
  const raw = s.getItem(ENTRY_PREFIX + scriptId);
  if (!raw) return null;
  try {
    const entry = migrateEntry(JSON.parse(raw));
    return entry?.dialogue ?? null;
  } catch {
    return null;
  }
}

export function loadUserScriptEntry(
  scriptId: string,
  opts?: Partial<AdapterOpts>,
): UserScriptEntry | null {
  const s = getStorage(opts);
  if (!s) return null;
  const raw = s.getItem(ENTRY_PREFIX + scriptId);
  if (!raw) return null;
  try {
    return migrateEntry(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function listUserScripts(opts?: Partial<AdapterOpts>): UserScriptEntry[] {
  const s = getStorage(opts);
  if (!s) return [];
  const ids = readIndex(s);
  const out: UserScriptEntry[] = [];
  for (const id of ids) {
    const raw = s.getItem(ENTRY_PREFIX + id);
    if (!raw) continue;
    try {
      const entry = migrateEntry(JSON.parse(raw));
      if (entry) out.push(entry);
    } catch {
      // skip
    }
  }
  return out.sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export function listPublished(opts?: Partial<AdapterOpts>): UserScriptEntry[] {
  return listUserScripts(opts).filter((e) => e.status === "published");
}

export function listDrafts(opts?: Partial<AdapterOpts>): UserScriptEntry[] {
  return listUserScripts(opts).filter((e) => e.status === "draft");
}

export function deleteUserScript(scriptId: string, opts?: Partial<AdapterOpts>): void {
  const s = getStorage(opts);
  if (!s) return;
  s.removeItem(ENTRY_PREFIX + scriptId);
  const ids = readIndex(s).filter((id) => id !== scriptId);
  writeIndex(s, ids);
}

interface UpdateInput {
  dialogue?: Dialogue;
  status?: ScriptStatus;
  tags?: string[];
  sourceId?: string;
}

export function updateUserScript(
  scriptId: string,
  updates: UpdateInput,
  opts?: Partial<AdapterOpts>,
): UserScriptEntry | null {
  const s = getStorage(opts);
  if (!s) return null;
  const existing = loadUserScriptEntry(scriptId, { storage: s });
  if (!existing) return null;
  const next: UserScriptEntry = {
    ...existing,
    dialogue: updates.dialogue ?? existing.dialogue,
    status: updates.status ?? existing.status,
    tags: updates.tags ?? existing.tags,
    sourceId: "sourceId" in updates ? updates.sourceId : existing.sourceId,
  };
  s.setItem(ENTRY_PREFIX + scriptId, JSON.stringify(next));
  return next;
}

export function publishDraft(
  scriptId: string,
  opts?: Partial<AdapterOpts>,
): UserScriptEntry | null {
  return updateUserScript(scriptId, { status: "published" }, opts);
}

export function exportAllUserScripts(opts?: Partial<AdapterOpts>): UserScriptsExport {
  return {
    format: EXPORT_FORMAT,
    entries: listUserScripts(opts),
  };
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

export function importUserScripts(
  blob: unknown,
  opts?: Partial<AdapterOpts>,
): ImportResult {
  if (
    !blob ||
    typeof blob !== "object" ||
    (blob as { format?: unknown }).format !== EXPORT_FORMAT ||
    !Array.isArray((blob as { entries?: unknown }).entries)
  ) {
    throw new Error(
      `user-scripts: import format must be "${EXPORT_FORMAT}" with an entries array`,
    );
  }
  const entries = (blob as UserScriptsExport).entries;
  let imported = 0;
  let skipped = 0;
  for (const entry of entries) {
    const parsed = DialogueSchema.safeParse(entry?.dialogue);
    if (!parsed.success) {
      skipped += 1;
      continue;
    }
    saveUserScript(parsed.data, {
      ...opts,
      status: entry?.status === "draft" ? "draft" : "published",
      tags: Array.isArray(entry?.tags) ? entry.tags : [],
      sourceId: typeof entry?.sourceId === "string" ? entry.sourceId : undefined,
    });
    imported += 1;
  }
  return { imported, skipped };
}
