/**
 * DirectGenerator — BYOK OpenRouter integration for the /create page.
 *
 * The user supplies their own OpenRouter API key (stored in localStorage,
 * never sent to our server). We POST directly from the browser to
 * https://openrouter.ai with the prompt; on success we hand the validated
 * Dialogue back to the parent for save+navigate.
 */

"use client";

import { useEffect, useState } from "react";
import { PreviewAndSave } from "@/components/CreateForm";
import type { Dialogue, Level } from "@/lib/data/schema";
import {
  clearStoredKey,
  generateDialogueViaOpenRouter,
  loadStoredKey,
  storeKey,
} from "@/lib/llm/openrouter";
import { buildPrompt } from "@/lib/llm/prompt";

interface DirectGeneratorProps {
  level: Level;
  botName: string;
  topic: string;
  title: string;
  source: string;
  onSave: (d: Dialogue) => void;
}

const MODEL_OPTIONS: { id: string; label: string; hint: string }[] = [
  {
    id: "anthropic/claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    hint: "Strong, balanced",
  },
  {
    id: "anthropic/claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    hint: "Fast & cheap",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o mini",
    hint: "Cheap fallback",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    hint: "Fast",
  },
];

export function DirectGenerator({
  level,
  botName,
  topic,
  title,
  source,
  onSave,
}: DirectGeneratorProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(MODEL_OPTIONS[0].id);
  const [keySaved, setKeySaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDialogue, setPreviewDialogue] = useState<Dialogue | null>(null);

  // Load saved key on mount.
  useEffect(() => {
    const stored = loadStoredKey();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setApiKey(stored);
       
      setKeySaved(true);
    }
  }, []);

  const handleSaveKey = () => {
    storeKey(apiKey);
    setKeySaved(true);
  };

  const handleClearKey = () => {
    clearStoredKey();
    setApiKey("");
    setKeySaved(false);
  };

  const handleGenerate = async () => {
    setError(null);
    setPreviewDialogue(null);
    setGenerating(true);
    try {
      const prompt = buildPrompt({ level, botName, topic, title, source });
      const dialogue = await generateDialogueViaOpenRouter({
        apiKey,
        model,
        userPrompt: prompt,
      });
      setPreviewDialogue(dialogue);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = apiKey.trim().length > 0 && source.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2 rounded-2xl bg-warning/5 p-4 ring-1 ring-warning/20">
        <h2 className="text-xs uppercase tracking-[0.2em] text-warning">
          Bring-your-own-key
        </h2>
        <p className="text-xs text-fg-muted">
          Your OpenRouter API key lives in this browser&apos;s localStorage.
          It&apos;s never sent to us. Get one at{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            openrouter.ai/keys
          </a>
          . Costs go to your account.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setKeySaved(false);
            }}
            placeholder="sk-or-v1-..."
            className="flex-1 rounded-lg bg-surface px-3 py-2 font-mono text-xs ring-1 ring-border outline-none focus:ring-accent"
          />
          {keySaved ? (
            <button
              type="button"
              onClick={handleClearKey}
              className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-fg ring-1 ring-border-strong hover:bg-surface-2"
            >
              Forget key
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveKey}
              disabled={!apiKey.trim()}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white shadow transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save key
            </button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.2em] text-fg-faint">
            Model
          </span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-lg bg-surface px-3 py-2 ring-1 ring-border outline-none focus:ring-accent"
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.hint}
              </option>
            ))}
          </select>
        </label>
      </section>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate || generating}
        className="self-start rounded-lg bg-success px-5 py-2.5 text-sm font-medium text-white shadow transition hover:bg-success-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {generating ? "Generating..." : "✨ Generate"}
      </button>

      {error ? (
        <p
          data-testid="direct-error"
          className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-error ring-1 ring-error/30"
        >
          {error}
        </p>
      ) : null}

      {previewDialogue ? (
        <PreviewAndSave dialogue={previewDialogue} onSave={onSave} />
      ) : null}
    </div>
  );
}
