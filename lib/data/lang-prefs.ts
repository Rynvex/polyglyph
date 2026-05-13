/**
 * Language preferences — split into two independent settings:
 *
 *   `nativeLang`  – the user's mother tongue. Profile-level, applies
 *                   to vocab AND dialogue hints. Persisted under
 *                   `polyglyph:native-lang`. Picked once on the home
 *                   page and reused everywhere.
 *
 *   `targetLang`  – the language they want to practice in *this*
 *                   session. Per-context (mostly vocab — dialogue
 *                   target is tied to script selection). Persisted
 *                   under `polyglyph:target-lang`.
 *
 * A legacy `polyglyph:lang-pair` key combined both. On first read the
 * legacy key is split into the two new keys and removed so callers
 * see a stable view going forward.
 *
 * Validation lives here (not Zod) so the file is dependency-free and
 * trivially tree-shakeable.
 */

export interface LangPair {
  nativeLang: string;
  targetLang: string;
}

export const LEGACY_LANG_PAIR_KEY = "polyglyph:lang-pair";
export const NATIVE_LANG_KEY = "polyglyph:native-lang";
export const TARGET_LANG_KEY = "polyglyph:target-lang";

/** Re-export with the previous name so old imports keep compiling. */
export const LANG_PAIR_KEY = LEGACY_LANG_PAIR_KEY;

export const DEFAULT_NATIVE_LANG = "en";
export const DEFAULT_TARGET_LANG = "es";
export const DEFAULT_LANG_PAIR: LangPair = {
  nativeLang: DEFAULT_NATIVE_LANG,
  targetLang: DEFAULT_TARGET_LANG,
};

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

function readLegacy(s: Storage): { native?: string; target?: string } {
  const raw = s.getItem(LEGACY_LANG_PAIR_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const obj = parsed as Record<string, unknown>;
    const out: { native?: string; target?: string } = {};
    if (typeof obj.nativeLang === "string") out.native = obj.nativeLang;
    if (typeof obj.targetLang === "string") out.target = obj.targetLang;
    return out;
  } catch {
    return {};
  }
}

/** Migrate the legacy combined key into split keys, then remove it.
 * Idempotent — safe to call on every read. */
function migrateLegacy(s: Storage): void {
  const legacy = s.getItem(LEGACY_LANG_PAIR_KEY);
  if (!legacy) return;
  const { native, target } = readLegacy(s);
  if (native && !s.getItem(NATIVE_LANG_KEY)) s.setItem(NATIVE_LANG_KEY, native);
  if (target && !s.getItem(TARGET_LANG_KEY)) s.setItem(TARGET_LANG_KEY, target);
  s.removeItem(LEGACY_LANG_PAIR_KEY);
}

export function loadNativeLang(opts?: Partial<AdapterOpts>): string {
  const s = getStorage(opts);
  if (!s) return DEFAULT_NATIVE_LANG;
  migrateLegacy(s);
  const value = s.getItem(NATIVE_LANG_KEY);
  if (typeof value === "string" && value.length > 0) return value;
  return DEFAULT_NATIVE_LANG;
}

export function saveNativeLang(
  lang: string,
  opts?: Partial<AdapterOpts>,
): void {
  const s = getStorage(opts);
  if (!s) return;
  s.setItem(NATIVE_LANG_KEY, lang);
}

export function loadTargetLang(opts?: Partial<AdapterOpts>): string {
  const s = getStorage(opts);
  if (!s) return DEFAULT_TARGET_LANG;
  migrateLegacy(s);
  const value = s.getItem(TARGET_LANG_KEY);
  if (typeof value === "string" && value.length > 0) return value;
  return DEFAULT_TARGET_LANG;
}

export function saveTargetLang(
  lang: string,
  opts?: Partial<AdapterOpts>,
): void {
  const s = getStorage(opts);
  if (!s) return;
  s.setItem(TARGET_LANG_KEY, lang);
}

/** Convenience wrapper preserved for callers that read both at once. */
export function loadLangPair(opts?: Partial<AdapterOpts>): LangPair {
  return {
    nativeLang: loadNativeLang(opts),
    targetLang: loadTargetLang(opts),
  };
}

/** Convenience wrapper preserved for callers that save both at once. */
export function saveLangPair(
  pair: LangPair,
  opts?: Partial<AdapterOpts>,
): void {
  saveNativeLang(pair.nativeLang, opts);
  saveTargetLang(pair.targetLang, opts);
}
