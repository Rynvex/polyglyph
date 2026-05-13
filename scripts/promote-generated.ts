#!/usr/bin/env tsx
/**
 * promote-generated — vet dialogues in a staging directory, then copy
 * them into `public/dialogues/` once everything checks out.
 *
 * Pipeline:
 *
 *   1. Read every blueprint under <staging>/blueprints/
 *   2. For each blueprint:
 *        a. Parse via BlueprintSchema
 *        b. Ensure <staging>/translations/<id>/ exists
 *        c. Parse all 7 language translations via TranslationSchema
 *        d. Run validateTranslationIme on each
 *        e. composeDialogue(blueprint, translation) for every (id, lang) pair
 *        f. Verify the blueprint id does NOT already exist under
 *           public/dialogues/blueprints/ (duplicate detection)
 *   3. If ANY of the above fails, abort — no file is touched. Print a
 *      detailed report so the author can fix and retry.
 *   4. Otherwise copy blueprint + translations into public/dialogues/.
 *
 * CLI:
 *   pnpm promote-generated [<staging-dir>] [--dry-run]
 *
 *   <staging-dir> defaults to $POLYGLYPH_STAGING or ./staging
 *   --dry-run     validates without copying
 *
 * The staging directory is intentionally configurable so contributors
 * can plug in whatever drafting workflow they prefer (local folder,
 * shared mount, cloud-sync directory, etc.).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  BlueprintSchema,
  TranslationSchema,
  type Blueprint,
  type Translation,
} from "../lib/data/dialogues/schema";
import { composeDialogue } from "../lib/data/dialogues/compose";
import { validateTranslationIme } from "../lib/data/dialogues/validate-ime";

const DEFAULT_STAGING =
  process.env.POLYGLYPH_STAGING ?? path.resolve(process.cwd(), "staging");
const LIVE_ROOT = path.resolve(process.cwd(), "public", "dialogues");
const LIVE_BLUEPRINTS = path.join(LIVE_ROOT, "blueprints");
const LIVE_TRANSLATIONS = path.join(LIVE_ROOT, "translations");

const SUPPORTED_LANGUAGES = ["en", "zh-tw", "ja", "ko", "es", "it", "de"] as const;

interface CheckIssue {
  blueprintId: string;
  kind:
    | "blueprint-schema"
    | "missing-translation-dir"
    | "missing-language"
    | "translation-schema"
    | "ime"
    | "compose"
    | "duplicate-id"
    | "unstable"
    | "io";
  detail: string;
}

interface PendingDialogue {
  blueprintId: string;
  blueprintPath: string;
  blueprint: Blueprint;
  translationDir: string;
  translations: Map<string, { path: string; data: Translation }>;
}

interface RunOptions {
  staging: string;
  dryRun: boolean;
  /** Skip a dialogue when any of its files have been modified within
   * this many seconds. Protects against picking up half-written batches
   * (a Claude session writing 8 files takes 30–120s typically). */
  stableAfterSeconds: number;
  /** After a successful promote, move the staged blueprint +
   * translations into <staging>/_promoted/<YYYY-MM-DD>/<id>/ so the
   * next run doesn't keep flagging them as duplicates. */
  archive: boolean;
  /** Suppress informational output. Errors and the "promoted N
   * dialogue(s)" summary still print. Use in cron / timer jobs. */
  quiet: boolean;
}

function parseArgs(): RunOptions {
  const args = process.argv.slice(2);
  let staging = DEFAULT_STAGING;
  let dryRun = false;
  let stableAfterSeconds = 60;
  let archive = false;
  let quiet = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--archive") archive = true;
    else if (a === "--quiet") quiet = true;
    else if (a === "--stable-after") {
      const v = args[++i];
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        process.stderr.write(`--stable-after expects a non-negative number, got: ${v}\n`);
        process.exit(2);
      }
      stableAfterSeconds = n;
    } else if (a.startsWith("--")) {
      process.stderr.write(`Unknown flag: ${a}\n`);
      process.exit(2);
    } else staging = path.resolve(a);
  }
  return { staging, dryRun, stableAfterSeconds, archive, quiet };
}

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw) as T;
}

async function listJsonStems(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
  } catch {
    return [];
  }
}

async function maxMtimeMs(filePaths: string[]): Promise<number> {
  let max = 0;
  for (const p of filePaths) {
    try {
      const st = await fs.stat(p);
      if (st.mtimeMs > max) max = st.mtimeMs;
    } catch {
      // missing file is caught upstream; ignore for stability calc
    }
  }
  return max;
}

