/**
 * DirectIME — pass-through input method for Latin-script languages.
 *
 * Used by English, Spanish, German, French, Italian, etc. Each input char
 * is committed immediately; there is no composition buffer.
 */

import type { InputMethod } from "./types";

export class DirectIME implements InputMethod {
  *feed(raw: string): Iterable<string> {
    for (const ch of raw) yield ch;
  }

  reset(): void {
    // No state to clear.
  }

  buffer(): string {
    return "";
  }
}
