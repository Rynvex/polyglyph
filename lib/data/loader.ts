/**
 * Dialogue loader — browser-side fetch + zod validation.
 *
 * `loadDialogue` validates an already-parsed object (handy for tests and
 * for SSR where the JSON is read from the filesystem). `loadDialogueFromUrl`
 * fetches and pipes through `loadDialogue`.
 */

import { DialogueSchema, type Dialogue } from "./schema";

export function loadDialogue(payload: unknown): Dialogue {
  return DialogueSchema.parse(payload);
}

export async function loadDialogueFromUrl(url: string): Promise<Dialogue> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  const text = await res.text();
  const payload: unknown = JSON.parse(text);
  return loadDialogue(payload);
}
