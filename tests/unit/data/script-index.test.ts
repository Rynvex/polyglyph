/**
 * TDD spec for the script index reader, post blueprint/translation split.
 *
 * Walks <dialoguesRoot>/blueprints/*.json and matching
 * translations/<id>/<lang>.json files, returning one ScriptIndexItem per
 * blueprint that has a translation in the requested language.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  groupByLevel,
  groupByTopic,
  readScriptIndex,
  sortByLevel,
} from "@/lib/data/script-index";

let tmp: string;

interface BlueprintFixture {
  id: string;
  level?: string;
  topic?: string;
  tags?: string[];
  estimated_minutes?: number;
  turns?: object[];
}

interface TranslationFixture {
  blueprintId: string;
  language: string;
  title: string;
  description?: string;
  turns?: Record<string, object>;
}

function writeBlueprint(fix: BlueprintFixture): void {
  const dir = path.join(tmp, "blueprints");
  mkdirSync(dir, { recursive: true });
  const body = {
    schema_version: 1,
    id: fix.id,
    level: fix.level ?? "A1",
    topic: fix.topic ?? "daily",
    tags: fix.tags ?? [],
    estimated_minutes: fix.estimated_minutes,
    turns: fix.turns ?? [
      { id: "t1", speaker: "bot", has_templates: false },
    ],
  };
  writeFileSync(path.join(dir, `${fix.id}.json`), JSON.stringify(body), "utf-8");
}

function writeTranslation(fix: TranslationFixture): void {
  const dir = path.join(tmp, "translations", fix.blueprintId);
  mkdirSync(dir, { recursive: true });
  const body = {
    schema_version: 1,
    blueprint_id: fix.blueprintId,
    language: fix.language,
    title: fix.title,
    description: fix.description,
    turns: fix.turns ?? { t1: { text: "Hi" } },
  };
  writeFileSync(path.join(dir, `${fix.language}.json`), JSON.stringify(body), "utf-8");
}

beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "polyglyph-idx-"));
});

afterEach(() => {
  // tmp dirs auto-cleaned by OS; nothing else needed.
});

describe("readScriptIndex", () => {
  test("returns one item per blueprint that has a translation in the lang", async () => {
    writeBlueprint({ id: "a" });
    writeBlueprint({ id: "b" });
    writeTranslation({ blueprintId: "a", language: "en", title: "A" });
    writeTranslation({ blueprintId: "b", language: "en", title: "B" });
    const items = await readScriptIndex(tmp, "en");
    expect(items.map((i) => i.scriptId).sort()).toEqual(["a", "b"]);
  });

  test("scriptId equals the blueprint id (filename without .json)", async () => {
    writeBlueprint({ id: "cafe_basic_a2" });
    writeTranslation({ blueprintId: "cafe_basic_a2", language: "en", title: "Cafe" });
    const [item] = await readScriptIndex(tmp, "en");
    expect(item.scriptId).toBe("cafe_basic_a2");
  });

  test("includes title, level, description, estimated_minutes, language", async () => {
    writeBlueprint({ id: "ok", level: "A2", estimated_minutes: 3 });
    writeTranslation({
      blueprintId: "ok",
      language: "en",
      title: "Coffee",
      description: "Order coffee",
    });
    const [item] = await readScriptIndex(tmp, "en");
    expect(item.title).toBe("Coffee");
    expect(item.level).toBe("A2");
    expect(item.description).toBe("Order coffee");
    expect(item.estimatedMinutes).toBe(3);
    expect(item.language).toBe("en");
  });

  test("skips blueprints that have no translation in the requested language", async () => {
    writeBlueprint({ id: "only_en" });
    writeBlueprint({ id: "has_ja" });
    writeTranslation({ blueprintId: "only_en", language: "en", title: "A" });
    writeTranslation({ blueprintId: "has_ja", language: "ja", title: "B" });
    const enItems = await readScriptIndex(tmp, "en");
    expect(enItems.map((i) => i.scriptId)).toEqual(["only_en"]);
    const jaItems = await readScriptIndex(tmp, "ja");
    expect(jaItems.map((i) => i.scriptId)).toEqual(["has_ja"]);
  });

  test("falls back to bundled blueprints when the fs dir is missing", async () => {
    // tmp is a fresh tmpdir with no blueprints/ subdir; the loader is
    // expected to silently fall back to the in-bundle catalog so the
    // landing page hydrates on Cloudflare Workers (no fs at runtime).
    const items = await readScriptIndex(tmp, "en");
    expect(items.length).toBeGreaterThan(0);
    // Every returned item should carry the requested language tag.
    for (const item of items) expect(item.language).toBe("en");
  });

  test("propagates blueprint validation errors so bad files surface early", async () => {
    const blueprintsDir = path.join(tmp, "blueprints");
    mkdirSync(blueprintsDir, { recursive: true });
    writeFileSync(
      path.join(blueprintsDir, "bad.json"),
      JSON.stringify({ schema_version: 1, id: "bad", level: "Z9", topic: "daily", turns: [] }),
      "utf-8",
    );
    await expect(readScriptIndex(tmp, "en")).rejects.toThrow();
  });

  test("includes topic from blueprint", async () => {
    writeBlueprint({ id: "x", topic: "tech" });
    writeTranslation({ blueprintId: "x", language: "en", title: "X" });
    const [item] = await readScriptIndex(tmp, "en");
    expect(item.topic).toBe("tech");
  });
});

describe("sortByLevel", () => {
  test("orders A1 < A2 < B1 < B2 < C1", () => {
    const items = [
      { level: "C1" as const, scriptId: "c1", id: "c1", title: "" },
      { level: "A1" as const, scriptId: "a1", id: "a1", title: "" },
      { level: "B1" as const, scriptId: "b1", id: "b1", title: "" },
      { level: "A2" as const, scriptId: "a2", id: "a2", title: "" },
      { level: "B2" as const, scriptId: "b2", id: "b2", title: "" },
    ];
    const sorted = sortByLevel(items).map((i) => i.level);
    expect(sorted).toEqual(["A1", "A2", "B1", "B2", "C1"]);
  });

  test("preserves stable order within the same level", () => {
    const items = [
      { level: "A1" as const, scriptId: "alpha", id: "alpha", title: "" },
      { level: "A1" as const, scriptId: "bravo", id: "bravo", title: "" },
      { level: "A1" as const, scriptId: "charlie", id: "charlie", title: "" },
    ];
    const sorted = sortByLevel(items).map((i) => i.scriptId);
    expect(sorted).toEqual(["alpha", "bravo", "charlie"]);
  });
});

describe("groupByTopic", () => {
  function item(scriptId: string, topic: string, level = "A1") {
    return {
      scriptId,
      id: scriptId,
      title: scriptId,
      level: level as Parameters<typeof groupByTopic>[0][number]["level"],
      topic: topic as Parameters<typeof groupByTopic>[0][number]["topic"],
    };
  }

  test("returns a Map keyed by topic", () => {
    const groups = groupByTopic([
      item("a", "daily"),
      item("b", "tech"),
      item("c", "daily"),
    ]);
    expect(groups.get("daily")?.map((i) => i.scriptId)).toEqual(["a", "c"]);
    expect(groups.get("tech")?.map((i) => i.scriptId)).toEqual(["b"]);
  });

  test("topics with no items don't appear in the map", () => {
    const groups = groupByTopic([item("a", "daily")]);
    expect(groups.has("travel")).toBe(false);
  });
});

describe("groupByLevel", () => {
  function item(scriptId: string, level: string, topic = "daily") {
    return {
      scriptId,
      id: scriptId,
      title: scriptId,
      level: level as Parameters<typeof groupByLevel>[0][number]["level"],
      topic: topic as Parameters<typeof groupByLevel>[0][number]["topic"],
    };
  }

  test("returns a Map keyed by CEFR level", () => {
    const groups = groupByLevel([
      item("a1", "A1"),
      item("b2", "B2"),
      item("a1b", "A1"),
    ]);
    expect(groups.get("A1")?.map((i) => i.scriptId)).toEqual(["a1", "a1b"]);
    expect(groups.get("B2")?.map((i) => i.scriptId)).toEqual(["b2"]);
  });
});
