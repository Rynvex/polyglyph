/**
 * Progress + checkpoint persistence in localStorage.
 *
 * Two independent records per script:
 *   - polyglyph:progress:<scriptId>   — best WPM, history, play count
 *   - polyglyph:checkpoint:<scriptId> — in-progress turn position so a
 *                                       refresh / accidental tab close can
 *                                       resume mid-dialogue.
 *
 * Pure helpers (`computeRecord`, `applyResult`) make the bookkeeping easy
 * to test without touching real storage. The `Storage`-typed wrappers
 * accept a custom storage so we can fake one in tests; in the browser they
 * default to `window.localStorage` and fall back to no-ops on the server.
 */

const HISTORY_LIMIT = 10;

export interface RunResult {
  wpm: number;
  accuracy: number;
  completedAtMs: number;
}

export interface ProgressEntry {
  bestWpm: number;
  bestAccuracy: number;
  playCount: number;
  lastPlayedAtMs: number;
  history: RunResult[];
}

export interface CheckpointSnapshot {
  scriptId: string;
  turnIdx: number;
  spokenBotTurnIds: string[];
  /** Pairs of [playerTurnId, pickedTemplateId]. */
  completedPlayerTurnIds: [string, string][];
  savedAtMs: number;
}

export interface StorageAdapter {
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

const PROGRESS_PREFIX = "polyglyph:progress:";
const CHECKPOINT_PREFIX = "polyglyph:checkpoint:";

// ---------- Pure helpers ----------

export function computeRecord(prior: ProgressEntry | null, run: RunResult): ProgressEntry {
  const history = [...(prior?.history ?? []), run].slice(-HISTORY_LIMIT);
  const bestWpm = Math.max(prior?.bestWpm ?? 0, run.wpm);
  const bestAccuracy =
    run.wpm > (prior?.bestWpm ?? -1)
      ? run.accuracy
      : Math.max(prior?.bestAccuracy ?? 0, run.accuracy);
  return {
    bestWpm,
    bestAccuracy,
    playCount: (prior?.playCount ?? 0) + 1,
    lastPlayedAtMs: run.completedAtMs,
    history,
  };
}

export function applyResult(
  prior: ProgressEntry | null,
  run: RunResult,
): { entry: ProgressEntry; isNewRecord: boolean } {
  const isNewRecord = prior === null ? true : run.wpm > prior.bestWpm;
  return { entry: computeRecord(prior, run), isNewRecord };
}

// ---------- Storage wrappers ----------

function readJson<T>(storage: Storage, key: string): T | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getStorage(adapter?: Partial<StorageAdapter>): Storage | null {
  if (adapter && "storage" in adapter) return adapter.storage ?? null;
  return defaultStorage();
}

export function loadProgress(
  scriptId: string,
  adapter?: Partial<StorageAdapter>,
): ProgressEntry | null {
  const s = getStorage(adapter);
  if (!s) return null;
  return readJson<ProgressEntry>(s, PROGRESS_PREFIX + scriptId);
}

export function saveResult(
  scriptId: string,
  run: RunResult,
  adapter?: Partial<StorageAdapter>,
): { entry: ProgressEntry; isNewRecord: boolean } {
  const s = getStorage(adapter);
  const prior = s ? readJson<ProgressEntry>(s, PROGRESS_PREFIX + scriptId) : null;
  const result = applyResult(prior, run);
  if (s) {
    s.setItem(PROGRESS_PREFIX + scriptId, JSON.stringify(result.entry));
  }
  return result;
}

export function loadCheckpoint(
  scriptId: string,
  adapter?: Partial<StorageAdapter>,
): CheckpointSnapshot | null {
  const s = getStorage(adapter);
  if (!s) return null;
  return readJson<CheckpointSnapshot>(s, CHECKPOINT_PREFIX + scriptId);
}

export function saveCheckpoint(
  scriptId: string,
  snapshot: CheckpointSnapshot,
  adapter?: Partial<StorageAdapter>,
): void {
  const s = getStorage(adapter);
  if (!s) return;
  s.setItem(CHECKPOINT_PREFIX + scriptId, JSON.stringify(snapshot));
}

export function clearCheckpoint(scriptId: string, adapter?: Partial<StorageAdapter>): void {
  const s = getStorage(adapter);
  if (!s) return;
  s.removeItem(CHECKPOINT_PREFIX + scriptId);
}
