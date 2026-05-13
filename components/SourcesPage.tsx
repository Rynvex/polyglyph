/**
 * SourcesPage — client island that lists saved source materials and lets
 * the user start a new dialogue from any source.
 *
 * Each source is a chunk of raw text the user pasted; clicking "Generate
 * dialogue" routes to /create with the source pre-loaded.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SourceForm } from "@/components/SourceForm";
import {
  deleteSource,
  listSources,
  type SourceEntry,
} from "@/lib/data/sources";

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function truncate(text: string, max = 220): string {
  return text.length <= max ? text : text.slice(0, max).trim() + "…";
}

export function SourcesPage() {
  const [items, setItems] = useState<SourceEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = () => setItems(listSources());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
     
    setHydrated(true);
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm("Delete this source? Existing drafts/library entries are kept.")) {
      return;
    }
    deleteSource(id);
    refresh();
  };

  return (
    <section className="flex flex-col gap-4" data-testid="sources-list">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm uppercase tracking-[0.2em] text-fg-faint">
          Sources {hydrated ? `(${items.length})` : ""}
        </h2>
      </div>

      <SourceForm onAdded={refresh} />

      {hydrated && items.length === 0 ? (
        <p className="text-sm text-fg-faint">
          No sources yet. Paste an article, transcript, or note above. You can
          re-use the same source to generate multiple dialogues at different
          levels.
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {items.map((src) => (
          <li
            key={src.id}
            className="flex flex-col gap-2 rounded-xl bg-surface/60 p-4 ring-1 ring-border"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-medium text-fg">{src.title}</span>
              <span className="text-xs text-fg-faint">
                {formatRelative(src.createdAtMs)}
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed text-fg-muted">
              {truncate(src.content)}
            </p>
            <div className="flex gap-2">
              <Link
                href={`/create?source=${src.id}`}
                className="rounded-md bg-accent/15 px-3 py-1 text-xs font-medium text-accent ring-1 ring-accent/30 transition hover:bg-accent/25"
              >
                Generate dialogue →
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(src.id)}
                className="rounded-md bg-surface-2 px-3 py-1 text-xs text-fg-muted ring-1 ring-border transition hover:bg-error/15 hover:text-error"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
