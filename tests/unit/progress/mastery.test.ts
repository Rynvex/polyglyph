/**
 * TDD spec for computeMasteryTier — pure classification of a player's
 * progress against the mastery thresholds (see lib/progress/mastery.ts).
 *
 * Thresholds:
 *   - new       : no progress record OR playCount === 0
 *   - practiced : played at least once but doesn't clear mastered
 *   - mastered  : playCount ≥ 3 AND bestAccuracy ≥ 95
 *
 * Accuracy is preferred over WPM because WPM varies wildly across
 * languages (Japanese romaji typing produces lower numbers than
 * English at the same proficiency), so any cross-language threshold
 * would either be too lax or too strict somewhere.
 */
import { describe, expect, test } from "vitest";
import {
  MASTERY_ACCURACY_THRESHOLD,
  MASTERY_PLAYCOUNT_THRESHOLD,
  computeMasteryTier,
} from "@/lib/progress/mastery";
import type { ProgressEntry } from "@/lib/progress/storage";

function progress(over: Partial<ProgressEntry>): ProgressEntry {
  return {
    bestWpm: 0,
    bestAccuracy: 0,
    playCount: 0,
    lastPlayedAtMs: 0,
    history: [],
    ...over,
  };
}

describe("computeMasteryTier", () => {
  test("null progress → new", () => {
    expect(computeMasteryTier(null)).toBe("new");
  });

  test("playCount === 0 → new (defensive — should not happen but guard anyway)", () => {
    expect(computeMasteryTier(progress({ playCount: 0 }))).toBe("new");
  });

  test("one play, low accuracy → practiced", () => {
    expect(
      computeMasteryTier(progress({ playCount: 1, bestAccuracy: 60 })),
    ).toBe("practiced");
  });

  test("one play with perfect accuracy is still practiced (needs reps)", () => {
    expect(
      computeMasteryTier(progress({ playCount: 1, bestAccuracy: 100 })),
    ).toBe("practiced");
  });

  test("two plays with high accuracy is still practiced (needs 3 reps)", () => {
    expect(
      computeMasteryTier(progress({ playCount: 2, bestAccuracy: 99 })),
    ).toBe("practiced");
  });

  test("three plays with sub-threshold accuracy stays practiced", () => {
    expect(
      computeMasteryTier(
        progress({ playCount: 3, bestAccuracy: MASTERY_ACCURACY_THRESHOLD - 1 }),
      ),
    ).toBe("practiced");
  });

  test("three plays exactly at accuracy threshold → mastered", () => {
    expect(
      computeMasteryTier(
        progress({
          playCount: MASTERY_PLAYCOUNT_THRESHOLD,
          bestAccuracy: MASTERY_ACCURACY_THRESHOLD,
        }),
      ),
    ).toBe("mastered");
  });

  test("many plays, perfect accuracy → mastered", () => {
    expect(
      computeMasteryTier(progress({ playCount: 12, bestAccuracy: 100 })),
    ).toBe("mastered");
  });
});

describe("threshold constants are exported (so callers can document them)", () => {
  test("playcount threshold is a positive integer", () => {
    expect(Number.isInteger(MASTERY_PLAYCOUNT_THRESHOLD)).toBe(true);
    expect(MASTERY_PLAYCOUNT_THRESHOLD).toBeGreaterThan(0);
  });

  test("accuracy threshold is between 0 and 100", () => {
    expect(MASTERY_ACCURACY_THRESHOLD).toBeGreaterThan(0);
    expect(MASTERY_ACCURACY_THRESHOLD).toBeLessThanOrEqual(100);
  });
});
