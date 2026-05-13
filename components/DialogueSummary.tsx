/**
 * DialogueSummary — settlement view shown after a dialogue completes.
 *
 * Stats grid + per-turn review + actions, with keyboard shortcuts surfaced
 * both as `<kbd>` badges next to each button and as a footer hint so the
 * user never has to leave the keyboard. The actual key handling lives in
 * DialogueScene; this component just labels them.
 */

import Link from "next/link";
import { DialogueReview } from "@/components/DialogueReview";
import { Kbd } from "@/components/Kbd";
import type { CompletedPlayerTurn } from "@/lib/dialogue/controller";

interface DialogueSummaryProps {
  title: string;
  wpm: number;
  accuracy: number;
  durationSec: number;
  maxCombo: number;
  charsTyped: number;
  completedTurns?: readonly CompletedPlayerTurn[];
  nextScriptId?: string | null;
  /** Pre-built href for the next-script link (preserves ?lang= when present). */
  nextScriptHref?: string | null;
  isNewRecord?: boolean;
  onPlayAgain: () => void;
}

function formatWpm(wpm: number): string {
  return Number.isInteger(wpm) ? String(wpm) : wpm.toFixed(1);
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function formatDuration(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface StatProps {
  testId: string;
  label: string;
  value: string;
}

function Stat({ testId, label, value }: StatProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface px-6 py-5 ring-1 ring-border">
      <span className="text-xs uppercase tracking-[0.2em] text-fg-faint">{label}</span>
      <span data-testid={testId} className="text-3xl font-semibold tabular-nums text-fg">
        {value}
      </span>
    </div>
  );
}

export function DialogueSummary({
  title,
  wpm,
  accuracy,
  durationSec,
  maxCombo,
  charsTyped,
  completedTurns,
  nextScriptId,
  nextScriptHref,
  isNewRecord,
  onPlayAgain,
}: DialogueSummaryProps) {
  const resolvedHref = nextScriptHref ?? (nextScriptId ? `/play/${nextScriptId}` : null);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col items-center gap-2 text-center">
        {isNewRecord ? (
          <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-warning ring-1 ring-warning/30">
            ✨ New record
          </span>
        ) : null}
        <span className="text-xs uppercase tracking-[0.3em] text-success">
          Dialogue complete
        </span>
        <h1 className="text-2xl font-semibold text-fg">{title}</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat testId="stat-wpm" label="WPM" value={formatWpm(wpm)} />
        <Stat testId="stat-accuracy" label="Accuracy" value={formatPercent(accuracy)} />
        <Stat testId="stat-duration" label="Time" value={formatDuration(durationSec)} />
        <Stat testId="stat-combo" label="Max combo" value={String(maxCombo)} />
      </div>

      <p className="text-center text-sm text-fg-muted">
        Typed {charsTyped} characters in {formatDuration(durationSec)}.
      </p>

      {completedTurns && completedTurns.length > 0 ? (
        <DialogueReview turns={completedTurns} />
      ) : null}

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex items-center rounded-xl bg-success px-6 py-3 text-base font-medium text-white shadow transition hover:bg-success-hover"
        >
          <span>Play again</span>
          <span className="ml-2">
            <Kbd variant="on-button">Enter</Kbd>
          </span>
        </button>
        {resolvedHref ? (
          <Link
            href={resolvedHref}
            className="flex items-center rounded-xl bg-accent px-6 py-3 text-base font-medium text-white shadow transition hover:bg-accent-hover"
            data-testid="next-script"
          >
            <span>Next script →</span>
            <span className="ml-2">
              <Kbd variant="on-button">N</Kbd>
            </span>
          </Link>
        ) : null}
        <Link
          href="/"
          className="flex items-center rounded-xl bg-surface-2 px-6 py-3 text-base font-medium text-fg ring-1 ring-border transition hover:bg-surface"
        >
          <span>← Back to scripts</span>
          <span className="ml-2">
            <Kbd variant="on-button">Esc</Kbd>
          </span>
        </Link>
      </div>

      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-center text-sm text-fg-muted">
        <Kbd>Enter</Kbd>
        <span>or</span>
        <Kbd>R</Kbd>
        <span>to retry</span>
        {nextScriptId ? (
          <>
            <span>·</span>
            <Kbd>N</Kbd>
            <span>for next</span>
          </>
        ) : null}
        <span>·</span>
        <Kbd>Esc</Kbd>
        <span>or</span>
        <Kbd>Q</Kbd>
        <span>to exit</span>
      </p>
    </div>
  );
}
