/**
 * Vocab landing — pick a deck + target language. Decks come from
 * public/decks/*.json (read at SSR time); supported languages come from
 * public/concepts/translations/*.json.
 */

import Link from "next/link";
import { Kbd } from "@/components/Kbd";
import { ThemeToggle } from "@/components/ThemeToggle";
import { listDecks, listSupportedLanguages } from "@/lib/data/vocab/loader";
import { VocabLanding } from "@/components/VocabLanding";

export default async function VocabHome() {
  const decks = await listDecks();
  const languages = await listSupportedLanguages();
  return (
    <>
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12 pb-24 text-fg">
        <header className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.3em] text-accent">
              Polyglyph · Vocab
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              Drill words by deck
            </h1>
            <p className="text-sm text-fg-muted">
              Pick a target language and a deck. Each card is one short typing
              sprint.
            </p>
          </div>
          <ThemeToggle />
        </header>
        <VocabLanding decks={decks} languages={languages} />
        <p className="text-sm text-fg-muted">
          <Link href="/" className="text-accent hover:underline">
            ← Back to dialogues
          </Link>
        </p>
      </main>
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-2 px-6 py-3 text-sm text-fg-faint">
          <Kbd>1-9</Kbd>
          <span>jump deck</span>
          <span>·</span>
          <Kbd>L</Kbd>
          <span>cycle language</span>
          <span>·</span>
          <Kbd>Esc</Kbd>
          <span>back</span>
        </div>
      </footer>
    </>
  );
}
