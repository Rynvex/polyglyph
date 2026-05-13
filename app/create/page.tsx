/**
 * /create — entry point for building a custom dialogue from arbitrary
 * source text. Two paths: copy-paste (works with any external LLM) and
 * direct OpenRouter generation (BYOK).
 */

import Link from "next/link";
import { Suspense } from "react";
import { CreateForm } from "@/components/CreateForm";
import { Kbd } from "@/components/Kbd";

export default function CreatePage() {
  return (
    <>
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10 pb-24 text-fg">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm text-fg-muted transition hover:text-fg">
            ← Back to scripts
          </Link>
          <span className="text-xs uppercase tracking-[0.3em] text-accent">Create</span>
        </header>
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-fg">
            Make a custom dialogue
          </h1>
          <p className="text-sm text-fg-muted">
            Paste any source — an article, a podcast transcript, a conversation
            you remember — and an LLM will turn it into a typing-practice
            dialogue scoped to the level you want.
          </p>
        </section>
        {/* useSearchParams in CreateForm requires a Suspense boundary
            during static generation. */}
        <Suspense
          fallback={<div className="text-sm text-fg-faint">Loading…</div>}
        >
          <CreateForm />
        </Suspense>
      </main>
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-2 px-6 py-3 text-sm text-fg-faint">
          <span>
            <Kbd>Cmd</Kbd>
            <span className="mx-1">+</span>
            <Kbd>Enter</Kbd>
          </span>
          <span>validate</span>
          <span>·</span>
          <span>
            <Kbd>Cmd</Kbd>
            <span className="mx-1">+</span>
            <Kbd>S</Kbd>
          </span>
          <span>save & play</span>
          <span>·</span>
          <Kbd>Esc</Kbd>
          <span>back</span>
        </div>
      </footer>
    </>
  );
}
