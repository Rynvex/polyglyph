/**
 * Hint selection by native language.
 *
 * Dialogue templates carry per-turn coaching hints. Today's data only
 * ships `hint_zh` (Traditional Chinese); non-zh users see that as a
 * fallback per F7 in OPEN_ISSUES.md. The lookup is structured so future
 * translation backfills (hint_en, hint_ja, …) drop straight in.
 */

import type { Template } from "@/lib/data/schema";

/** Pick the localized hint for `nativeLang`. Priority chain:
 *   1. `template.nativeText` — overlay attached by attachNativeText(),
 *      which is the authoritative translation for the user's nativeLang.
 *   2. `template.hint_<nativeLang>` — explicit localized hint field.
 *   3. `template.hint_zh` — legacy Chinese fallback.
 * Returns undefined when none of the above is set. */
export function pickHint(
  template: Template | undefined,
  nativeLang: string,
): string | undefined {
  if (!template) return undefined;
  if (template.nativeText && template.nativeText.length > 0) {
    return template.nativeText;
  }
  const indexed = template as unknown as Record<string, unknown>;
  const localizedKey = `hint_${nativeLang}`;
  const localized = indexed[localizedKey];
  if (typeof localized === "string" && localized.length > 0) return localized;
  return template.hint_zh;
}
