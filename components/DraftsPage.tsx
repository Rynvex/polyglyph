/**
 * DraftsPage — review queue for LLM-generated dialogues awaiting publish.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DraftEditor } from "@/components/DraftEditor";
import {
  deleteUserScript,
  listDrafts,
  publishDraft,
  updateUserScript,
  type UserScriptEntry,
} from "@/lib/data/user-scripts";
import type { Dialogue } from "@/lib/data/schema";

function LevelBadge({ level }: { level: string }) {
  const cls: Record<string, string> = {
    A1: "bg-success/15 text-success",
    A2: "bg-accent/15 text-accent",
    B1: "bg-violet-500/15 text-violet-300",
    B2: "bg-warning/15 text-warning",
    C1: "bg-error/15 text-error",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        cls[level] ?? "bg-surface-2 text-fg-muted"
      }`}
    >
      {level}
    </span>
  );
}

export function DraftsPage() {
  const [items, setItems] = useState<UserScriptEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = () => setItems(listDrafts());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
     
    setHydrated(true);
  }, []);

  const handleDialogueChange = (id: string, dialogue: Dialogue) => {
    updateUserScript(id, { dialogue, tags: dialogue.tags ?? [] });
    refresh();
  };

  const handlePublish = (id: string) => {
    publishDraft(id);
    refresh();
    setOpenId(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this draft?")) return;
    deleteUserScript(id);
    refresh();
    if (openId === id) setOpenId(null);
  };

  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-3" data-testid="drafts-empty">
        <h2 className="text-sm uppercase tracking-[0.2em] text-fg-faint">Drafts</h2>
        <p className="text-sm text-fg-faint">
          No drafts yet. Generated dialogues from{" "}
          <Link href="/create" className="text-accent hover:underline">
            /create
          </Link>{" "}
          land here for review before publishing to your library.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4" data-testid="drafts-list">
      <h2 className="text-sm uppercase tracking-[0.2em] text-fg-faint">
        Drafts ({items.length})
      </h2>
      <ul className="flex flex-col gap-3">
        {items.map((entry) => {
          const isOpen = openId === entry.scriptId;
          return (
            <li
              key={entry.scriptId}
              className="flex flex-col gap-3 rounded-2xl bg-surface/60 p-4 ring-1 ring-border"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <LevelBadge level={entry.dialogue.level} />
                  <span className="text-base font-medium text-fg">
                    {entry.dialogue.title}
                  </span>
                  <span className="text-xs text-fg-faint">
                    {entry.dialogue.turns.length} turns
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : entry.scriptId)}
                    className="rounded-md bg-surface-2 px-3 py-1 text-xs text-fg ring-1 ring-border transition hover:bg-surface"
                  >
                    {isOpen ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePublish(entry.scriptId)}
                    className="rounded-md bg-success px-3 py-1 text-xs font-medium text-white shadow transition hover:bg-success-hover"
                    data-testid="publish-button"
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.scriptId)}
                    className="rounded-md bg-surface-2 px-3 py-1 text-xs text-fg-muted ring-1 ring-border transition hover:bg-error/15 hover:text-error"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {isOpen ? (
                <DraftEditor
                  dialogue={entry.dialogue}
                  onChange={(d) => handleDialogueChange(entry.scriptId, d)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
