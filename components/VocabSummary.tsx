/**
 * VocabSummary — end-of-deck settlement screen. Mastery breakdown
 * (perfect/flagged) plus typing stats and play-again CTA.
 */

"use client";

import Link from "next/link";
import type { CompletedCard } from "@/lib/vocab/controller";
import { CharState } from "@/lib/typing/engine";

interface VocabSummaryProps {
  deckTitle: string;
  language: string;
  completed: readonly CompletedCard[];
  perfect: number;
  flagged: number;
  durationSec: number;
  onPlayAgain: () => void;
}

export function VocabSummary({
  deckTitle,
  language,
  completed,
  perfect,
  flagged,
  durationSec,
  onPlayAgain,
}: VocabSummaryProps) {
  const total = completed.length;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.3em] text-accent">
          Vocab · {language}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">{deckTitle}</h1>
        <p className="text-sm text-fg-muted">
          {total} cards · {Math.round(durationSec)}s
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Perfect" value={perfect} tone="success" />
        <Stat label="Flagged" value={flagged} tone="warning" />
        <Stat label="Total" value={total} tone="muted" />
      </section>

      {flagged > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm uppercase tracking-[0.2em] text-fg-faint">
            Worth re-drilling
          </h2>
          <ul className="flex flex-wrap gap-2">
            {completed
              .filter((c) => c.cells.some((cell) => cell.state === CharState.Wrong))
              .map((c) => (
                <li
                  key={c.card.concept.id}
                  className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-1.5 text-sm text-warning ring-1 ring-warning/30"
                >
                  <span aria-hidden>{c.card.concept.emoji ?? "·"}</span>
                  <span>{c.card.translation.text}</span>
                  <span className="text-xs text-fg-faint">{c.card.concept.id}</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPlayAgain}
          className="rounded-md bg-accent/15 px-4 py-2 text-sm font-medium text-accent ring-1 ring-accent/30 transition hover:bg-accent/25"
        >
          ↻ Play again (R)
        </button>
        <Link
          href="/vocab"
          className="rounded-md bg-surface-2 px-4 py-2 text-sm text-fg ring-1 ring-border transition hover:bg-surface"
        >
          ← Back to decks
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-fg";
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface/60 px-4 py-3 ring-1 ring-border">
      <span className="text-xs uppercase tracking-[0.2em] text-fg-faint">{label}</span>
      <span className={`text-2xl font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}
