/**
 * Translation-display preferences.
 *
 * Two independent boolean toggles control whether translation strips
 * render under the NPC bubble and the player bubble. Each toggle has its
 * own localStorage key — independence makes future toggle additions a
 * no-migration drop-in.
 *
 * Defaults: both `false`. Learners practicing without a crutch see no
 * change unless they opt in via the global footer banner.
 *
 * Same dependency-free, SSR-safe shape as `lang-prefs.ts`.
 */

export interface TranslationPrefs {
  showNpcTranslation: boolean;
  showPlayerTranslation: boolean;
}

export const SHOW_NPC_TRANSLATION_KEY = "polyglyph:show-npc-translation";
export const SHOW_PLAYER_TRANSLATION_KEY = "polyglyph:show-player-translation";

/**
 * Custom event name dispatched on `window` after every save / setter
 * call. Listeners (e.g. an open DialogueScene) re-read prefs from
 * storage so toggling in the global footer takes effect mid-session
 * without a page reload. Native `storage` events do not fire in the
 * same tab, so this app-level event is the simpler choice.
 */
export const TRANSLATION_PREFS_EVENT = "polyglyph:translation-prefs-changed";

function dispatchChange(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(TRANSLATION_PREFS_EVENT));
  } catch {
    // jsdom < 16 / SSR fallback — silent.
  }
}

export const DEFAULT_TRANSLATION_PREFS: TranslationPrefs = {
  showNpcTranslation: false,
  showPlayerTranslation: false,
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

function readBool(s: Storage, key: string): boolean {
  return s.getItem(key) === "true";
}

function writeBool(s: Storage, key: string, value: boolean): void {
  s.setItem(key, value ? "true" : "false");
}

export function loadTranslationPrefs(
  opts?: Partial<AdapterOpts>,
): TranslationPrefs {
  const s = getStorage(opts);
  if (!s) return DEFAULT_TRANSLATION_PREFS;
  return {
    showNpcTranslation: readBool(s, SHOW_NPC_TRANSLATION_KEY),
    showPlayerTranslation: readBool(s, SHOW_PLAYER_TRANSLATION_KEY),
  };
}

export function saveTranslationPrefs(
  prefs: TranslationPrefs,
  opts?: Partial<AdapterOpts>,
): void {
  const s = getStorage(opts);
  if (!s) return;
  writeBool(s, SHOW_NPC_TRANSLATION_KEY, prefs.showNpcTranslation);
  writeBool(s, SHOW_PLAYER_TRANSLATION_KEY, prefs.showPlayerTranslation);
  dispatchChange();
}

export function setShowNpcTranslation(
  value: boolean,
  opts?: Partial<AdapterOpts>,
): void {
  const s = getStorage(opts);
  if (!s) return;
  writeBool(s, SHOW_NPC_TRANSLATION_KEY, value);
  dispatchChange();
}

export function setShowPlayerTranslation(
  value: boolean,
  opts?: Partial<AdapterOpts>,
): void {
  const s = getStorage(opts);
  if (!s) return;
  writeBool(s, SHOW_PLAYER_TRANSLATION_KEY, value);
  dispatchChange();
}
