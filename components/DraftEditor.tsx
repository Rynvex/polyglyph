/**
 * DraftEditor — inline-editable preview of a draft dialogue, surfaced on
 * /drafts. Lets the user fix a turn's text or hint_zh before publishing
 * without leaving the page.
 */

"use client";

import { useState } from "react";
import type { Dialogue, Turn, Template } from "@/lib/data/schema";
import { DialogueSchema } from "@/lib/data/schema";

interface DraftEditorProps {
  dialogue: Dialogue;
  onChange: (next: Dialogue) => void;
}

export function DraftEditor({ dialogue, onChange }: DraftEditorProps) {
  const [tagsInput, setTagsInput] = useState((dialogue.tags ?? []).join(", "));

  const updateTurnText = (turnIdx: number, value: string) => {
    const next: Dialogue = {
      ...dialogue,
      turns: dialogue.turns.map((t, i) =>
        i === turnIdx ? ({ ...t, text: value } as Turn) : t,
      ),
    };
    const parsed = DialogueSchema.safeParse(next);
    if (parsed.success) onChange(parsed.data);
  };

  const updateTemplateText = (turnIdx: number, value: string) => {
    const next: Dialogue = {
      ...dialogue,
      turns: dialogue.turns.map((t, i) => {
        if (i !== turnIdx || !t.templates) return t;
        return {
          ...t,
          templates: [
            { ...t.templates[0], text: value } as Template,
            ...t.templates.slice(1),
          ],
        };
      }),
    };
    const parsed = DialogueSchema.safeParse(next);
    if (parsed.success) onChange(parsed.data);
  };

  const updateTemplateHint = (turnIdx: number, value: string) => {
    const next: Dialogue = {
      ...dialogue,
      turns: dialogue.turns.map((t, i) => {
        if (i !== turnIdx || !t.templates) return t;
        return {
          ...t,
          templates: [
            { ...t.templates[0], hint_zh: value } as Template,
            ...t.templates.slice(1),
          ],
        };
      }),
    };
    const parsed = DialogueSchema.safeParse(next);
    if (parsed.success) onChange(parsed.data);
  };

  const updateTitle = (value: string) => {
    const next: Dialogue = { ...dialogue, title: value };
    const parsed = DialogueSchema.safeParse(next);
    if (parsed.success) onChange(parsed.data);
  };

  const commitTags = () => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    onChange({ ...dialogue, tags });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-fg-faint">Title</span>
        <input
          value={dialogue.title}
          onChange={(e) => updateTitle(e.target.value)}
          className="rounded-lg bg-canvas px-3 py-2 text-base ring-1 ring-border outline-none focus:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-fg-faint">
          Tags (comma-separated)
        </span>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          onBlur={commitTags}
          placeholder="work, interview, casual"
          className="rounded-lg bg-canvas px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-accent"
        />
      </div>

      <ol className="flex flex-col gap-2" data-testid="draft-turns">
        {dialogue.turns.map((turn, i) => (
          <li
            key={turn.id}
            data-testid="draft-turn"
            className="flex flex-col gap-1 rounded-lg bg-surface/60 p-3 ring-1 ring-border"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-fg-faint">
              Turn {i + 1} · {turn.speaker}
            </span>
            {turn.speaker === "bot" ? (
              <textarea
                value={turn.text ?? ""}
                onChange={(e) => updateTurnText(i, e.target.value)}
                rows={2}
                className="rounded-md bg-canvas px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-accent"
              />
            ) : (
              <>
                <textarea
                  value={turn.templates?.[0]?.text ?? ""}
                  onChange={(e) => updateTemplateText(i, e.target.value)}
                  rows={2}
                  className="rounded-md bg-canvas px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-accent"
                />
                <input
                  value={turn.templates?.[0]?.hint_zh ?? ""}
                  onChange={(e) => updateTemplateHint(i, e.target.value)}
                  placeholder="hint_zh"
                  className="rounded-md bg-canvas px-3 py-1.5 text-xs ring-1 ring-border outline-none focus:ring-accent"
                />
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
