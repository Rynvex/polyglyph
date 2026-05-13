/**
 * Client wrapper around VocabScene — converts SSR-friendly entry arrays
 * back into Maps and provides the back-to-decks navigation handler.
 */

"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { VocabScene } from "@/components/VocabScene";
import type { Concept, Deck, Translation } from "@/lib/data/vocab/schema";

interface VocabPlayShellProps {
  deck: Deck;
  language: string;
  nativeLang: string | null;
  conceptEntries: ReadonlyArray<readonly [string, Concept]>;
  translationEntries: ReadonlyArray<readonly [string, Translation]>;
  nativeEntries: ReadonlyArray<readonly [string, Translation]>;
}

export function VocabPlayShell({
  deck,
  language,
  nativeLang,
  conceptEntries,
  translationEntries,
  nativeEntries,
}: VocabPlayShellProps) {
  const router = useRouter();
  const concepts = useMemo(
    () => new Map(conceptEntries.map(([k, v]) => [k, v])),
    [conceptEntries],
  );
  const translations = useMemo(
    () => new Map(translationEntries.map(([k, v]) => [k, v])),
    [translationEntries],
  );
  const nativePrompts = useMemo(
    () =>
      nativeEntries.length > 0
        ? new Map(nativeEntries.map(([k, v]) => [k, v]))
        : null,
    [nativeEntries],
  );

  return (
    <VocabScene
      deck={deck}
      language={language}
      nativeLang={nativeLang}
      concepts={concepts}
      translations={translations}
      nativePrompts={nativePrompts}
      onExit={() => router.push("/vocab")}
    />
  );
}
