/**
 * OpenRouter direct-generation client (BYOK, browser-side).
 *
 * Calls https://openrouter.ai/api/v1/chat/completions with the user-supplied
 * key. We don't proxy through any server — the key never leaves the
 * browser. The user provides it; the user owns the cost.
 *
 * The model is constrained to `response_format: json_object` so OpenRouter
 * forwards a JSON-mode hint where supported.
 */

import { DialogueSchema, type Dialogue } from "@/lib/data/schema";

export interface OpenRouterOptions {
  apiKey: string;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  signal?: AbortSignal;
}

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

interface ChatResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: { message?: string };
}

export class OpenRouterError extends Error {}

export async function generateDialogueViaOpenRouter(
  opts: OpenRouterOptions,
  fetcher: typeof fetch = fetch,
): Promise<Dialogue> {
  const res = await fetcher(ENDPOINT, {
    method: "POST",
    signal: opts.signal,
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
      "X-Title": "Polyglyph",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        ...(opts.systemPrompt
          ? [{ role: "system", content: opts.systemPrompt }]
          : []),
        { role: "user", content: opts.userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new OpenRouterError(`OpenRouter ${res.status}: ${text}`);
  }
  const data = (await res.json()) as ChatResponse;
  if (data.error) {
    throw new OpenRouterError(data.error.message ?? "OpenRouter returned an error");
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenRouterError("OpenRouter returned no content");
  }
  return parseDialogueResponse(content);
}

/**
 * Robustly extract a Dialogue from a model response. Some models wrap JSON
 * in markdown fences or add stray prose; we strip those before parsing.
 */
export function parseDialogueResponse(raw: string): Dialogue {
  const trimmed = raw.trim();
  // Strip leading ``` fences (with or without language tag).
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  // Slice from first `{` to last `}` if there's surrounding noise.
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  const body = start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (e) {
    throw new OpenRouterError(
      `LLM response was not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return DialogueSchema.parse(parsed);
}

const KEY_STORAGE = "polyglyph:openrouter-key";

export function loadStoredKey(storage: Storage | null = browserStorage()): string | null {
  if (!storage) return null;
  return storage.getItem(KEY_STORAGE);
}

export function storeKey(
  key: string,
  storage: Storage | null = browserStorage(),
): void {
  if (!storage) return;
  storage.setItem(KEY_STORAGE, key);
}

export function clearStoredKey(
  storage: Storage | null = browserStorage(),
): void {
  if (!storage) return;
  storage.removeItem(KEY_STORAGE);
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
