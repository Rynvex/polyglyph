/**
 * Typing stats — accuracy, combo, WPM. Pure value object; every mutation
 * returns a fresh copy so React/state code can rely on referential equality.
 */

export interface Stats {
  readonly charsCorrect: number;
  readonly charsWrong: number;
  readonly combo: number;
  readonly maxCombo: number;
  readonly elapsedSec: number;
}

export function createStats(): Stats {
  return {
    charsCorrect: 0,
    charsWrong: 0,
    combo: 0,
    maxCombo: 0,
    elapsedSec: 0,
  };
}

export function recordChar(s: Stats, ok: boolean): Stats {
  if (ok) {
    const combo = s.combo + 1;
    return {
      ...s,
      charsCorrect: s.charsCorrect + 1,
      combo,
      maxCombo: Math.max(s.maxCombo, combo),
    };
  }
  return {
    ...s,
    charsWrong: s.charsWrong + 1,
    combo: 0,
  };
}

export function tickStats(s: Stats, dt: number): Stats {
  return { ...s, elapsedSec: s.elapsedSec + dt };
}

export function accuracy(s: Stats): number {
  const total = s.charsCorrect + s.charsWrong;
  return total === 0 ? 1 : s.charsCorrect / total;
}

export function wpm(s: Stats): number {
  if (s.elapsedSec <= 0) return 0;
  return s.charsCorrect / 5 / (s.elapsedSec / 60);
}
