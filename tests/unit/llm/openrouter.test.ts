import { describe, expect, test, vi } from "vitest";
import {
  clearStoredKey,
  generateDialogueViaOpenRouter,
  loadStoredKey,
  parseDialogueResponse,
  storeKey,
} from "@/lib/llm/openrouter";

const VALID_DIALOGUE = {
  schema_version: 1,
  id: "user.x.a1",
  language: "en",
  level: "A1",
  topic: "daily",
  title: "x",
  turns: [{ id: "t1", speaker: "bot", text: "Hi" }],
};

describe("parseDialogueResponse", () => {
  test("parses bare JSON", () => {
    const d = parseDialogueResponse(JSON.stringify(VALID_DIALOGUE));
    expect(d.id).toBe("user.x.a1");
  });

  test("strips markdown fences", () => {
    const wrapped = "```json\n" + JSON.stringify(VALID_DIALOGUE) + "\n```";
    const d = parseDialogueResponse(wrapped);
    expect(d.id).toBe("user.x.a1");
  });

  test("strips prose around the JSON", () => {
    const wrapped = `Sure! Here's the JSON:\n\n${JSON.stringify(VALID_DIALOGUE)}\n\nLet me know if anything looks off.`;
    const d = parseDialogueResponse(wrapped);
    expect(d.id).toBe("user.x.a1");
  });

  test("throws on totally invalid JSON", () => {
    expect(() => parseDialogueResponse("not json at all")).toThrow();
  });

  test("throws on schema-violating JSON", () => {
    const bad = JSON.stringify({ ...VALID_DIALOGUE, level: "Z9" });
    expect(() => parseDialogueResponse(bad)).toThrow();
  });
});

describe("generateDialogueViaOpenRouter", () => {
  test("hits the OpenRouter endpoint with the user's key", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(VALID_DIALOGUE) } }],
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;
    const d = await generateDialogueViaOpenRouter(
      {
        apiKey: "sk-test-key",
        model: "anthropic/claude-3.5-sonnet",
        userPrompt: "build a dialogue",
      },
      fetcher,
    );
    expect(d.id).toBe("user.x.a1");
    const call = (fetcher as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(call[0]).toContain("openrouter.ai");
    const init = call[1] as RequestInit;
    expect(init.headers).toMatchObject({
      Authorization: "Bearer sk-test-key",
    });
  });

  test("propagates API errors with body", async () => {
    const fetcher = vi.fn(async () =>
      new Response("invalid api key", { status: 401 }),
    ) as unknown as typeof fetch;
    await expect(
      generateDialogueViaOpenRouter(
        { apiKey: "x", model: "x", userPrompt: "x" },
        fetcher,
      ),
    ).rejects.toThrow(/401/);
  });

  test("rejects responses with no content", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [] }), { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(
      generateDialogueViaOpenRouter(
        { apiKey: "x", model: "x", userPrompt: "x" },
        fetcher,
      ),
    ).rejects.toThrow();
  });
});

describe("key storage", () => {
  test("store / load round-trip", () => {
    const map = new Map<string, string>();
    const fakeStorage: Storage = {
      get length() {
        return map.size;
      },
      clear: () => map.clear(),
      getItem: (k) => map.get(k) ?? null,
      key: (i) => Array.from(map.keys())[i] ?? null,
      removeItem: (k) => {
        map.delete(k);
      },
      setItem: (k, v) => {
        map.set(k, v);
      },
    };
    storeKey("sk-abc", fakeStorage);
    expect(loadStoredKey(fakeStorage)).toBe("sk-abc");
    clearStoredKey(fakeStorage);
    expect(loadStoredKey(fakeStorage)).toBeNull();
  });

  test("returns null when storage is null (SSR)", () => {
    expect(loadStoredKey(null)).toBeNull();
  });
});
