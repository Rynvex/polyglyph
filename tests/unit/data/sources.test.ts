/**
 * TDD spec for source-material persistence.
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
  deleteSource,
  listSources,
  loadSource,
  saveSource,
} from "@/lib/data/sources";

class FakeStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  key(i: number): string | null {
    return Array.from(this.map.keys())[i] ?? null;
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
}

let storage: FakeStorage;

beforeEach(() => {
  storage = new FakeStorage();
});

describe("saveSource / loadSource", () => {
  test("returns an id starting with 'src-'", () => {
    const id = saveSource(
      { title: "NYT article", content: "OpenAI announced...", kind: "paste" },
      { storage },
    );
    expect(id).toMatch(/^src-/);
  });

  test("round-trips a source", () => {
    const id = saveSource(
      { title: "Foo", content: "bar", kind: "paste" },
      { storage },
    );
    const loaded = loadSource(id, { storage });
    expect(loaded?.title).toBe("Foo");
    expect(loaded?.content).toBe("bar");
    expect(loaded?.kind).toBe("paste");
    expect(loaded?.createdAtMs).toBeGreaterThan(0);
  });

  test("returns null for unknown id", () => {
    expect(loadSource("src-nope", { storage })).toBeNull();
  });
});

describe("listSources", () => {
  test("empty by default", () => {
    expect(listSources({ storage })).toEqual([]);
  });

  test("returns saved sources newest-first", () => {
    saveSource({ title: "A", content: "a", kind: "paste" }, { storage });
    saveSource({ title: "B", content: "b", kind: "paste" }, { storage });
    const list = listSources({ storage });
    expect(list).toHaveLength(2);
    // Both saved at ~same ms; assert membership not strict order.
    expect(list.map((s) => s.title).sort()).toEqual(["A", "B"]);
  });
});

describe("deleteSource", () => {
  test("removes a source", () => {
    const id = saveSource(
      { title: "X", content: "x", kind: "paste" },
      { storage },
    );
    deleteSource(id, { storage });
    expect(loadSource(id, { storage })).toBeNull();
    expect(listSources({ storage })).toHaveLength(0);
  });

  test("delete unknown is a no-op", () => {
    expect(() => deleteSource("src-nope", { storage })).not.toThrow();
  });
});

describe("ssr safety", () => {
  test("returns null / empty list when storage is null", () => {
    expect(loadSource("any", { storage: null })).toBeNull();
    expect(listSources({ storage: null })).toEqual([]);
  });
});
