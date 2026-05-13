/**
 * Mastery classification — pure function over a progress record.
 *
 * Returns one of three tiers used by the script list UI to surface how
 * much a player has practiced each dialogue:
 *
 *   new        – never played to completion
 *   practiced  – played ≥ 1 time but hasn't cleared mastered yet
 *   mastered   – played ≥ MASTERY_PLAYCOUNT_THRESHOLD times AND best
 *                accuracy ≥ MASTERY_ACCURACY_THRESHOLD%
 *
 * Accuracy is the gating metric (not WPM) because WPM varies a lot
 * across languages — Japanese romaji typing produces a lower number
 * for the same proficiency than English would, and we want a fair
 * cross-language signal.
 */

import type { ProgressEntry } from "./storage";

export const MASTERY_PLAYCOUNT_THRESHOLD = 3;
export const MASTERY_ACCURACY_THRESHOLD = 95;

export type MasteryTier = "new" | "practiced" | "mastered";

export function computeMasteryTier(
  progress: ProgressEntry | null,
): MasteryTier {
  if (!progress || progress.playCount <= 0) return "new";
  if (
    progress.playCount >= MASTERY_PLAYCOUNT_THRESHOLD &&
    progress.bestAccuracy >= MASTERY_ACCURACY_THRESHOLD
  ) {
    return "mastered";
  }
  return "practiced";
}
