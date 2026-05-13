/**
 * Vocab play page — load deck + concepts + translations server-side and
 * mount VocabScene. Layout mirrors /play: 100dvh flex column so the
 * typing panel sticks to the bottom.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { Kbd } from "@/components/Kbd";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VocabPlayShell } from "@/components/VocabPlayShell";
import {
  loadConcepts,
  loadDeck,
  loadTranslations,
} from "@/lib/data/vocab/loader";

interface VocabPlayPageProps {
  params: Promise<{ language: string; deckId: string }>;
  searchParams: Promise<{ from?: string }>;
}

const LANG_RE = /^[a-z0-9_-]+$/i;

export default async function VocabPlayPage({
  params,
  searchParams,
}: VocabPlayPageProps) {
  const { language, deckId } = await params;
  const { from } = await searchParams;
  if (!LANG_RE.test(language)) notFound();
  const nativeLang = from && LANG_RE.test(from) ? from : null;

  const deck = await loadDeck(deckId);
  if (!deck) notFound();

  let translations;
  try {
    translations = await loadTranslations(language);
  } catch {
    notFound();
  }
  const concepts = await loadConcepts();

  // Native translations are best-effort: if the requested native language
  // doesn't have a file, just fall back to no native cue rather than 404.
  let nativeTranslations: Awaited<ReturnType<typeof loadTranslations>> = [];
  if (nativeLang && nativeLang !== language) {
    try {
      nativeTranslations = await loadTranslations(nativeLang);
    } catch {
      nativeTranslations = [];
    }
  }

  const conceptEntries = concepts.map((c) => [c.id, c] as const);
  const translationEntries = translations.map((t) => [t.conceptId, t] as const);
  const nativeEntries = nativeTranslations.map(
    (t) => [t.conceptId, t] as const,
  );

  return (
    <main className="flex h-[calc(100dvh-2.5rem)] flex-col bg-gradient-to-b from-canvas via-canvas to-accent/5 text-fg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/vocab"
            className="text-fg-muted transition hover:text-fg"
            aria-label="Back to decks"
          >
            ←
          </Link>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-medium text-fg">{deck.title}</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-fg-faint">
              VOCAB · {language.toUpperCase()} · {deck.cefr}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <VocabPlayShell
        deck={deck}
        language={language}
        nativeLang={nativeLang}
        conceptEntries={conceptEntries}
        translationEntries={translationEntries}
        nativeEntries={nativeEntries}
      />
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-xs text-fg-faint">
        <span>Type</span>
        <span>·</span>
        <Kbd>Enter</Kbd>
        <span>next card</span>
        <span>·</span>
        <Kbd>Backspace</Kbd>
        <span>fix</span>
        <span>·</span>
        <span>
          <Kbd>Alt</Kbd>
          <span className="mx-1">+</span>
          <Kbd>R</Kbd>
        </span>
        <span>retry card</span>
        <span>·</span>
        <Kbd>Esc</Kbd>
        <span>exit</span>
      </p>
    </main>
  );
}
