#!/usr/bin/env tsx
/**
 * Validate every blueprint and translation JSON under public/dialogues
 * against their respective zod schemas, then verify each
 * (blueprint, translation) pair composes into a valid runtime Dialogue.
 *
 * Exit 0 when every file validates and every pair composes; exit 1 on
 * the first failure with the offending path and error so CI logs are
 * scannable.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  BlueprintSchema,
  TranslationSchema,
  type Blueprint,
} from "../lib/data/dialogues/schema";
import { composeDialogue } from "../lib/data/dialogues/compose";
import { validateTranslationIme } from "../lib/data/dialogues/validate-ime";

const DEFAULT_ROOT = path.resolve(process.cwd(), "public", "dialogues");
const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ROOT;
const BLUEPRINTS_DIR = path.join(ROOT, "blueprints");
const TRANSLATIONS_DIR = path.join(ROOT, "translations");

function listJson(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

function listSubdirs(dir: string): string[] {
  try {
    return readdirSync(dir)
      .map((d) => path.join(dir, d))
      .filter((p) => statSync(p).isDirectory());
  } catch {
    return [];
  }
}

function main(): number {
  const blueprintFiles = listJson(BLUEPRINTS_DIR);
  if (blueprintFiles.length === 0) {
    process.stderr.write(`[validate-scripts] no blueprints under ${BLUEPRINTS_DIR}\n`);
    return 1;
  }

  const blueprints = new Map<string, Blueprint>();

  for (const file of blueprintFiles) {
    const rel = path.relative(ROOT, file);
    let payload: unknown;
    try {
      payload = JSON.parse(readFileSync(file, "utf-8"));
    } catch (err) {
      process.stderr.write(`FAIL ${rel}: invalid JSON (${String(err)})\n`);
      return 1;
    }
    const result = BlueprintSchema.safeParse(payload);
    if (!result.success) {
      const first = result.error.issues[0];
      const fieldPath = first.path.join(".") || "(root)";
      process.stderr.write(`FAIL ${rel}: ${fieldPath} — ${first.message}\n`);
      return 1;
    }
    const id = path.basename(file).replace(/\.json$/, "");
    if (id !== result.data.id) {
      process.stderr.write(`FAIL ${rel}: filename id "${id}" must match blueprint.id "${result.data.id}"\n`);
      return 1;
    }
    blueprints.set(id, result.data);
    process.stdout.write(`OK   blueprint/${id}\n`);
  }

  const translationDirs = listSubdirs(TRANSLATIONS_DIR);
  for (const dir of translationDirs) {
    const blueprintId = path.basename(dir);
    const blueprint = blueprints.get(blueprintId);
    if (!blueprint) {
      process.stderr.write(
        `FAIL translations/${blueprintId}: no matching blueprint at blueprints/${blueprintId}.json\n`,
      );
      return 1;
    }
    for (const file of listJson(dir)) {
      const rel = path.relative(ROOT, file);
      let payload: unknown;
      try {
        payload = JSON.parse(readFileSync(file, "utf-8"));
      } catch (err) {
        process.stderr.write(`FAIL ${rel}: invalid JSON (${String(err)})\n`);
        return 1;
      }
      const result = TranslationSchema.safeParse(payload);
      if (!result.success) {
        const first = result.error.issues[0];
        const fieldPath = first.path.join(".") || "(root)";
        process.stderr.write(`FAIL ${rel}: ${fieldPath} — ${first.message}\n`);
        return 1;
      }
      const lang = path.basename(file).replace(/\.json$/, "");
      if (lang !== result.data.language) {
        process.stderr.write(
          `FAIL ${rel}: filename language "${lang}" must match translation.language "${result.data.language}"\n`,
        );
        return 1;
      }
      try {
        composeDialogue(blueprint, result.data);
      } catch (err) {
        process.stderr.write(`FAIL ${rel}: compose error — ${String(err)}\n`);
        return 1;
      }
      const imeIssues = validateTranslationIme(result.data);
      if (imeIssues.length > 0) {
        process.stderr.write(`FAIL ${rel}: IME composability\n`);
        for (const issue of imeIssues) {
          process.stderr.write(
            `  - turn ${issue.turnId} / ${issue.templateId}: ${issue.problem}\n` +
              `    text:      "${issue.composed}"\n` +
              `    offending: ${issue.offending}\n`,
          );
        }
        return 1;
      }
      process.stdout.write(`OK   translation/${blueprintId}/${lang}\n`);
    }
  }

  return 0;
}

process.exit(main());
