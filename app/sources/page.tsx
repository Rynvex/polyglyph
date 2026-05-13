import Link from "next/link";
import { Kbd } from "@/components/Kbd";
import { SourcesPage } from "@/components/SourcesPage";

export default function Sources() {
  return (
    <>
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10 pb-24 text-fg">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm text-fg-muted transition hover:text-fg">
            ← Back to scripts
          </Link>
          <span className="text-xs uppercase tracking-[0.3em] text-accent">Sources</span>
        </header>
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-fg">
            Source materials
          </h1>
          <p className="text-sm text-fg-muted">
            Reusable raw text — articles, transcripts, conversation notes. Save
            once, generate as many dialogues as you want from the same source.
          </p>
        </section>
        <SourcesPage />
      </main>
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-2 px-6 py-3 text-sm text-fg-faint">
          <Kbd>Esc</Kbd>
          <span>back</span>
        </div>
      </footer>
    </>
  );
}