async function loadStaging(
  staging: string,
  stableAfterSeconds: number,
  issues: CheckIssue[],
): Promise<PendingDialogue[]> {
  const blueprintsDir = path.join(staging, "blueprints");
  const translationsDir = path.join(staging, "translations");
  const stableCutoffMs = Date.now() - stableAfterSeconds * 1000;

  const blueprintIds = await listJsonStems(blueprintsDir);
  if (blueprintIds.length === 0) {
    issues.push({
      blueprintId: "(none)",
      kind: "io",
      detail: `No blueprints found under ${blueprintsDir}`,
    });
    return [];
  }

  const pending: PendingDialogue[] = [];

  for (const id of blueprintIds) {
    const blueprintPath = path.join(blueprintsDir, `${id}.json`);

    // (a) blueprint schema
    let blueprint: Blueprint;
    try {
      const raw = await readJson<unknown>(blueprintPath);
      blueprint = BlueprintSchema.parse(raw);
    } catch (err) {
      issues.push({
        blueprintId: id,
        kind: "blueprint-schema",
        detail: `Failed to parse blueprint: ${formatErr(err)}`,
      });
      continue;
    }

    if (blueprint.id !== id) {
      issues.push({
        blueprintId: id,
        kind: "blueprint-schema",
        detail: `Blueprint file name (${id}) and inner id (${blueprint.id}) mismatch`,
      });
      continue;
    }

    // (b) translation dir
    const tDir = path.join(translationsDir, id);
    try {
      await fs.stat(tDir);
    } catch {
      issues.push({
        blueprintId: id,
        kind: "missing-translation-dir",
        detail: `Missing translations folder: ${tDir}`,
      });
      continue;
    }

    // (c) + (d) per-language schema + IME
    const translations = new Map<string, { path: string; data: Translation }>();
    let anyMissing = false;

    for (const lang of SUPPORTED_LANGUAGES) {
      const file = path.join(tDir, `${lang}.json`);
      let raw: unknown;
      try {
        raw = await readJson<unknown>(file);
      } catch {
        issues.push({
          blueprintId: id,
          kind: "missing-language",
          detail: `Missing ${lang}.json (expected at ${file})`,
        });
        anyMissing = true;
        continue;
      }

      let parsed: Translation;
      try {
        parsed = TranslationSchema.parse(raw);
      } catch (err) {
        issues.push({
          blueprintId: id,
          kind: "translation-schema",
          detail: `${lang}.json schema invalid: ${formatErr(err)}`,
        });
        anyMissing = true;
        continue;
      }

      const imeIssues = validateTranslationIme(parsed);
      if (imeIssues.length > 0) {
        for (const i of imeIssues) {
          issues.push({
            blueprintId: id,
            kind: "ime",
            detail: `${lang}.json turn=${i.turnId} template=${i.templateId} field=${i.field}: ${i.problem}`,
          });
        }
        anyMissing = true;
      }

      translations.set(lang, { path: file, data: parsed });
    }

    if (anyMissing) continue;

    // (e) compose round-trip
    let composeOk = true;
    for (const [lang, t] of translations) {
      try {
        composeDialogue(blueprint, t.data);
      } catch (err) {
        issues.push({
          blueprintId: id,
          kind: "compose",
          detail: `Compose failed for ${lang}: ${formatErr(err)}`,
        });
        composeOk = false;
      }
    }
    if (!composeOk) continue;

    // (e2) stability check — every file must be older than the cutoff
    if (stableAfterSeconds > 0) {
      const allFiles = [
        blueprintPath,
        ...Array.from(translations.values()).map((t) => t.path),
      ];
      const newestMs = await maxMtimeMs(allFiles);
      if (newestMs > stableCutoffMs) {
        const ageSec = Math.round((Date.now() - newestMs) / 1000);
        issues.push({
          blueprintId: id,
          kind: "unstable",
          detail: `Newest file modified ${ageSec}s ago (< ${stableAfterSeconds}s threshold) — skipped this run`,
        });
        continue;
      }
    }

    pending.push({
      blueprintId: id,
      blueprintPath,
      blueprint,
      translationDir: tDir,
      translations,
    });
  }

  // (f) duplicate against live
  const liveIds = new Set(await listJsonStems(LIVE_BLUEPRINTS));
  const filtered: PendingDialogue[] = [];
  for (const p of pending) {
    if (liveIds.has(p.blueprintId)) {
      issues.push({
        blueprintId: p.blueprintId,
        kind: "duplicate-id",
        detail: `Blueprint id already exists in public/dialogues/blueprints/`,
      });
      continue;
    }
    filtered.push(p);
  }

  return filtered;
}

