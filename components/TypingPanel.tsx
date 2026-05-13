/**
 * TypingPanel — character grid view of an in-flight TypingSession.
 *
 * Cells expose CharState as a data attribute; the cursor cell gets a
 * blinking underline. Punctuation cells get a subtle outline so they don't
 * disappear visually. Colors route through theme tokens.
 *
 * Layout: consecutive non-space cells are wrapped in an atomic
 * `inline-block` group so they line-break only at word boundaries, never
 * mid-word. A `<wbr>` sits between groups to give the browser a break
 * opportunity at every boundary. Space cells get an explicit min-width
 * so the gap between words is visible (the literal " " glyph collapses
 * to almost nothing inside an inline-block).
 */

import { Fragment } from "react";
import { CharState, type CharCell, type TypingSession } from "@/lib/typing/engine";

export interface FuriganaSegment {
  jp: string;
  ro: string;
}

interface TypingPanelProps {
  session: TypingSession;
  hintZh?: string;
  /**
   * Optional native-script reference shown above the romaji cells. For
   * non-Latin languages typed via romanization (ja/zh-tw/ko) this is the
   * kana / 漢字 / 한글 form so the learner sees what they're typing
   * toward. Display-only — matching is still done against `session.target`.
   */
  displayTarget?: string;
  /**
   * Optional second-line hint: the spaced romaji form shown beneath
   * `displayTarget`. Used for ja where the typed `text` is intentionally
   * unspaced — the learner reads the spaced version to see word
   * boundaries while typing the continuous form. Superseded by
   * `displayFurigana` when both are present.
   */
  displayRomaji?: string;
  /**
   * Inline furigana annotations rendered with HTML `<ruby>`. Each
   * segment's `ro` floats as small text above its `jp`, exactly
   * matching word boundaries. When set, replaces the two-line
   * displayTarget + displayRomaji rows.
   */
  displayFurigana?: ReadonlyArray<FuriganaSegment>;
}

const stateClass: Record<string, string> = {
  [CharState.Pending]: "text-cell-pending",
  [CharState.Correct]: "text-cell-correct",
  [CharState.Wrong]: "text-cell-wrong",
};

const PUNCTUATION = new Set([
  ",",
  ".",
  "!",
  "?",
  ";",
  ":",
  "'",
  '"',
  "-",
  "(",
  ")",
  "[",
  "]",
]);

function isPunct(ch: string): boolean {
  return PUNCTUATION.has(ch);
}

interface Group {
  kind: "word" | "space";
  indices: number[];
}

/** Group consecutive same-kind cells (word vs space) so words can be
 *  rendered as atomic inline-block wrappers. */
function groupCells(cells: readonly CharCell[]): Group[] {
  const out: Group[] = [];
  for (let i = 0; i < cells.length; i++) {
    const kind: Group["kind"] = cells[i].target === " " ? "space" : "word";
    const last = out[out.length - 1];
    if (last && last.kind === kind) {
      last.indices.push(i);
    } else {
      out.push({ kind, indices: [i] });
    }
  }
  return out;
}

export function TypingPanel({
  session,
  hintZh,
  displayTarget,
  displayRomaji,
  displayFurigana,
}: TypingPanelProps) {
  const typoCount = session.cells.filter((c) => c.state === CharState.Wrong).length;
  const groups = groupCells(session.cells);
  // Live composition string from the IME (non-empty for Japanese while
  // a syllable is mid-typing; always empty for DirectIME / Latin).
  const imeBuffer = session.ime.buffer();

  function renderCell(i: number) {
    const cell = session.cells[i];
    const isCursor = i === session.cursor;
    const punct = isPunct(cell.target);
    const isSpace = cell.target === " ";
    const cellSpan = (
      <span
        key={`c${i}`}
        data-testid="cell"
        data-state={cell.state}
        data-cursor={isCursor ? "true" : undefined}
        data-punct={punct ? "true" : undefined}
        className={[
          "relative inline-block",
          stateClass[cell.state],
          // Spaces collapse to near-zero width inside inline-block, so
          // give them an explicit gap so the user can SEE word breaks.
          isSpace ? "w-[0.5em]" : "",
          punct
            ? "rounded-sm bg-surface-2/50 px-[2px] outline outline-1 outline-border"
            : "",
          isCursor ? "bg-accent/10" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {cell.target === " " ? " " : cell.target}
        {isCursor ? (
          <span
            aria-hidden
            className="cursor-blink pointer-events-none absolute inset-x-0 -bottom-0.5 block h-0.5 rounded bg-cursor"
          />
        ) : null}
      </span>
    );
    // Composition badge sits IMMEDIATELY before the cursor cell so the
    // user sees the keys they've typed but haven't yet landed on a
    // syllable — mimics the underline preview that OS-level IMEs
    // (Mozc / Anthy / iOS) show during composition.
    if (isCursor && imeBuffer.length > 0) {
      return (
        <Fragment key={`cf${i}`}>
          <span
            data-testid="ime-buffer"
            className="inline-block whitespace-nowrap italic text-fg-muted underline decoration-dotted underline-offset-4"
          >
            {imeBuffer}
          </span>
          {cellSpan}
        </Fragment>
      );
    }
    return cellSpan;
  }

  return (
    <div className="rounded-2xl bg-typing-panel px-6 py-5 ring-1 ring-typing-panel-ring">
      {displayFurigana && displayFurigana.length > 0 ? (
        <div
          data-testid="display-furigana"
          lang="ja"
          className="mb-3 flex flex-wrap items-end gap-x-1 text-2xl leading-relaxed text-fg-muted"
        >
          {displayFurigana.map((seg, i) => (
            <ruby
              key={i}
              className="ruby-segment"
              style={{ rubyAlign: "center" }}
            >
              {seg.jp}
              <rt className="font-mono text-[0.55em] text-fg-faint">
                {seg.ro}
              </rt>
            </ruby>
          ))}
        </div>
      ) : (
        <>
          {displayTarget ? (
            <div
              data-testid="display-target"
              lang="ja"
              className="text-lg leading-snug text-fg-muted"
            >
              {displayTarget}
            </div>
          ) : null}
          {displayRomaji ? (
            <div
              data-testid="display-romaji"
              className="mb-2 font-mono text-sm leading-snug text-fg-faint"
            >
              {displayRomaji}
            </div>
          ) : displayTarget ? (
            <div className="mb-2" />
          ) : null}
        </>
      )}
      <div className="font-mono text-2xl tracking-wide leading-relaxed">
        {groups.map((group, gi) => (
          <Fragment key={gi}>
            <span className="inline-block align-baseline">
              {group.indices.map(renderCell)}
            </span>
            {gi < groups.length - 1 ? <wbr /> : null}
          </Fragment>
        ))}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        {hintZh ? (
          <div
            data-testid="hint"
            className="flex flex-1 items-center gap-2 text-lg leading-snug text-fg"
          >
            <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-fg-muted">
              提示
            </span>
            <span>{hintZh}</span>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        {typoCount > 0 ? (
          <span data-testid="typo-counter" className="shrink-0 text-xs text-fg-faint">
            {typoCount} {typoCount === 1 ? "typo" : "typos"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
