/**
 * LibrarySection — landing-page island that lists PUBLISHED user scripts,
 * with optional tag filter chips. Replaces the old UserScriptsSection.
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteUserScript,
  exportAllUserScripts,
  importUserScripts,
  listDrafts,
  listPublished,
  type UserScriptEntry,
} from "@/lib/data/user-scripts";

const LEVEL_BADGE: Record<string, string> = {
  A1: "bg-success/15 text-success",
  A2: "bg-accent/15 text-accent",
  B1: "bg-violet-500/15 text-violet-300",
  B2: "bg-warning/15 text-warning",
  C1: "bg-error/15 text-error",
};

export function LibrarySection() {
  const [items, setItems] = useState<UserScriptEntry[]>([]);
  const [draftCount, setDraftCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = () => {
    setItems(listPublished());
    setDraftCount(listDrafts().length);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
     
    setHydrated(true);
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const entry of items) {
      for (const t of entry.tags) set.add(t);
    }
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (!activeTag) return items;
    return items.filter((e) => e.tags.includes(activeTag));
  }, [items, activeTag]);

  const handleDelete = (id: string) => {
    if (!confirm("Delete this dialogue?")) return;
    deleteUserScript(id);
    refresh();
  };

  const handleExport = () => {
    const blob = exportAllUserScripts();
    const json = JSON.stringify(blob, null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `polyglyph-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage(null);
    try {
      const blob = JSON.parse(await file.text());
      const result = importUserScripts(blob);
      setImportMessage(`Imported ${result.imported}, skipped ${result.skipped}.`);
      refresh();
    } catch (err) {
      setImportMessage(`Import failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      e.target.value = "";
    }
  };

  if (!hydrated) return null;

  return (
    <section className="flex flex-col gap-3" data-testid="library-section">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm uppercase tracking-[0.2em] text-fg-faint">
          Your library {items.length > 0 ? `(${items.length})` : ""}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/vocab"
            className="rounded-md bg-success/15 px-3 py-1 text-xs font-medium text-success ring-1 ring-success/30 transition hover:bg-success/25"
          >
            Vocab
          </Link>
          <Link
            href="/sources"
            className="rounded-md bg-surface-2 px-3 py-1 text-xs text-fg ring-1 ring-border transition hover:bg-surface"
          >
            Sources
          </Link>
          <Link
            href="/drafts"
            className="rounded-md bg-warning/15 px-3 py-1 text-xs font-medium text-warning ring-1 ring-warning/30 transition hover:bg-warning/25"
          >
            Drafts {draftCount > 0 ? `(${draftCount})` : ""}
          </Link>
          <Link
            href="/create"
            className="rounded-md bg-accent/15 px-3 py-1 text-xs font-medium text-accent ring-1 ring-accent/30 transition hover:bg-accent/25"
          >
            + Create
          </Link>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={handleExport}
              className="rounded-md bg-surface-2 px-3 py-1 text-xs text-fg ring-1 ring-border transition hover:bg-surface"
            >
              Export
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleImportClick}
            className="rounded-md bg-surface-2 px-3 py-1 text-xs text-fg ring-1 ring-border transition hover:bg-surface"
          >
            Import
          </button>
        </div>
      </div>

      {allTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" data-testid="tag-chips">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-2.5 py-0.5 text-xs transition ${
              activeTag === null
                ? "bg-fg text-canvas"
                : "bg-surface-2 text-fg-muted ring-1 ring-border hover:text-fg"
            }`}
          >
            all
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTag(t)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                activeTag === t
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-fg-muted ring-1 ring-border hover:text-fg"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-fg-faint">
          No published dialogues yet. Create one in{" "}
          <Link href="/create" className="text-accent hover:underline">
            /create
          </Link>
          {" "}or import a backup.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {filtered.map((entry) => (
          <li key={entry.scriptId} className="flex items-stretch gap-2">
            <Link
              href={`/play/${entry.scriptId}`}
              data-keynav-card
              className="flex flex-1 flex-col gap-1 rounded-xl bg-surface/60 p-4 ring-1 ring-border transition hover:bg-surface hover:ring-accent"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-fg-faint">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    LEVEL_BADGE[entry.dialogue.level] ?? "bg-surface-2 text-fg-muted"
                  }`}
                >
                  {entry.dialogue.level}
                </span>
                <span>Custom</span>
                {entry.tags.map((t) => (
                  <span key={t} className="text-fg-muted">
                    #{t}
                  </span>
                ))}
              </div>
              <span className="text-base font-medium text-fg">
                {entry.dialogue.title}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(entry.scriptId)}
              aria-label="Delete"
              className="rounded-xl bg-surface/40 px-3 text-xs text-fg-faint ring-1 ring-border transition hover:bg-error/15 hover:text-error"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImportFile}
        className="hidden"
        data-testid="import-file"
      />
      {importMessage ? (
        <p className="text-xs text-fg-faint">{importMessage}</p>
      ) : null}
    </section>
  );
}
