/**
 * TDD spec for theme preference persistence + cycle helpers.
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
  loadPreference,
  nextPreference,
  resolvePreference,
  savePreference,
} from "@/lib/theme/storage";

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

describe("loadPreference", () => {
  test("default is 'auto' when nothing saved", () => {
    expect(loadPreference(storage)).toBe("auto");
  });

  test("returns saved 'light' / 'dark' / 'auto' values", () => {
    savePreference("light", storage);
    expect(loadPreference(storage)).toBe("light");
    savePreference("dark", storage);
    expect(loadPreference(storage)).toBe("dark");
    savePreference("auto", storage);
    expect(loadPreference(storage)).toBe("auto");
  });

  test("falls back to 'auto' for garbage values", () => {
    storage.setItem("polyglyph:theme", "purple-monkey-dishwasher");
    expect(loadPreference(storage)).toBe("auto");
  });

  test("returns 'auto' when storage is null (SSR)", () => {
    expect(loadPreference(null)).toBe("auto");
  });
});

describe("savePreference", () => {
  test("persists the chosen mode", () => {
    savePreference("dark", storage);
    expect(storage.getItem("polyglyph:theme")).toBe("dark");
  });

  test("no-op when storage is null", () => {
    expect(() => savePreference("light", null)).not.toThrow();
  });
});

describe("resolvePreference", () => {
  test("returns the explicit choice when not auto", () => {
    expect(resolvePreference("light", true)).toBe("light");
    expect(resolvePreference("light", false)).toBe("light");
    expect(resolvePreference("dark", true)).toBe("dark");
    expect(resolvePreference("dark", false)).toBe("dark");
  });

  test("auto resolves to light when OS prefers light", () => {
    expect(resolvePreference("auto", true)).toBe("light");
  });

  test("auto resolves to dark when OS prefers dark (or no preference)", () => {
    expect(resolvePreference("auto", false)).toBe("dark");
  });
});

describe("nextPreference", () => {
  test("cycles auto → light → dark → auto", () => {
    expect(nextPreference("auto")).toBe("light");
    expect(nextPreference("light")).toBe("dark");
    expect(nextPreference("dark")).toBe("auto");
  });
});
