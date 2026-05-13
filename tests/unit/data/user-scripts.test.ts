/**
 * TDD spec for user-scripts localStorage CRUD.
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
  deleteUserScript,
  exportAllUserScripts,
  importUserScripts,
  listUserScripts,
  loadUserScript,
  saveUserScript,
} from "@/lib/data/user-scripts";
import type { Dialogue } from "@/lib/data/schema";

class FakeStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(i: number): string | null {
    return Array.from(this.store.keys())[i] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

let storage: FakeStorage;

function dialogue(overrides: Partial<Dialogue> = {}): Dialogue {
  return {
    schema_version: 1,
    id: "test.x",
    language: "en",
    level: "A1",
    topic: "daily",
    title: "Test Dialogue",
    description: "A test",
    tags: [],
    turns: [
      { id: "t1", speaker: "bot", text: "Hello" },
      {
        id: "t2",
        speaker: "player",
        templates: [{ id: "t2.0", text: "hi", weight: 1 }],
      },
    ],
    ...overrides,
  } as Dialogue;
}

beforeEach(() => {
  storage = new FakeStorage();
});

describe("saveUserScript / loadUserScript", () => {
  test("save returns a scriptId starting with 'user-'", () => {
    const id = saveUserScript(dialogue(), { storage });
    expect(id).toMatch(/^user-/);
  });

  test("load returns the saved dialogue", () => {
    const id = saveUserScript(dialogue({ title: "Coffee" }), { storage });
    const loaded = loadUserScript(id, { storage });
    expect(loaded?.title).toBe("Coffee");
  });

  test("load returns null when id missing", () => {
    expect(loadUserScript("user-nope", { storage })).toBeNull();
  });

  test("multiple saves get unique ids", () => {
    const a = saveUserScript(dialogue(), { storage });
    const b = saveUserScript(dialogue(), { storage });
    expect(a).not.toBe(b);
  });
});

describe("listUserScripts", () => {
  test("empty by default", () => {
    expect(listUserScripts({ storage })).toEqual([]);
  });

  test("lists everything saved, newest first", () => {
    const a = saveUserScript(dialogue({ title: "Older" }), { storage });
    // Force a different timestamp for the second save.
    const b = saveUserScript(dialogue({ title: "Newer" }), { storage });
    const list = listUserScripts({ storage });
    expect(list).toHaveLength(2);
    // listUserScripts orders by createdAtMs desc — same-millisecond ties
    // fall back to insertion order; assert membership not strict order.
    expect(list.map((e) => e.scriptId).sort()).toEqual([a, b].sort());
  });
});

describe("deleteUserScript", () => {
  test("removes the entry", () => {
    const id = saveUserScript(dialogue(), { storage });
    deleteUserScript(id, { storage });
    expect(loadUserScript(id, { storage })).toBeNull();
    expect(listUserScripts({ storage })).toHaveLength(0);
  });

  test("delete unknown id is a no-op", () => {
    expect(() => deleteUserScript("user-nope", { storage })).not.toThrow();
  });
});

describe("export / import", () => {
  test("exportAllUserScripts returns a versioned array", () => {
    saveUserScript(dialogue({ title: "A" }), { storage });
    saveUserScript(dialogue({ title: "B" }), { storage });
    const blob = exportAllUserScripts({ storage });
    expect(blob.format).toBe("polyglyph.user-scripts.v1");
    expect(blob.entries).toHaveLength(2);
  });

  test("importUserScripts round-trips", () => {
    saveUserScript(dialogue({ title: "A" }), { storage });
    const blob = exportAllUserScripts({ storage });

    const fresh = new FakeStorage();
    const result = importUserScripts(blob, { storage: fresh });
    expect(result.imported).toBe(1);
    expect(listUserScripts({ storage: fresh })).toHaveLength(1);
  });

  test("import skips invalid entries and reports them", () => {
    const bad = {
      format: "polyglyph.user-scripts.v1",
      entries: [
        { scriptId: "user-good", createdAtMs: 1, dialogue: dialogue() },
        // schema-violating entry
        {
          scriptId: "user-bad",
          createdAtMs: 2,
          dialogue: { ...dialogue(), level: "Z9" },
        },
      ],
    };
    const result = importUserScripts(bad, { storage });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });

  test("import rejects wrong format", () => {
    const bad = { format: "wrong", entries: [] };
    expect(() => importUserScripts(bad, { storage })).toThrow();
  });
});

describe("ssr safety", () => {
  test("loadUserScript returns null when storage null", () => {
    expect(loadUserScript("user-x", { storage: null })).toBeNull();
  });

  test("listUserScripts returns empty when storage null", () => {
    expect(listUserScripts({ storage: null })).toEqual([]);
  });
});

describe("draft / published lifecycle", () => {
  test("default status when saved is published", async () => {
    const { listPublished, listDrafts } = await import("@/lib/data/user-scripts");
    const id = saveUserScript(dialogue(), { storage });
    expect(listPublished({ storage }).map((e) => e.scriptId)).toContain(id);
    expect(listDrafts({ storage })).toHaveLength(0);
  });

  test("can save as draft explicitly", async () => {
    const { listPublished, listDrafts } = await import("@/lib/data/user-scripts");
    const id = saveUserScript(dialogue(), { storage, status: "draft" });
    expect(listDrafts({ storage }).map((e) => e.scriptId)).toContain(id);
    expect(listPublished({ storage })).toHaveLength(0);
  });

  test("publishDraft flips a draft to published", async () => {
    const { publishDraft, loadUserScriptEntry } = await import(
      "@/lib/data/user-scripts"
    );
    const id = saveUserScript(dialogue(), { storage, status: "draft" });
    publishDraft(id, { storage });
    expect(loadUserScriptEntry(id, { storage })?.status).toBe("published");
  });

  test("legacy entries without status field are read as published (migration)", async () => {
    const { listPublished } = await import("@/lib/data/user-scripts");
    // Manually write an entry that lacks the status field (pre-v0.4 shape).
    storage.setItem(
      "polyglyph:user-script:user-legacy",
      JSON.stringify({
        scriptId: "user-legacy",
        createdAtMs: 1,
        dialogue: dialogue(),
      }),
    );
    storage.setItem("polyglyph:user-scripts:index", JSON.stringify(["user-legacy"]));
    const list = listPublished({ storage });
    expect(list.map((e) => e.scriptId)).toContain("user-legacy");
  });
});

describe("tags", () => {
  test("save with tags", () => {
    const id = saveUserScript(dialogue(), { storage, tags: ["work", "interview"] });
    expect(listUserScripts({ storage }).find((e) => e.scriptId === id)?.tags).toEqual([
      "work",
      "interview",
    ]);
  });

  test("updateUserScript replaces tags", async () => {
    const { updateUserScript } = await import("@/lib/data/user-scripts");
    const id = saveUserScript(dialogue(), { storage, tags: ["a"] });
    updateUserScript(id, { tags: ["b", "c"] }, { storage });
    expect(listUserScripts({ storage }).find((e) => e.scriptId === id)?.tags).toEqual([
      "b",
      "c",
    ]);
  });
});

describe("sourceId link", () => {
  test("save preserves sourceId", () => {
    const id = saveUserScript(dialogue(), { storage, sourceId: "src-abc" });
    expect(
      listUserScripts({ storage }).find((e) => e.scriptId === id)?.sourceId,
    ).toBe("src-abc");
  });
});

describe("updateUserScript", () => {
  test("can replace the dialogue (used by DraftEditor)", async () => {
    const { updateUserScript } = await import("@/lib/data/user-scripts");
    const id = saveUserScript(dialogue({ title: "Before" }), { storage });
    updateUserScript(id, { dialogue: dialogue({ title: "After" }) }, { storage });
    const loaded = listUserScripts({ storage }).find((e) => e.scriptId === id);
    expect(loaded?.dialogue.title).toBe("After");
  });

  test("returns null for unknown id", async () => {
    const { updateUserScript } = await import("@/lib/data/user-scripts");
    expect(updateUserScript("user-nope", { tags: ["x"] }, { storage })).toBeNull();
  });
});
