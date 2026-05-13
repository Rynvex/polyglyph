#!/usr/bin/env tsx
/**
 * audit-translations — heuristic translation drift report.
 *
 * For each blueprint × language, compare against the English version and
 * flag mechanical signals that often correlate with translation drift:
 *
 *   - **length-ratio**: target translation differs from en by > 2.5× or
 *     < 0.4× character count. Genuine prose can compress/expand a bit,
 *     but extreme ratios usually mean a turn was dropped or doubled.
 *   - **missing-turn**: a turn id present in en but missing in target.
 *   - **missing-template**: a player turn whose template list is shorter
 *     than en's.
 *   - **missing-hint**: a player template missing `hint_zh` while the
 *     en version has one.
 *   - **fillerset**: target contains an obvious untranslated en filler
 *     (`okay`, `sure`, `right` etc.) — weak signal only.
 *
 * The script is intentionally machine-only — it does NOT judge style,
 * fluency, or correctness. The user reviews the report and decides
 * whether each flag is a real bug or expected.
 *
 * Output: `docs/AUDIT_TRANSLATIONS.md` (markdown table per blueprint
 * with all flagged entries).
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const TRANS_ROOT = path.resolve(
  process.cwd(),
  "public",
  "dialogues",
  "translations",
);
const REPORT = path.resolve(process.cwd(), "docs", "AUDIT_TRANSLATIONS.md");

const REF_LANG = "en";
const TARGET_LANGS = ["zh-tw", "ja", "ko", "es", "it", "de"];

// Per-language thresholds: zh-tw / ja / ko routinely compress en text
// 2-3x because they encode the same meaning in fewer characters.
// Western languages stay close to en. Tune for the noisiest legitimate
// drift, not the noisiest theoretical case.
const RATIO_BOUNDS: Record<string, { low: number; high: number }> = {
  "zh-tw": { low: 0.18, high: 3.0 },
  ja: { low: 0.25, high: 3.0 },
  ko: { low: 0.25, high: 3.0 },
  default: { low: 0.5, high: 2.5 },
};
const EN_FILLERS = new Set([
  "okay",
  "ok",
  "alright",
  "sure",
  "right",
  "fine",
  "well",
  "yeah",
]);

interface Template {
  id: string;
  text?: string;
  display?: string;
  display_furigana?: Array<{ jp: string; kana?: string; ro?: string }>;
  hint_zh?: string;
}

interface TurnSlot {
  text?: string;
  templates?: Template[];
}

interface Translation {
  schema_version: number;
  blueprint_id: string;
  language: string;
  title: string;
  turns: Record<string, TurnSlot>;
}

interface Flag {
  blueprintId: string;
  language: string;
  turnId: string;
  templateId?: string;
  kind:
    | "missing-turn"
    | "missing-template"
    | "missing-hint"
    | "length-ratio"
    | "fillerset";
  detail: string;
}

async function listBlueprints(): Promise<string[]> {
  const entries = await fs.readdir(TRANS_ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

async function loadTranslation(
  blueprintId: string,
  lang: string,
): Promise<Translation | null> {
  const file = path.join(TRANS_ROOT, blueprintId, `${lang}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as Translation;
  } catch {
    return null;
  }
}

function turnText(slot: TurnSlot | undefined, templateIdx = 0): string {
  if (!slot) return "";
  if (slot.text) return slot.text;
  if (slot.templates && slot.templates[templateIdx]) {
    const tmpl = slot.templates[templateIdx];
    if (tmpl.text) return tmpl.text;
    if (tmpl.display) return tmpl.display;
  }
  return "";
}

function checkLengthRatio(
  en: string,
  target: string,
  language: string,
): number | null {
  if (!en || !target) return null;
  const ratio = target.length / en.length;
  const bounds = RATIO_BOUNDS[language] ?? RATIO_BOUNDS.default;
  if (ratio >= bounds.high) return ratio;
  if (ratio <= bounds.low) return ratio;
  return null;
}

function containsEnFiller(target: string): string | null {
  const lower = target.toLowerCase();
  const words = lower.match(/[a-z']+/g);
  if (!words) return null;
  for (const w of words) {
    if (EN_FILLERS.has(w)) return w;
  }
  return null;
}

function auditPair(en: Translation, target: Translation): Flag[] {
  const flags: Flag[] = [];
  const enTurnIds = Object.keys(en.turns);
  const targetTurnIds = new Set(Object.keys(target.turns));

  for (const tid of enTurnIds) {
    if (!targetTurnIds.has(tid)) {
      flags.push({
        blueprintId: en.blueprint_id,
        language: target.language,
        turnId: tid,
        kind: "missing-turn",
        detail: `en defines turn ${tid}; target ${target.language} doesn't`,
      });
      continue;
    }
    const enSlot = en.turns[tid];
    const tSlot = target.turns[tid];
    const enTemplates = enSlot.templates ?? [];
    const tTemplates = tSlot.templates ?? [];

    if (enTemplates.length > tTemplates.length) {
      flags.push({
        blueprintId: en.blueprint_id,
        language: target.language,
        turnId: tid,
        kind: "missing-template",
        detail: `en has ${enTemplates.length} template(s), target has ${tTemplates.length}`,
      });
    }

    // Per-template hint + length checks.
    const sharedCount = Math.min(enTemplates.length, tTemplates.length);
    for (let i = 0; i < sharedCount; i++) {
      const e = enTemplates[i];
      const t = tTemplates[i];
      // hint_zh is for non-zh users; zh-tw doesn't need its own hint_zh.
      if (e.hint_zh && !t.hint_zh && target.language !== "zh-tw") {
        flags.push({
          blueprintId: en.blueprint_id,
          language: target.language,
          turnId: tid,
          templateId: t.id,
          kind: "missing-hint",
          detail: `en template ${e.id} has hint_zh, target lacks it`,
        });
      }
      const enText = e.text ?? e.display ?? "";
      const tText = t.text ?? t.display ?? "";
      const ratio = checkLengthRatio(enText, tText, target.language);
      if (ratio !== null) {
        flags.push({
          blueprintId: en.blueprint_id,
          language: target.language,
          turnId: tid,
          templateId: t.id,
          kind: "length-ratio",
          detail: `len ratio ${ratio.toFixed(2)}: en=${enText.length}c "${truncate(enText)}" vs target=${tText.length}c "${truncate(tText)}"`,
        });
      }
      const filler = target.language === "en" ? null : containsEnFiller(tText);
      if (filler) {
        flags.push({
          blueprintId: en.blueprint_id,
          language: target.language,
          turnId: tid,
          templateId: t.id,
          kind: "fillerset",
          detail: `target contains untranslated en filler "${filler}" in "${truncate(tText)}"`,
        });
      }
    }

    // Bot turn length ratio.
    if (!enSlot.templates && !tSlot.templates) {
      const enText = turnText(enSlot);
      const tText = turnText(tSlot);
      const ratio = checkLengthRatio(enText, tText, target.language);
      if (ratio !== null) {
        flags.push({
          blueprintId: en.blueprint_id,
          language: target.language,
          turnId: tid,
          kind: "length-ratio",
          detail: `len ratio ${ratio.toFixed(2)}: en="${truncate(enText)}" vs target="${truncate(tText)}"`,
        });
      }
    }
  }

  return flags;
}

function truncate(s: string, max = 50): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

async function main(): Promise<void> {
  const blueprints = await listBlueprints();
  const allFlags: Flag[] = [];
  for (const bp of blueprints) {
    const en = await loadTranslation(bp, REF_LANG);
    if (!en) continue;
    for (const lang of TARGET_LANGS) {
      const t = await loadTranslation(bp, lang);
      if (!t) continue;
      allFlags.push(...auditPair(en, t));
    }
  }
  await writeReport(blueprints.length, allFlags);
  const summary = summarize(allFlags);
  process.stdout.write(
    `Audited ${blueprints.length} blueprints × ${TARGET_LANGS.length} languages. ${allFlags.length} heuristic flags (see ${path.relative(process.cwd(), REPORT)}).\n` +
      summary +
      "\n",
  );
}

function summarize(flags: Flag[]): string {
  const byKind = new Map<string, number>();
  const byLang = new Map<string, number>();
  for (const f of flags) {
    byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1);
    byLang.set(f.language, (byLang.get(f.language) ?? 0) + 1);
  }
  const k = Array.from(byKind.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([kind, n]) => `  ${kind}: ${n}`)
    .join("\n");
  const l = Array.from(byLang.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([lang, n]) => `  ${lang}: ${n}`)
    .join("\n");
  return `By kind:\n${k}\nBy language:\n${l}`;
}

async function writeReport(
  blueprintCount: number,
  flags: Flag[],
): Promise<void> {
  const lines: string[] = [
    "# Translation Audit",
    "",
    `Generated by \`scripts/audit-translations.ts\` on ${new Date().toISOString()}.`,
    "",
    "Heuristic flags only — the script does NOT judge fluency or semantic correctness. Review each flag and decide whether it's a real drift bug or an expected linguistic difference.",
    "",
    `Audited **${blueprintCount}** blueprints across ${TARGET_LANGS.length} target languages vs en reference.`,
    "",
    "## Heuristics",
    "",
    `- **length-ratio**: target length differs from en outside per-language bounds. CJK languages routinely compress, so thresholds are looser there: zh-tw 0.18–3.0, ja/ko 0.25–3.0, others 0.5–2.5.`,
    "- **missing-turn**: en defines a turn id; target translation omits it.",
    "- **missing-template**: en player turn has more templates than target.",
    "- **missing-hint**: en template has hint_zh; target lacks one.",
    `- **fillerset**: target contains an obvious en filler word (${Array.from(EN_FILLERS).join(", ")}) — weak signal.`,
    "",
  ];
  if (flags.length === 0) {
    lines.push("**No flags raised.** All translations look mechanically aligned with the en reference.");
    await fs.writeFile(REPORT, lines.join("\n"), "utf-8");
    return;
  }

  // Group flags by blueprint then by language for readability.
  const grouped = new Map<string, Map<string, Flag[]>>();
  for (const f of flags) {
    if (!grouped.has(f.blueprintId)) grouped.set(f.blueprintId, new Map());
    const inner = grouped.get(f.blueprintId)!;
    if (!inner.has(f.language)) inner.set(f.language, []);
    inner.get(f.language)!.push(f);
  }

  const sortedBlueprints = Array.from(grouped.keys()).sort();
  lines.push(`Total flags: **${flags.length}** across ${grouped.size} blueprint(s).`);
  lines.push("");

  for (const bp of sortedBlueprints) {
    lines.push(`## \`${bp}\``);
    lines.push("");
    const langMap = grouped.get(bp)!;
    const sortedLangs = Array.from(langMap.keys()).sort();
    for (const lang of sortedLangs) {
      const flagsForLang = langMap.get(lang)!;
      lines.push(`### ${lang} (${flagsForLang.length})`);
      lines.push("");
      lines.push("| turn | template | kind | detail |");
      lines.push("|---|---|---|---|");
      for (const f of flagsForLang) {
        const safeDetail = f.detail.replace(/\|/g, "\\|").replace(/\n/g, " ");
        lines.push(
          `| ${f.turnId} | ${f.templateId ?? "—"} | ${f.kind} | ${safeDetail} |`,
        );
      }
      lines.push("");
    }
  }
  await fs.writeFile(REPORT, lines.join("\n"), "utf-8");
}

main().catch((err) => {
  process.stderr.write(`audit-translations failed: ${String(err)}\n`);
  process.exit(1);
});
