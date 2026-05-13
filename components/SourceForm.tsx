/**
 * SourceForm — small inline form for adding a paste source. Sits at the
 * top of /sources. v0.4 only supports paste; URL fetch lands in v0.7.
 */

"use client";

import { useState } from "react";
import { saveSource } from "@/lib/data/sources";

interface SourceFormProps {
  onAdded: (id: string) => void;
}

export function SourceForm({ onAdded }: SourceFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);

  const submit = () => {
    if (!content.trim()) return;
    const id = saveSource({
      title: title.trim() || "Untitled source",
      content: content.trim(),
      kind: "paste",
    });
    setTitle("");
    setContent("");
    setOpen(false);
    onAdded(id);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-md bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent ring-1 ring-accent/30 transition hover:bg-accent/25"
      >
        + Add source
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="rounded-lg bg-canvas px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-accent"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste an article, transcript, or notes…"
        rows={8}
        className="rounded-lg bg-canvas px-3 py-2 font-mono text-xs leading-relaxed ring-1 ring-border outline-none focus:ring-accent"
      />
      <div className="flex gap-2 self-end">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle("");
            setContent("");
          }}
          className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-fg-muted ring-1 ring-border transition hover:bg-surface"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!content.trim()}
          className="rounded-lg bg-success px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-success-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
