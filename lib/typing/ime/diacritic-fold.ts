/**
 * diacritic-fold — pure helpers that strip per-language diacritics so
 * the typing target stays IME-friendly ASCII even when the prompt
 * display carries the proper native spelling.
 *
 *   latinFold(s)   – generic stripper for es / it: removes combining
 *                    marks via NFD decomposition, then drops common
 *                    Latin diacritics (é→e, ñ→n, ü→u, etc.).
 *
 *   germanFold(s)  – German-specific: ä→ae, ö→oe, ü→ue, ß→ss. ASCII
 *                    fallback follows the long-standing typewriter
 *                    convention rather than naked vowel-stripping.
 *
 * Both functions preserve case and pass through ASCII unchanged.
 */

const COMBINING_MARKS = /\p{M}+/gu;

/**
 * Strip Latin diacritics by NFD decomposition + combining-mark drop.
 * Leaves ñ as `n` (NFD splits `ñ` → `n` + ̃, the mark is then dropped).
 */
export function latinFold(s: string): string {
  return s.normalize("NFD").replace(COMBINING_MARKS, "");
}

const GERMAN_MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  ß: "ss",
};

/**
 * German-style fold: ä→ae, ö→oe, ü→ue, ß→ss. Anything else falls
 * back to `latinFold` so misc Latin accents don't slip through.
 */
export function germanFold(s: string): string {
  let out = "";
  for (const ch of s) {
    out += GERMAN_MAP[ch] ?? ch;
  }
  return latinFold(out);
}
