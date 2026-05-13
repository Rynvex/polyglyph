/**
 * DialogueReview — per-turn review on the settlement screen showing what
 * the user actually typed for each player line.
 */

import { CharState, type CharCell } from "@/lib/typing/engine";
import type { CompletedPlayerTurn } from "@/lib/dialogue/controller";

interface DialogueReviewProps {
  turns: readonly CompletedPlayerTurn[];
}

const cellClass: Record<string, string> = {
  [CharState.Pending]: "text-fg-faint",
  [CharState.Correct]: "text-fg",
  [CharState.Wrong]: "text-cell-wrong underline decoration-[var(--cell-wrong)] decoration-wavy underline-offset-2",
};

function hasMistake(cells: readonly CharCell[]): boolean {
  return cells.some((c) => c.state === CharState.Wrong);
}

export function DialogueReview({ turns }: DialogueReviewProps) {
  if (turns.length === 0) return null;
  return (
    <details
      data-testid="dialogue-review"
      className="rounded-2xl bg-surface px-5 py-4 ring-1 ring-border"
    >
      <summary className="cursor-pointer text-sm text-fg-muted hover:text-fg">
        Review what you typed ({turns.length}{" "}
        {turns.length === 1 ? "line" : "lines"})
      </summary>
      <ol className="mt-3 flex flex-col gap-3">
        {turns.map((entry, i) => {
          const flagged = hasMistake(entry.cells);
          return (
            <li
              key={`${entry.turn.id}-${i}`}
              data-testid="review-line"
              data-flagged={flagged ? "true" : "false"}
              className={`flex flex-col gap-1 rounded-lg border-l-2 pl-3 ${
                flagged ? "border-error bg-error/5" : "border-border opacity-70"
              }`}
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-fg-faint">
                Turn {i + 1}
                {flagged ? " · had typos" : " · clean"}
              </span>
              <span className="font-mono text-sm leading-relaxed">
                {entry.cells.map((cell, ci) => (
                  <span key={ci} className={cellClass[cell.state]}>
                    {cell.state === CharState.Wrong && cell.typed
                      ? cell.typed
                      : cell.target}
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
