/**
 * TDD spec: blueprint+translation filesystem loader.
 *
 * Uses temp dirs so the test is hermetic — does not depend on whatever
 * blueprints exist on disk.
 */

import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

describe("blueprint loader", () => {
  let tmpRoot: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "polyglyph-bp-"));
    originalCwd = process.cwd();
    process.chdir(tmpRoot);
    await fs.mkdir(path.join(tmpRoot, "public", "dialogues", "blueprints"), { recursive: true });
    await fs.mkdir(path.join(tmpRoot, "public", "dialogues", "translations", "demo_a1"), {
      recursive: true,
    });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  test("loadComposedDialogue returns a runtime Dialogue", async () => {
    const blueprintPath = path.join(tmpRoot, "public", "dialogues", "blueprints", "demo_a1.json");
    const enPath = path.join(tmpRoot, "public", "dialogues", "translations", "demo_a1", "en.json");
    await fs.writeFile(
      blueprintPath,
      JSON.stringify({
        schema_version: 1,
        id: "demo_a1",
        level: "A1",
        topic: "daily",
        turns: [
          { id: "t1", speaker: "bot", has_templates: false },
          { id: "t2", speaker: "player", has_templates: true, template_count: 1 },
        ],
      }),
    );
    await fs.writeFile(
      enPath,
      JSON.stringify({
        schema_version: 1,
        blueprint_id: "demo_a1",
        language: "en",
        title: "Demo",
        turns: {
          t1: { text: "Hi." },
          t2: { templates: [{ id: "t2.0", text: "Hello!" }] },
        },
      }),
    );

    const { loadComposedDialogue } = await import("@/lib/data/dialogues/loader");
    const dialogue = await loadComposedDialogue("demo_a1", "en");
    expect(dialogue).not.toBeNull();
    expect(dialogue?.id).toBe("en.demo_a1.a1");
    expect(dialogue?.title).toBe("Demo");
    expect(dialogue?.turns).toHaveLength(2);
  });

  test("loadComposedDialogue returns null when translation is absent", async () => {
    const blueprintPath = path.join(tmpRoot, "public", "dialogues", "blueprints", "demo_a1.json");
    await fs.writeFile(
      blueprintPath,
      JSON.stringify({
        schema_version: 1,
        id: "demo_a1",
        level: "A1",
        topic: "daily",
        turns: [{ id: "t1", speaker: "bot", has_templates: false }],
      }),
    );

    const { loadComposedDialogue } = await import("@/lib/data/dialogues/loader");
    const result = await loadComposedDialogue("demo_a1", "ja");
    expect(result).toBeNull();
  });

  test("listBlueprintIds returns blueprints sorted", async () => {
    const blueprintsDir = path.join(tmpRoot, "public", "dialogues", "blueprints");
    await fs.writeFile(path.join(blueprintsDir, "z_blueprint.json"), "{}");
    await fs.writeFile(path.join(blueprintsDir, "a_blueprint.json"), "{}");
    const { listBlueprintIds } = await import("@/lib/data/dialogues/loader");
    const ids = await listBlueprintIds();
    expect(ids).toEqual(["a_blueprint", "z_blueprint"]);
  });

  test("listTranslationLanguages returns languages for a blueprint", async () => {
    const dir = path.join(tmpRoot, "public", "dialogues", "translations", "demo_a1");
    await fs.writeFile(path.join(dir, "en.json"), "{}");
    await fs.writeFile(path.join(dir, "ja.json"), "{}");
    await fs.writeFile(path.join(dir, "zh-tw.json"), "{}");
    const { listTranslationLanguages } = await import("@/lib/data/dialogues/loader");
    const langs = await listTranslationLanguages("demo_a1");
    expect(langs).toEqual(["en", "ja", "zh-tw"]);
  });

  test("rejects malformed blueprint id", async () => {
    const { loadBlueprint } = await import("@/lib/data/dialogues/loader");
    expect(await loadBlueprint("../../etc/passwd")).toBeNull();
    expect(await loadBlueprint("foo bar")).toBeNull();
  });

  test("loadComposedDialogueWithNative attaches nativeText from native file", async () => {
    const bpPath = path.join(tmpRoot, "public", "dialogues", "blueprints", "demo_a1.json");
    const esPath = path.join(tmpRoot, "public", "dialogues", "translations", "demo_a1", "es.json");
    const zhPath = path.join(tmpRoot, "public", "dialogues", "translations", "demo_a1", "zh-tw.json");
    await fs.writeFile(
      bpPath,
      JSON.stringify({
        schema_version: 1,
        id: "demo_a1",
        level: "A1",
        topic: "daily",
        turns: [
          { id: "t1", speaker: "bot", has_templates: false },
          { id: "t2", speaker: "player", has_templates: true, template_count: 1 },
        ],
      }),
    );
    await fs.writeFile(
      esPath,
      JSON.stringify({
        schema_version: 1,
        blueprint_id: "demo_a1",
        language: "es",
        title: "Demo es",
        turns: {
          t1: { text: "Hola." },
          t2: { templates: [{ id: "t2.0", text: "Adiós." }] },
        },
      }),
    );
    await fs.writeFile(
      zhPath,
      JSON.stringify({
        schema_version: 1,
        blueprint_id: "demo_a1",
        language: "zh-tw",
        title: "Demo zh",
        turns: {
          t1: { text: "你好。" },
          t2: { templates: [{ id: "t2.0", text: "再見。" }] },
        },
      }),
    );

    const { loadComposedDialogueWithNative } = await import(
      "@/lib/data/dialogues/loader"
    );
    const dialogue = await loadComposedDialogueWithNative(
      "demo_a1",
      "es",
      "zh-tw",
    );
    expect(dialogue).not.toBeNull();
    expect(dialogue?.turns[0].nativeText).toBe("你好。");
    expect(dialogue?.turns[1].templates?.[0].nativeText).toBe("再見。");
  });

  test("loadComposedDialogueWithNative same-lang short-circuits, no nativeText", async () => {
    const bpPath = path.join(tmpRoot, "public", "dialogues", "blueprints", "demo_a1.json");
    const esPath = path.join(tmpRoot, "public", "dialogues", "translations", "demo_a1", "es.json");
    await fs.writeFile(
      bpPath,
      JSON.stringify({
        schema_version: 1,
        id: "demo_a1",
        level: "A1",
        topic: "daily",
        turns: [{ id: "t1", speaker: "bot", has_templates: false }],
      }),
    );
    await fs.writeFile(
      esPath,
      JSON.stringify({
        schema_version: 1,
        blueprint_id: "demo_a1",
        language: "es",
        title: "Demo",
        turns: { t1: { text: "Hola." } },
      }),
    );
    const { loadComposedDialogueWithNative } = await import(
      "@/lib/data/dialogues/loader"
    );
    const dialogue = await loadComposedDialogueWithNative("demo_a1", "es", "es");
    expect(dialogue).not.toBeNull();
    expect(dialogue?.turns[0].nativeText).toBeUndefined();
  });

  test("loadComposedDialogueWithNative gracefully degrades when native file missing", async () => {
    const bpPath = path.join(tmpRoot, "public", "dialogues", "blueprints", "demo_a1.json");
    const esPath = path.join(tmpRoot, "public", "dialogues", "translations", "demo_a1", "es.json");
    await fs.writeFile(
      bpPath,
      JSON.stringify({
        schema_version: 1,
        id: "demo_a1",
        level: "A1",
        topic: "daily",
        turns: [{ id: "t1", speaker: "bot", has_templates: false }],
      }),
    );
    await fs.writeFile(
      esPath,
      JSON.stringify({
        schema_version: 1,
        blueprint_id: "demo_a1",
        language: "es",
        title: "Demo",
        turns: { t1: { text: "Hola." } },
      }),
    );
    const { loadComposedDialogueWithNative } = await import(
      "@/lib/data/dialogues/loader"
    );
    // ja.json does not exist on disk.
    const dialogue = await loadComposedDialogueWithNative("demo_a1", "es", "ja");
    expect(dialogue).not.toBeNull();
    expect(dialogue?.turns[0].nativeText).toBeUndefined();
  });
});
