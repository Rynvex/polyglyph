/**
 * PlayShell — client wrapper that owns router-driven onExit + handles
 * user-generated scripts (loaded from localStorage on mount).
 *
 * For preset scripts the parent page renders the sticky header itself and
 * passes `dialogue` down. For user scripts the parent passes
 * `dialogue={null}`; we hydrate from localStorage and render our own
 * matching header so the layout stays consistent.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DialogueScene } from "@/components/DialogueScene";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Dialogue } from "@/lib/data/schema";
import { listUserScripts, loadUserScript } from "@/lib/data/user-scripts";

interface PlayShellProps {
  dialogue: Dialogue | null;
  scriptId: string;
  nextScriptId: string | null;
  language: string | null;
}

export function PlayShell({ dialogue, scriptId, nextScriptId, language }: PlayShellProps) {
  const router = useRouter();
  const onExit = useCallback(() => {
    router.push("/");
  }, [router]);
  const onNavigateToNext = useCallback(
    (nextId: string) => {
      const suffix = language ? `?lang=${encodeURIComponent(language)}` : "";
      router.push(`/play/${nextId}${suffix}`);
    },
    [router, language],
  );

  // SSR-resolved preset path.
  if (dialogue) {
    return (
      <DialogueScene
        dialogue={dialogue}
        scriptId={scriptId}
        onExit={onExit}
        nextScriptId={nextScriptId}
        onNavigateToNext={onNavigateToNext}
      />
    );
  }

  // User-script path: hydrate from localStorage, then render header + scene.
  return (
    <UserScriptShell
      scriptId={scriptId}
      onExit={onExit}
      onNavigateToNext={onNavigateToNext}
    />
  );
}

interface UserScriptShellProps {
  scriptId: string;
  onExit: () => void;
  onNavigateToNext: (id: string) => void;
}

function UserScriptShell({ scriptId, onExit, onNavigateToNext }: UserScriptShellProps) {
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [missing, setMissing] = useState(false);
  const [nextScriptId, setNextScriptId] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadUserScript(scriptId);
    if (!loaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMissing(true);
      return;
    }
     
    setDialogue(loaded);
    const others = listUserScripts().filter((e) => e.scriptId !== scriptId);
    if (others.length > 0) {
      const pick = others[Math.floor(Math.random() * others.length)];
       
      setNextScriptId(pick.scriptId);
    }
  }, [scriptId]);

  if (missing) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
        <p className="text-fg">
          We couldn&apos;t find that custom dialogue in this browser.
        </p>
        <p className="text-xs text-fg-faint">
          Custom dialogues live in localStorage. They don&apos;t survive across browsers
          or after clearing site data — import a backup or create a new one.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-surface-2 px-4 py-2 text-sm text-fg ring-1 ring-border-strong transition hover:bg-surface"
        >
          ← Back
        </Link>
      </div>
    );
  }
  if (!dialogue) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-fg-faint">
        Loading custom dialogue…
      </div>
    );
  }

  return (
    <>
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
              CUSTOM · {dialogue.level} · {dialogue.title}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <DialogueScene
        dialogue={dialogue}
        scriptId={scriptId}
        onExit={onExit}
        nextScriptId={nextScriptId}
        onNavigateToNext={onNavigateToNext}
      />
    </>
  );
}
