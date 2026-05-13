/**
 * Hint selection by native language.
 *
 * Dialogue templates carry per-turn coaching hints. Today's data only
 * ships `hint_zh` (Traditional Chinese); non-zh users see that as a
 * fallback per F7 in OPEN_ISSUES.md. The lookup is structured so future
 * translation backfills (hint_en, hint_ja, …) drop straight in.
 */

import type { Template } from "@/lib/data/schema";

/** Pick the localized hint for `nativeLang` if available, otherwise
 * fall back to `hint_zh`. Returns undefined when the template has no
 * hint at all. */
export function pickHint(
  template: Template | undefined,
  nativeLang: string,
): string | undefined {
  if (!template) return undefined;
  const indexed = template as unknown as Record<string, unknown>;
  const localizedKey = `hint_${nativeLang}`;
  const localized = indexed[localizedKey];
  if (typeof localized === "string" && localized.length > 0) return localized;
  return template.hint_zh;
}
