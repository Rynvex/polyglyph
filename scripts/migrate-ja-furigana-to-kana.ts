#!/usr/bin/env tsx
/**
 * Migrate every ja translation file under public/dialogues/translations/
 * from the legacy `display_furigana: [{ jp, ro }]` shape to the new
 * `display_furigana: [{ jp, kana }]` shape — and drop the now-derived
 * `text` field on player templates.
 *
 * Strategy per segment:
 *   1. If `jp` is pure kana (after stripping CJK punctuation), use it
 *      directly as `kana` (preserving trailing punct on jp).
 *   2. If `jp` is pure kanji (no okurigana), reverse-Hepburn the stored
 *      `ro` via hepburnToKana.
 *   3. If `jp` is kanji + trailing hiragana okurigana, strip the
 *      okurigana from jp, reverse-Hepburn the kanji portion of ro
 *      (using length-matched suffix subtraction), recombine.
 *   4. After deriving `kana`, verify kanaToHepburn(kana) === seg.ro.
 *      Round-trip mismatch is written to docs/JA_READING_WORKLIST.md
 *      with the file path, turn id, template id, jp, original ro, and
 *      derived kana — for manual fixup.
 *
 * The script writes ja files in-place. Run `pnpm validate-scripts`
 * afterward to confirm composability.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { kanaToHepburn } from "../lib/typing/ime/kana-to-hepburn";
import { hepburnToKana } from "../lib/typing/ime/hepburn-to-kana";

const ROOT = path.resolve(process.cwd(), "public", "dialogues", "translations");
const WORKLIST = path.resolve(process.cwd(), "docs", "JA_READING_WORKLIST.md");

interface Segment {
  jp: string;
  ro?: string;
  kana?: string;
}

interface WorklistEntry {
  file: string;
  turnId: string;
  templateId: string;
  jp: string;
  originalRo: string;
  derivedKana: string;
  reason: string;
}

function isHiragana(ch: string): boolean {
  const code = ch.codePointAt(0);
  if (code === undefined) return false;
  return code >= 0x3041 && code <= 0x309f;
}

function isCjkPunct(ch: string): boolean {
  const code = ch.codePointAt(0);
  if (code === undefined) return false;
  return code >= 0x3000 && code <= 0x303f;
}

function isAsciiPunct(ch: string): boolean {
  return /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~ ]/.test(ch);
}

function containsKanji(s: string): boolean {
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code !== undefined && code >= 0x4e00 && code <= 0x9fff) return true;
  }
  return false;
}

/** Strip trailing CJK + ASCII punctuation from a string. */
function stripTrailingPunct(s: string): string {
  let end = s.length;
  while (end > 0) {
    const ch = s[end - 1];
    if (isCjkPunct(ch) || isAsciiPunct(ch)) end -= 1;
    else break;
  }
  return s.slice(0, end);
}

/** Split jp into [body, trailingOkurigana]. body ends at last kanji or
 * begins the trailing hiragana run. Returns null if no kanji present. */
function splitOkurigana(jp: string): { kanjiPart: string; okurigana: string } | null {
  if (!containsKanji(jp)) return null;
  // Walk from the end, peeling off trailing hiragana characters.
  let i = jp.length;
  while (i > 0 && isHiragana(jp[i - 1])) i -= 1;
  return {
    kanjiPart: jp.slice(0, i),
    okurigana: jp.slice(i),
  };
}

/** Derive kana for one segment. Returns { kana, ok, reason } — caller
 * worklists when ok=false. */
function deriveKana(jp: string, ro: string): { kana: string; ok: boolean; reason: string } {
  const trimmedJp = stripTrailingPunct(jp);

  // 1. Pure kana jp (no kanji).
  if (!containsKanji(trimmedJp)) {
    const kana = trimmedJp;
    const roundTrip = kanaToHepburn(kana);
    if (roundTrip === ro) {
      return { kana, ok: true, reason: "pure-kana exact" };
    }
    // Pure kana but doesn't round-trip — stored ro is wrong. Use kana
    // as truth; worklist so author can verify.
    return {
      kana,
      ok: false,
      reason: `pure-kana mismatch (kana→${roundTrip}, stored ${ro})`,
    };
  }

  // 2. Kanji-bearing jp — try kanji + trailing okurigana split.
  const split = splitOkurigana(trimmedJp);
  if (!split) {
    // Should not happen since containsKanji was true, but guard.
    return { kana: hepburnToKana(ro), ok: false, reason: "no-split fallback" };
  }
  const { okurigana } = split;
  const okuriganaRo = kanaToHepburn(okurigana);

  // Subtract trailing okurigana ro from total ro.
  if (okuriganaRo.length > 0 && !ro.endsWith(okuriganaRo)) {
    // Stored ro doesn't carry the okurigana suffix at the end — likely
    // bad data. Best-effort: full hepburnToKana, worklist.
    const kana = hepburnToKana(ro);
    return {
      kana,
      ok: false,
      reason: `okurigana suffix mismatch (jp=${jp}, ro=${ro}, expected suffix=${okuriganaRo})`,
    };
  }
  const kanjiRo = okuriganaRo.length > 0 ? ro.slice(0, -okuriganaRo.length) : ro;
  const kanjiKana = hepburnToKana(kanjiRo);
  const fullKana = kanjiKana + okurigana;
  const roundTrip = kanaToHepburn(fullKana);
  if (roundTrip === ro) {
    return { kana: fullKana, ok: true, reason: "kanji+okurigana exact" };
  }
  return {
    kana: fullKana,
    ok: false,
    reason: `round-trip mismatch (kana→${roundTrip}, stored ${ro})`,
  };
}