async function copyDialogue(pending: PendingDialogue): Promise<void> {
  const destBlueprint = path.join(LIVE_BLUEPRINTS, `${pending.blueprintId}.json`);
  await fs.mkdir(LIVE_BLUEPRINTS, { recursive: true });
  await fs.copyFile(pending.blueprintPath, destBlueprint);

  const destTranslationDir = path.join(LIVE_TRANSLATIONS, pending.blueprintId);
  await fs.mkdir(destTranslationDir, { recursive: true });
  for (const { path: src } of pending.translations.values()) {
    const filename = path.basename(src);
    await fs.copyFile(src, path.join(destTranslationDir, filename));
  }
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function archiveDialogue(
  staging: string,
  pending: PendingDialogue,
): Promise<string> {
  const archiveDir = path.join(staging, "_promoted", todayDateStr());
  await fs.mkdir(archiveDir, { recursive: true });

  // Move blueprint
  const archivedBlueprint = path.join(archiveDir, `${pending.blueprintId}.json`);
  await fs.rename(pending.blueprintPath, archivedBlueprint);

  // Move translation folder
  const archivedTranslationDir = path.join(archiveDir, pending.blueprintId);
  await fs.rename(pending.translationDir, archivedTranslationDir);

  return archiveDir;
}

function formatErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function formatIssue(i: CheckIssue): string {
  return `  [${i.kind}] ${i.blueprintId}: ${i.detail}`;
}

function timestamp(): string {
  return new Date().toISOString();
}

async function main(): Promise<void> {
  const opts = parseArgs();
  const { staging, dryRun, stableAfterSeconds, archive, quiet } = opts;

  // Verbose log helper. Errors always print regardless of --quiet.
  const log = (msg: string): void => {
    if (!quiet) process.stdout.write(msg);
  };
  const err = (msg: string): void => {
    process.stderr.write(msg);
  };

  log(`[${timestamp()}] Staging:  ${staging}\n`);
  log(`[${timestamp()}] Live:     ${LIVE_ROOT}\n`);
  log(
    `[${timestamp()}] Mode:     ${dryRun ? "dry-run" : "promote"}  stable-after=${stableAfterSeconds}s  archive=${archive}\n\n`,
  );

  const issues: CheckIssue[] = [];
  const ready = await loadStaging(staging, stableAfterSeconds, issues);

  // Report
  if (issues.length > 0) {
    log(`Found ${issues.length} issue(s):\n`);
    for (const i of issues) log(formatIssue(i) + "\n");
    log("\n");
  }

  // Categorize
  const blockingKinds = new Set<CheckIssue["kind"]>([
    "blueprint-schema",
    "missing-translation-dir",
    "missing-language",
    "translation-schema",
    "ime",
    "compose",
    "io",
  ]);
  const blocking = issues.filter((i) => blockingKinds.has(i.kind));
  const duplicates = issues.filter((i) => i.kind === "duplicate-id");
  const unstable = issues.filter((i) => i.kind === "unstable");

  if (blocking.length > 0) {
    // Blocking issues always print to stderr so cron logs catch them.
    err(`[${timestamp()}] ❌ Aborting: ${blocking.length} blocking issue(s):\n`);
    for (const i of blocking) err(formatIssue(i) + "\n");
    process.exit(1);
  }

  if (ready.length === 0) {
    if (duplicates.length > 0 && quiet) {
      // Pure-noise scenario in quiet mode: don't even print.
      process.exit(0);
    }
    if (duplicates.length > 0) {
      log(
        `[${timestamp()}] Nothing to promote — ${duplicates.length} duplicate(s) already live.\n`,
      );
    } else if (unstable.length > 0) {
      log(
        `[${timestamp()}] Nothing to promote — ${unstable.length} unstable dialogue(s) waiting; will retry next run.\n`,
      );
    } else {
      log(`[${timestamp()}] Nothing to promote.\n`);
    }
    process.exit(0);
  }

  log(
    `[${timestamp()}] ${ready.length} dialogue(s) ready to promote:\n`,
  );
  for (const p of ready) log(`  - ${p.blueprintId}\n`);
  if (duplicates.length > 0) {
    log(
      `\n  (${duplicates.length} already-live duplicate(s) silently skipped)\n`,
    );
  }
  log("\n");

  if (dryRun) {
    log(`[${timestamp()}] Dry-run complete. Re-run without --dry-run to copy.\n`);
    process.exit(0);
  }

  // Copy
  for (const p of ready) {
    await copyDialogue(p);
    log(`  copied ${p.blueprintId}\n`);
  }

  // Archive (optional)
  if (archive) {
    for (const p of ready) {
      try {
        const archiveDir = await archiveDialogue(staging, p);
        log(`  archived ${p.blueprintId} → ${archiveDir}\n`);
      } catch (e) {
        // Archive failure is not fatal — the dialogue is already live.
        // Warn so the user can clean up manually.
        err(
          `[${timestamp()}] ⚠ archive failed for ${p.blueprintId}: ${formatErr(e)}\n`,
        );
      }
    }
  }

  // Summary line always prints (even in --quiet) when something was promoted.
  process.stdout.write(
    `[${timestamp()}] ✅ Promoted ${ready.length} dialogue(s).\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`promote-generated failed: ${formatErr(err)}\n`);
  process.exit(1);
});
