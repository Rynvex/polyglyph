/**
 * TDD spec for the dialogue JSON loader.
 *
 * Browser-side: fetches a public/scripts/<lang>/<id>.json URL and validates
 * via zod. Tests stub global.fetch so we can drive the network surface.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { loadDialogue, loadDialogueFromUrl } from "@/lib/data/loader";

const minimalValid = {
  schema_version: 1,
  id: "en.test.a1",
  language: "en",
  level: "A1",
  topic: "daily",
  title: "Test",
  turns: [{ id: "t1", speaker: "bot", text: "Hi" }],
};

describe("loadDialogue (already-parsed JSON)", () => {
  test("happy path returns typed Dialogue", () => {
    const d = loadDialogue(minimalValid);
    expect(d.id).toBe("en.test.a1");
    expect(d.turns[0].text).toBe("Hi");
  });

  test("invalid shape throws ZodError-like", () => {
    expect(() => loadDialogue({ ...minimalValid, level: "Z9" })).toThrow();
  });
});

describe("loadDialogueFromUrl (fetch)", () => {
  let realFetch: typeof globalThis.fetch;

  beforeEach(() => {
    realFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("fetches the URL and validates", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(minimalValid), { status: 200 }),
    ) as unknown as typeof globalThis.fetch;

    const d = await loadDialogueFromUrl("/scripts/en/test.json");
    expect(d.id).toBe("en.test.a1");
  });

  test("rejects on non-OK response", async () => {
    globalThis.fetch = vi.fn(async () => new Response("not found", { status: 404 })) as unknown as typeof globalThis.fetch;
    await expect(loadDialogueFromUrl("/scripts/en/missing.json")).rejects.toThrow(/404|fetch/i);
  });

  test("rejects on invalid JSON", async () => {
    globalThis.fetch = vi.fn(async () => new Response("{not json", { status: 200 })) as unknown as typeof globalThis.fetch;
    await expect(loadDialogueFromUrl("/scripts/en/junk.json")).rejects.toThrow();
  });

  test("rejects on bad schema", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ...minimalValid, level: "Z9" }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch;
    await expect(loadDialogueFromUrl("/scripts/en/bad.json")).rejects.toThrow();
  });
});