async function walkJaFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const candidate = path.join(dir, ent.name, "ja.json");
    try {
      const st = await fs.stat(candidate);
      if (st.isFile()) out.push(candidate);
    } catch {
      // no ja.json in this blueprint; skip silently.
    }
  }
  return out.sort();
}

interface Translation {
  schema_version: number;
  blueprint_id: string;
  language: string;
  title: string;
  description?: string;
  characters?: unknown;
  turns: Record<string, {
    text?: string;
    templates?: Array<{
      id: string;
      text?: string;
      display?: string;
      display_romaji?: string;
      display_furigana?: Segment[];
      hint_zh?: string;
      weight?: number;
      next?: string;
    }>;
  }>;
}

async function migrateFile(file: string, worklist: WorklistEntry[]): Promise<boolean> {
  const raw = await fs.readFile(file, "utf-8");
  const data: Translation = JSON.parse(raw);
  let changed = false;

  for (const [turnId, slot] of Object.entries(data.turns)) {
    if (!slot.templates) continue;
    for (const t of slot.templates) {
      const segs = t.display_furigana;
      if (!segs) continue;
      const newSegs: Segment[] = [];
      let allOk = true;
      for (const seg of segs) {
        if (seg.kana !== undefined) {
          newSegs.push(seg); // already migrated
          continue;
        }
        if (seg.ro === undefined) {
          // malformed input — keep as-is; validator will catch.
          newSegs.push(seg);
          continue;
        }
        const { kana, ok, reason } = deriveKana(seg.jp, seg.ro);
        if (!ok) {
          allOk = false;
          worklist.push({
            file,
            turnId,
            templateId: t.id,
            jp: seg.jp,
            originalRo: seg.ro,
            derivedKana: kana,
            reason,
          });
        }
        newSegs.push({ jp: seg.jp, kana });
      }
      const before = JSON.stringify(t.display_furigana);
      const after = JSON.stringify(newSegs);
      if (before !== after) {
        t.display_furigana = newSegs;
        changed = true;
      }
      // Drop legacy `text` — compose derives it from kana.
      if (t.text !== undefined) {
        delete t.text;
        changed = true;
      }
      void allOk;
    }
  }

  if (changed) {
    await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }
  return changed;
}

async function writeWorklist(entries: WorklistEntry[]): Promise<void> {
  if (entries.length === 0) {
    await fs.writeFile(
      WORKLIST,
      "# ja Reading Worklist\n\nNo round-trip mismatches found — every segment derived a kana that round-trips back to the stored ro.\n",
      "utf-8",
    );
    return;
  }
  const lines: string[] = [
    "# ja Reading Worklist",
    "",
    `Generated by \`scripts/migrate-ja-furigana-to-kana.ts\` on ${new Date().toISOString()}.`,
    "",
    "Each entry below is a furigana segment whose derived `kana` does not round-trip through `kanaToHepburn` back to the originally stored `ro`. Review and correct in place; the migration kept the colloquial / best-effort reading as a placeholder.",
    "",
    `Total: **${entries.length}** segments across ${new Set(entries.map((e) => e.file)).size} file(s).`,
    "",
    "| File | Turn | Template | jp | original ro | derived kana | reason |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const e of entries) {
    const relFile = path.relative(process.cwd(), e.file);
    lines.push(
      `| \`${relFile}\` | ${e.turnId} | ${e.templateId} | \`${e.jp}\` | \`${e.originalRo}\` | \`${e.derivedKana}\` | ${e.reason} |`,
    );
  }
  lines.push("");
  await fs.writeFile(WORKLIST, lines.join("\n"), "utf-8");
}

async function main(): Promise<void> {
  const files = await walkJaFiles(ROOT);
  const worklist: WorklistEntry[] = [];
  let changedCount = 0;
  for (const f of files) {
    const changed = await migrateFile(f, worklist);
    if (changed) changedCount += 1;
  }
  await writeWorklist(worklist);
  process.stdout.write(
    `Migrated ${changedCount}/${files.length} ja files. ` +
      `${worklist.length} segments need manual review (see ${path.relative(process.cwd(), WORKLIST)}).\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`migrate-ja-furigana-to-kana failed: ${String(err)}\n`);
  process.exit(1);
});
