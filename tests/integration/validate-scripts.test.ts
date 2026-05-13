/**
 * Integration spec for the validate-scripts CLI gate.
 *
 * Walks <root>/blueprints and <root>/translations, validates each file
 * against its zod schema, then verifies every (blueprint, translation)
 * pair composes into a valid runtime Dialogue. Exits 0 on full pass,
 * non-zero on first failure.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TOOL = path.join(REPO_ROOT, "scripts", "validate-scripts.ts");

const minimalBlueprint = {
  schema_version: 1,
  id: "demo",
  level: "A1",
  topic: "daily",
  turns: [{ id: "t1", speaker: "bot", has_templates: false }],
};

const minimalTranslation = {
  schema_version: 1,
  blueprint_id: "demo",
  language: "en",
  title: "Demo",
  turns: { t1: { text: "Hi" } },
};

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

function run(target: string): RunResult {
  try {
    const stdout = execFileSync("pnpm", ["exec", "tsx", TOOL, target], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      status: typeof e.status === "number" ? e.status : 1,
      stdout: e.stdout?.toString() ?? "",
      stderr: e.stderr?.toString() ?? "",
    };
  }
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = path.join(
    REPO_ROOT,
    "tests",
    "tmp",
    `vs-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(path.join(tmpDir, "blueprints"), { recursive: true });
  mkdirSync(path.join(tmpDir, "translations", "demo"), { recursive: true });
});

afterEach(() => {
  try {
    execFileSync("rm", ["-rf", tmpDir]);
  } catch {
    // ignore
  }
});

describe("validate-scripts CLI", () => {
  test("exits zero on a valid blueprint + translation pair", () => {
    writeFileSync(
      path.join(tmpDir, "blueprints", "demo.json"),
      JSON.stringify(minimalBlueprint),
    );
    writeFileSync(
      path.join(tmpDir, "translations", "demo", "en.json"),
      JSON.stringify(minimalTranslation),
    );
    const r = run(tmpDir);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("blueprint/demo");
    expect(r.stdout).toContain("translation/demo/en");
  });

  test("exits non-zero on an invalid blueprint", () => {
    writeFileSync(
      path.join(tmpDir, "blueprints", "bad.json"),
      JSON.stringify({ ...minimalBlueprint, id: "bad", level: "Z9" }),
    );
    const r = run(tmpDir);
    expect(r.status).not.toBe(0);
  });

  test("reports the offending file and field on schema error", () => {
    writeFileSync(
      path.join(tmpDir, "blueprints", "bad.json"),
      JSON.stringify({ ...minimalBlueprint, id: "bad", level: "Z9" }),
    );
    const r = run(tmpDir);
    const out = r.stderr + r.stdout;
    expect(out).toContain("bad.json");
    expect(out).toContain("level");
  });

  test("exits non-zero when blueprints dir is empty", () => {
    const r = run(tmpDir);
    expect(r.status).not.toBe(0);
  });

  test("exits non-zero when a translation references a missing blueprint", () => {
    writeFileSync(
      path.join(tmpDir, "blueprints", "demo.json"),
      JSON.stringify(minimalBlueprint),
    );
    mkdirSync(path.join(tmpDir, "translations", "ghost"), { recursive: true });
    writeFileSync(
      path.join(tmpDir, "translations", "ghost", "en.json"),
      JSON.stringify({ ...minimalTranslation, blueprint_id: "ghost" }),
    );
    const r = run(tmpDir);
    expect(r.status).not.toBe(0);
    const out = r.stderr + r.stdout;
    expect(out).toContain("ghost");
  });

  test("exits non-zero when translation is missing a turn the blueprint declares", () => {
    writeFileSync(
      path.join(tmpDir, "blueprints", "demo.json"),
      JSON.stringify({
        ...minimalBlueprint,
        turns: [
          { id: "t1", speaker: "bot", has_templates: false },
          { id: "t2", speaker: "player", has_templates: true, template_count: 1 },
        ],
      }),
    );
    writeFileSync(
      path.join(tmpDir, "translations", "demo", "en.json"),
      JSON.stringify(minimalTranslation),
    );
    const r = run(tmpDir);
    expect(r.status).not.toBe(0);
    const out = r.stderr + r.stdout;
    expect(out).toContain("compose error");
  });
});
