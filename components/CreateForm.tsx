/**
 * CreateForm — two-tab UI for converting source text to a Polyglyph
 * dialogue.
 *
 *   Tab "Paste"  — copy the prompt to clipboard, run it in your favorite
 *                  LLM (ChatGPT/Claude/whatever), paste the JSON back.
 *   Tab "Direct" — supply an OpenRouter API key and we call the LLM in
 *                  this browser. Phase 2 — see DirectGenerator.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DirectGenerator } from "@/components/DirectGenerator";
import { DialogueSchema, type Dialogue, type Level } from "@/lib/data/schema";
import { buildPrompt } from "@/lib/llm/prompt";
import { loadSource, saveSource } from "@/lib/data/sources";
import { saveUserScript } from "@/lib/data/user-scripts";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];

type Tab = "paste" | "direct";

export function CreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const incomingSourceId = searchParams.get("source");

  const [tab, setTab] = useState<Tab>("paste");
  const [level, setLevel] = useState<Level>("A2");
  const [botName, setBotName] = useState("Friend");
  const [topic, setTopic] = useState("smalltalk");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  // Track whether the source content came from an existing entry — when
  // it does, we re-use that sourceId on save instead of creating a new one.
  const [linkedSourceId, setLinkedSourceId] = useState<string | null>(null);
  const [resultJson, setResultJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewDialogue, setPreviewDialogue] = useState<Dialogue | null>(null);

  // If we landed via /create?source=<id>, pre-fill from that source.
  useEffect(() => {
    if (!incomingSourceId) return;
    const entry = loadSource(incomingSourceId);
    if (!entry) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSource(entry.content);
     
    setTitle(entry.title);
     
    setLinkedSourceId(entry.id);
  }, [incomingSourceId]);

  const promptText = buildPrompt({
    level,
    botName: botName || "Friend",
    topic: topic || "smalltalk",
    title: title || "Custom dialogue",
    source: source || "(paste your source here)",
  });

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(promptText);
  };

  const handleValidate = () => {
    setError(null);
    setPreviewDialogue(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(resultJson);
    } catch (e) {
      setError(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    const result = DialogueSchema.safeParse(parsed);
    if (!result.success) {
      const first = result.error.issues[0];
      setError(
        `Schema error at ${first.path.join(".") || "(root)"}: ${first.message}`,
      );
      return;
    }
    setPreviewDialogue(result.data);
  };

  const handleSave = (dialogue: Dialogue) => {
    // Pipeline: ensure a source entry exists, then save the dialogue as a
    // draft linked to it. User reviews + publishes from /drafts.
    let sourceId = linkedSourceId;
    if (!sourceId && source.trim()) {
      sourceId = saveSource({
        title: title.trim() || dialogue.title,
        content: source.trim(),
        kind: "paste",
      });
    }
    saveUserScript(dialogue, {
      status: "draft",
      tags: dialogue.tags ?? [],
      sourceId: sourceId ?? undefined,
    });
    router.push("/drafts");
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "Enter") {
        if (resultJson.trim()) {
          e.preventDefault();
          handleValidate();
        }
        return;
      }
      if (isMod && (e.key === "s" || e.key === "S")) {
        if (previewDialogue) {
          e.preventDefault();
          handleSave(previewDialogue);
        }
        return;
      }
      if (e.key === "Escape") {
        const target = document.activeElement as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
        e.preventDefault();
        router.push("/");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // handleValidate / handleSave are inline closures; we capture latest
    // via re-binding when their captured state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultJson, previewDialogue, router]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 border-b border-border">
        <TabButton active={tab === "paste"} onClick={() => setTab("paste")}>
          Paste flow
        </TabButton>
        <TabButton active={tab === "direct"} onClick={() => setTab("direct")}>
          Direct (OpenRouter)
        </TabButton>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Returning a damaged package"
            className="rounded-lg bg-surface px-3 py-2 ring-1 ring-border outline-none focus:ring-accent"
          />
        </Field>
        <Field label="Level">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            className="rounded-lg bg-surface px-3 py-2 ring-1 ring-border outline-none focus:ring-accent"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bot name">
          <input
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            placeholder="Barista, Doctor, Interviewer..."
            className="rounded-lg bg-surface px-3 py-2 ring-1 ring-border outline-none focus:ring-accent"
          />
        </Field>
        <Field label="Topic slug">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="ordering_food, work, travel..."
            className="rounded-lg bg-surface px-3 py-2 ring-1 ring-border outline-none focus:ring-accent"
          />
        </Field>
      </div>

      <Field label="Source material">
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          rows={10}
          placeholder="Paste an article, transcript, or notes. The LLM will pull a natural conversation out of it."
          className="rounded-lg bg-surface px-3 py-2 font-mono text-sm leading-relaxed ring-1 ring-border outline-none focus:ring-accent"
        />
      </Field>

      {tab === "paste" ? (
        <PasteFlow
          promptText={promptText}
          resultJson={resultJson}
          onResultChange={setResultJson}
          onCopyPrompt={handleCopyPrompt}
          onValidate={handleValidate}
          error={error}
          previewDialogue={previewDialogue}
          onSave={handleSave}
        />
      ) : (
        <DirectGenerator
          level={level}
          botName={botName || "Friend"}
          topic={topic || "smalltalk"}
          title={title || "Custom dialogue"}
          source={source}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-accent text-fg"
          : "border-transparent text-fg-faint hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-[0.2em] text-fg-faint">{label}</span>
      {children}
    </label>
  );
}

interface PasteFlowProps {
  promptText: string;
  resultJson: string;
  onResultChange: (v: string) => void;
  onCopyPrompt: () => void;
  onValidate: () => void;
  error: string | null;
  previewDialogue: Dialogue | null;
  onSave: (dialogue: Dialogue) => void;
}

function PasteFlow({
  promptText,
  resultJson,
  onResultChange,
  onCopyPrompt,
  onValidate,
  error,
  previewDialogue,
  onSave,
}: PasteFlowProps) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm uppercase tracking-[0.2em] text-fg-faint">
          1. Copy the prompt
        </h2>
        <div className="flex items-start gap-3">
          <pre className="max-h-60 flex-1 overflow-auto rounded-lg bg-canvas p-3 text-xs text-fg-muted ring-1 ring-border">
            {promptText}
          </pre>
          <button
            type="button"
            onClick={onCopyPrompt}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-accent-hover"
          >
            📋 Copy
          </button>
        </div>
        <p className="text-xs text-fg-faint">
          Open ChatGPT, Claude, or your favorite LLM in another tab. Paste the
          prompt as a new message and copy the JSON it sends back.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm uppercase tracking-[0.2em] text-fg-faint">
          2. Paste the JSON
        </h2>
        <textarea
          value={resultJson}
          onChange={(e) => onResultChange(e.target.value)}
          rows={8}
          placeholder="Paste the JSON the LLM produced here."
          className="rounded-lg bg-surface px-3 py-2 font-mono text-xs leading-relaxed ring-1 ring-border outline-none focus:ring-accent"
        />
        <button
          type="button"
          onClick={onValidate}
          className="self-start rounded-lg bg-success px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-success-hover disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!resultJson.trim()}
        >
          ✓ Validate
        </button>
        {error ? (
          <p
            data-testid="create-error"
            className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-error ring-1 ring-error/30"
          >
            {error}
          </p>
        ) : null}
      </section>

      {previewDialogue ? (
        <PreviewAndSave dialogue={previewDialogue} onSave={onSave} />
      ) : null}
    </>
  );
}

interface PreviewProps {
  dialogue: Dialogue;
  onSave: (d: Dialogue) => void;
}

export function PreviewAndSave({ dialogue, onSave }: PreviewProps) {
  return (
    <section
      data-testid="create-preview"
      className="flex flex-col gap-3 rounded-2xl bg-surface/60 p-5 ring-1 ring-border"
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-fg">{dialogue.title}</h2>
        <span className="text-xs uppercase tracking-[0.25em] text-success">
          Looks valid · {dialogue.level}
        </span>
      </header>
      {dialogue.description ? (
        <p className="text-sm text-fg-muted">{dialogue.description}</p>
      ) : null}
      <details className="text-sm text-fg">
        <summary className="cursor-pointer text-fg-muted">
          Preview {dialogue.turns.length} turns
        </summary>
        <ol className="mt-2 flex flex-col gap-1 text-xs text-fg-muted">
          {dialogue.turns.map((t, i) => (
            <li key={t.id}>
              <span className="text-fg-faint">
                {i + 1}.{" "}
                <span className="text-fg-faint">[{t.speaker}]</span>
              </span>{" "}
              {t.speaker === "bot" ? t.text : t.templates?.[0]?.text}
            </li>
          ))}
        </ol>
      </details>
      <button
        type="button"
        onClick={() => onSave(dialogue)}
        className="self-start rounded-lg bg-success px-5 py-2 text-sm font-medium text-white shadow transition hover:bg-success-hover"
      >
        💾 Save as draft
      </button>
      <p className="text-xs text-fg-faint">
        Saved drafts wait in /drafts for review. Publish from there to add to
        your library.
      </p>
    </section>
  );
}
