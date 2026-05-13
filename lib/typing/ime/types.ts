/**
 * Input method protocol — every language plugin implements this.
 *
 * `feed` accepts raw input (typed chars or composition output) and yields
 * the chars that should be committed to the typing session. `buffer`
 * exposes the in-flight composition string for UI overlays. `reset` clears
 * any pending composition state — invoked when the user backspaces past
 * the start of a composition.
 */

export interface InputMethod {
  feed(raw: string): Iterable<string>;
  reset(): void;
  buffer(): string;
  /**
   * Drain any remaining composition buffer at end of input. Called on
   * line commit so trailing single vowels / partial syllables get
   * committed as their best-effort form (e.g. KoreanRomajaIME's "a"
   * → 아). Implementations without buffered state may omit; the
   * controller treats undefined as a no-op.
   */
  flush?(): Iterable<string>;
}
