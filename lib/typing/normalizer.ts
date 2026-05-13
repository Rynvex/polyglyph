/**
 * Forgiving char-pair comparator.
 *
 * Default mode strips diacritics, folds case, AND maps common typographic
 * characters (em/en dash, smart quotes, NBSP) onto their ASCII keyboard
 * equivalents — so a learner typing `-` matches a script that uses `—`.
 * Strict mode opts out of all forgiveness for spell-checking practice.
 */

const COMBINING_MARKS = /\p{M}+/gu;

const TYPOGRAPHY: Record<string, string> = {
  // Dashes / hyphens
  "—": "-", // em dash      U+2014
  "–": "-", // en dash      U+2013
  "−": "-", // minus sign   U+2212
  "‐": "-", // hyphen       U+2010 (rare but seen in copy-paste)

  // Apostrophes
  "’": "'", // right single quote (curly)
  "‘": "'", // left single quote  (curly)
  "ʼ": "'", // modifier letter apostrophe

  // Double quotes
  "”": '"', // right double quote
  "“": '"', // left double quote

  // Whitespace
  " ": " ", // non-breaking space
};

function foldTypography(s: string): string {
  let out = "";
  for (const ch of s) {
    out += TYPOGRAPHY[ch] ?? ch;
  }
  return out;
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(COMBINING_MARKS, "");
}

export interface NormalizeOptions {
  strict?: boolean;
}

export function normalizePair(
  typed: string,
  target: string,
  opts: NormalizeOptions = {},
): boolean {
  if (typed === target) return true;
  if (opts.strict) return false;
  const a = stripAccents(foldTypography(typed.toLocaleLowerCase()));
  const b = stripAccents(foldTypography(target.toLocaleLowerCase()));
  return a === b;
}
