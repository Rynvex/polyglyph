/**
 * Landing — pick a script. The list comes from public/scripts/en/*.json
 * (read at SSR time) so adding a JSON file is the only step needed to
 * publish a new dialogue.
 */

import path from "node:path";
import { CuratedScriptsByLanguage } from "@/components/CuratedScriptsByLanguage";
import { Kbd } from "@/components/Kbd";
import { LandingKeyboardNav } from "@/components/LandingKeyboardNav";
import { NativeLangPicker } from "@/components/NativeLangPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LibrarySection } from "@/components/LibrarySection";
import {
  readAllLanguageIndexes,
  sortByLevel,
  type ScriptIndexItem,
} from "@/lib/data/script-index";

const SUPPORTED_LANGUAGES = ["en", "zh-tw", "ja", "ko", "it", "de", "es"];

export default async function Home() {
  const dialoguesRoot = path.join(process.cwd(), "public", "dialogues");
  const indexes = await readAllLanguageIndexes(dialoguesRoot, SUPPORTED_LANGUAGES);
  // Sort each language's items by CEFR level for consistency.
  const itemsByLanguage: Record<string, ScriptIndexItem[]> = Object.fromEntries(
    Object.entries(indexes).map(([lang, items]) => [lang, sortByLevel(items)]),
  );

  return (
    <>
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-12 px-6 py-16 pb-24">
      <LandingKeyboardNav />
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-[0.3em] text-accent">Polyglyph</span>
          <div className="flex items-center gap-3">
            <NativeLangPicker />
            <ThemeToggle />
          </div>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          Type your way to fluency.
        </h1>
        <p className="max-w-xl text-fg-muted">
          Real conversations, scripted lines, your keyboard. No LLM, no monthly bill — just the
          drill that actually moves the needle.
        </p>
      </header>

      <LibrarySection />

      <CuratedScriptsByLanguage itemsByLanguage={itemsByLanguage} />

    </main>
    <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-2 px-6 py-3 text-sm text-fg-faint">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        <span>or</span>
        <Kbd>j</Kbd>
        <Kbd>k</Kbd>
        <span>navigate</span>
        <span>·</span>
        <Kbd>Enter</Kbd>
        <span>play</span>
        <span>·</span>
        <Kbd>1-9</Kbd>
        <span>jump</span>
        <span>·</span>
        <Kbd>C</Kbd>
        <span>create</span>
      </div>
    </footer>
    </>
  );
}
