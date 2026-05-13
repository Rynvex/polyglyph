/**
 * Play page — load a Dialogue by composing a blueprint with the requested
 * language's translation, then mount the play shell. Top-level layout is
 * `h-[100dvh] flex-col` so the chat scroll region can take all remaining
 * space and the typing panel can stick to the bottom of the viewport
 * without the whole page scrolling.
 */

import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Kbd } from "@/components/Kbd";
import { PlayShell } from "@/components/PlayShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { loadComposedDialogue } from "@/lib/data/dialogues/loader";
import { readScriptIndex } from "@/lib/data/script-index";
import type { Dialogue } from "@/lib/data/schema";

interface PlayPageProps {
  params: Promise<{ scriptId: string }>;
  searchParams: Promise<{ lang?: string }>;
}

const DEFAULT_LANGUAGE = "en";

async function pickNextScript(
  currentScriptId: string,
  language: string,
): Promise<string | null> {
  const dialoguesRoot = path.join(process.cwd(), "public", "dialogues");
  const items = await readScriptIndex(dialoguesRoot, language);
  const others = items.filter((s) => s.scriptId !== currentScriptId);
  if (others.length === 0) return null;
  const idx = Math.floor(Math.random() * others.length);
  return others[idx].scriptId;
}

export default async function PlayPage({ params, searchParams }: PlayPageProps) {
  const { scriptId } = await params;
  const { lang } = await searchParams;
  const language = lang ?? DEFAULT_LANGUAGE;

  // User-generated scripts (id starts with "user-") render fully client-side.
  if (scriptId.startsWith("user-")) {
    return (
      <main className="flex h-[calc(100dvh-2.5rem)] flex-col bg-gradient-to-b from-canvas via-canvas to-accent/5 text-fg">
        <PlayShell scriptId={scriptId} dialogue={null} nextScriptId={null} language={null} />
      </main>
    );
  }

  let dialogue: Dialogue | null = null;
  try {
    dialogue = await loadComposedDialogue(scriptId, language);
  } catch {
    dialogue = null;
  }
  if (!dialogue) notFound();
  const nextScriptId = await pickNextScript(scriptId, dialogue.language);

  return (
    <main className="flex h-[calc(100dvh-2.5rem)] flex-col bg-gradient-to-b from-canvas via-canvas to-accent/5 text-fg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="text-fg-muted transition hover:text-fg"
            aria-label="Back to scripts"
          >
            ←
          </Link>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-medium text-fg">
              {dialogue.characters?.bot?.name ?? dialogue.title}
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-fg-faint">
              {dialogue.language.toUpperCase()} · {dialogue.level} · {dialogue.title}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <PlayShell
        dialogue={dialogue}
        scriptId={scriptId}
        nextScriptId={nextScriptId}
        language={dialogue.language}
      />
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-xs text-fg-faint">
        <span>Type</span>
        <span>·</span>
        <Kbd>Enter</Kbd>
        <span>when done</span>
        <span>·</span>
        <Kbd>Backspace</Kbd>
        <span>to fix</span>
        <span>·</span>
        <span>
          <Kbd>Alt</Kbd>
          <span className="mx-1">+</span>
          <Kbd>R</Kbd>
        </span>
        <span>retry line</span>
        <span>·</span>
        <Kbd>Esc</Kbd>
        <span>exit</span>
      </p>
    </main>
  );
}
