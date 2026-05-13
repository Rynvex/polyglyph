#!/usr/bin/env tsx
/**
 * generate-alphabet-decks — one-shot generator for hiragana / katakana /
 * hangul alphabet drill content.
 *
 * What it produces:
 *
 *   public/concepts/concepts.json            (appended; new concepts merged in)
 *   public/concepts/translations/ja.json     (appended; ja letter rows)
 *   public/concepts/translations/ko.json     (created or appended; ko letter rows)
 *   public/decks/ja_hiragana_basic_a1.json
 *   public/decks/ja_hiragana_dakuten_a1.json
 *   public/decks/ja_hiragana_yoon_a1.json
 *   public/decks/ja_katakana_basic_a1.json
 *   public/decks/ja_katakana_dakuten_a1.json
 *   public/decks/ja_katakana_yoon_a1.json
 *   public/decks/ko_hangul_basic_a1.json
 *   public/decks/ko_hangul_voiced_a1.json
 *   public/decks/ko_hangul_yoon_a1.json
 *
 * Idempotent: existing concepts / translations with the same id are
 * REPLACED in place; new ones are appended. Decks are overwritten.
 *
 * Run:  pnpm tsx scripts/generate-alphabet-decks.ts
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const CONCEPTS_FILE = path.resolve("public/concepts/concepts.json");
const TRANS_DIR = path.resolve("public/concepts/translations");
const DECKS_DIR = path.resolve("public/decks");

// -- Hiragana --------------------------------------------------------

// Base 46: vowels, k, s, t, n, h, m, y, r, w, n-final
const HIRA_BASIC: Array<[string, string]> = [
  ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
  ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
  ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
  ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
  ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
  ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
  ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
  ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"],
  ["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"],
  ["わ", "wa"], ["を", "wo"], ["ん", "n"],
];

// Dakuten / handakuten 25: g, z, d, b, p
const HIRA_DAKUTEN: Array<[string, string]> = [
  ["が", "ga"], ["ぎ", "gi"], ["ぐ", "gu"], ["げ", "ge"], ["ご", "go"],
  ["ざ", "za"], ["じ", "ji"], ["ず", "zu"], ["ぜ", "ze"], ["ぞ", "zo"],
  ["だ", "da"], ["ぢ", "ji"], ["づ", "zu"], ["で", "de"], ["ど", "do"],
  ["ば", "ba"], ["び", "bi"], ["ぶ", "bu"], ["べ", "be"], ["ぼ", "bo"],
  ["ぱ", "pa"], ["ぴ", "pi"], ["ぷ", "pu"], ["ぺ", "pe"], ["ぽ", "po"],
];

// Yoon 33 (standard) — composite syllables with ゃ ゅ ょ
const HIRA_YOON: Array<[string, string]> = [
  ["きゃ", "kya"], ["きゅ", "kyu"], ["きょ", "kyo"],
  ["しゃ", "sha"], ["しゅ", "shu"], ["しょ", "sho"],
  ["ちゃ", "cha"], ["ちゅ", "chu"], ["ちょ", "cho"],
  ["にゃ", "nya"], ["にゅ", "nyu"], ["にょ", "nyo"],
  ["ひゃ", "hya"], ["ひゅ", "hyu"], ["ひょ", "hyo"],
  ["みゃ", "mya"], ["みゅ", "myu"], ["みょ", "myo"],
  ["りゃ", "rya"], ["りゅ", "ryu"], ["りょ", "ryo"],
  ["ぎゃ", "gya"], ["ぎゅ", "gyu"], ["ぎょ", "gyo"],
  ["じゃ", "ja"], ["じゅ", "ju"], ["じょ", "jo"],
  ["びゃ", "bya"], ["びゅ", "byu"], ["びょ", "byo"],
  ["ぴゃ", "pya"], ["ぴゅ", "pyu"], ["ぴょ", "pyo"],
];

// -- Katakana --------------------------------------------------------

const KATA_BASIC: Array<[string, string]> = [
  ["ア", "a"], ["イ", "i"], ["ウ", "u"], ["エ", "e"], ["オ", "o"],
  ["カ", "ka"], ["キ", "ki"], ["ク", "ku"], ["ケ", "ke"], ["コ", "ko"],
  ["サ", "sa"], ["シ", "shi"], ["ス", "su"], ["セ", "se"], ["ソ", "so"],
  ["タ", "ta"], ["チ", "chi"], ["ツ", "tsu"], ["テ", "te"], ["ト", "to"],
  ["ナ", "na"], ["ニ", "ni"], ["ヌ", "nu"], ["ネ", "ne"], ["ノ", "no"],
  ["ハ", "ha"], ["ヒ", "hi"], ["フ", "fu"], ["ヘ", "he"], ["ホ", "ho"],
  ["マ", "ma"], ["ミ", "mi"], ["ム", "mu"], ["メ", "me"], ["モ", "mo"],
  ["ヤ", "ya"], ["ユ", "yu"], ["ヨ", "yo"],
  ["ラ", "ra"], ["リ", "ri"], ["ル", "ru"], ["レ", "re"], ["ロ", "ro"],
  ["ワ", "wa"], ["ヲ", "wo"], ["ン", "n"],
];

const KATA_DAKUTEN: Array<[string, string]> = [
  ["ガ", "ga"], ["ギ", "gi"], ["グ", "gu"], ["ゲ", "ge"], ["ゴ", "go"],
  ["ザ", "za"], ["ジ", "ji"], ["ズ", "zu"], ["ゼ", "ze"], ["ゾ", "zo"],
  ["ダ", "da"], ["ヂ", "ji"], ["ヅ", "zu"], ["デ", "de"], ["ド", "do"],
  ["バ", "ba"], ["ビ", "bi"], ["ブ", "bu"], ["ベ", "be"], ["ボ", "bo"],
  ["パ", "pa"], ["ピ", "pi"], ["プ", "pu"], ["ペ", "pe"], ["ポ", "po"],
];

const KATA_YOON: Array<[string, string]> = [
  ["キャ", "kya"], ["キュ", "kyu"], ["キョ", "kyo"],
  ["シャ", "sha"], ["シュ", "shu"], ["ショ", "sho"],
  ["チャ", "cha"], ["チュ", "chu"], ["チョ", "cho"],
  ["ニャ", "nya"], ["ニュ", "nyu"], ["ニョ", "nyo"],
  ["ヒャ", "hya"], ["ヒュ", "hyu"], ["ヒョ", "hyo"],
  ["ミャ", "mya"], ["ミュ", "myu"], ["ミョ", "myo"],
  ["リャ", "rya"], ["リュ", "ryu"], ["リョ", "ryo"],
  ["ギャ", "gya"], ["ギュ", "gyu"], ["ギョ", "gyo"],
  ["ジャ", "ja"], ["ジュ", "ju"], ["ジョ", "jo"],
  ["ビャ", "bya"], ["ビュ", "byu"], ["ビョ", "byo"],
  ["ピャ", "pya"], ["ピュ", "pyu"], ["ピョ", "pyo"],
];

// -- Hangul ----------------------------------------------------------

// Base syllables: 14 plain consonants × 5 base vowels (a/i/u/e/o → ㅏㅣㅜㅔㅗ).
// We expand by ㅏ/ㅓ/ㅗ/ㅜ/ㅡ/ㅣ (a, eo, o, u, eu, i) for broader coverage.
// Picked common entries; full table is 19×21 = 399, too many.
const HANGUL_BASIC: Array<[string, string]> = [
  // ㄱ row (g/k)
  ["가", "ga"], ["거", "geo"], ["고", "go"], ["구", "gu"], ["그", "geu"], ["기", "gi"],
  // ㄴ row (n)
  ["나", "na"], ["너", "neo"], ["노", "no"], ["누", "nu"], ["느", "neu"], ["니", "ni"],
  // ㄷ row (d/t)
  ["다", "da"], ["더", "deo"], ["도", "do"], ["두", "du"], ["드", "deu"], ["디", "di"],
  // ㄹ row (r/l)
  ["라", "ra"], ["러", "reo"], ["로", "ro"], ["루", "ru"], ["르", "reu"], ["리", "ri"],
  // ㅁ row (m)
  ["마", "ma"], ["머", "meo"], ["모", "mo"], ["무", "mu"], ["므", "meu"], ["미", "mi"],
  // ㅂ row (b/p)
  ["바", "ba"], ["버", "beo"], ["보", "bo"], ["부", "bu"], ["브", "beu"], ["비", "bi"],
  // ㅅ row (s)
  ["사", "sa"], ["서", "seo"], ["소", "so"], ["수", "su"], ["스", "seu"], ["시", "si"],
  // ㅇ row (vowel only, ng-final)
  ["아", "a"], ["어", "eo"], ["오", "o"], ["우", "u"], ["으", "eu"], ["이", "i"],
  // ㅈ row (j)
  ["자", "ja"], ["저", "jeo"], ["조", "jo"], ["주", "ju"], ["즈", "jeu"], ["지", "ji"],
  // ㅎ row (h)
  ["하", "ha"], ["허", "heo"], ["호", "ho"], ["후", "hu"], ["흐", "heu"], ["히", "hi"],
];

// Aspirated / tense initials (voiced equivalents)
const HANGUL_VOICED: Array<[string, string]> = [
  // ㅋ (k aspirated)
  ["카", "ka"], ["커", "keo"], ["코", "ko"], ["쿠", "ku"], ["키", "ki"],
  // ㅌ (t aspirated)
  ["타", "ta"], ["터", "teo"], ["토", "to"], ["투", "tu"], ["티", "ti"],
  // ㅍ (p aspirated)
  ["파", "pa"], ["퍼", "peo"], ["포", "po"], ["푸", "pu"], ["피", "pi"],
  // ㅊ (ch)
  ["차", "cha"], ["처", "cheo"], ["초", "cho"], ["추", "chu"], ["치", "chi"],
];

// Yoon-like: ㅑㅕㅛㅠㅒㅖ — palatalized vowels combined with key consonants
const HANGUL_YOON: Array<[string, string]> = [
  // ㅑ (ya)
  ["야", "ya"], ["갸", "gya"], ["냐", "nya"], ["랴", "rya"], ["먀", "mya"], ["뱌", "bya"],
  // ㅕ (yeo)
  ["여", "yeo"], ["겨", "gyeo"], ["녀", "nyeo"], ["려", "ryeo"], ["며", "myeo"], ["벼", "byeo"],
  // ㅛ (yo)
  ["요", "yo"], ["교", "gyo"], ["뇨", "nyo"], ["료", "ryo"], ["묘", "myo"], ["뵤", "byo"],
  // ㅠ (yu)
  ["유", "yu"], ["규", "gyu"], ["뉴", "nyu"], ["류", "ryu"], ["뮤", "myu"], ["뷰", "byu"],
];

// -- Generation helpers ----------------------------------------------

type Concept = {
  id: string;
  emoji: string;
  category: string;
  cefr: "A1";
  kind: "letter";
  visual?: { kind: "emoji"; asset: string };
};

type Translation = {
  conceptId: string;
  language: string;
  text: string;
};

// ja romaji-based slug with explicit overrides where two kana share the
// same Hepburn (じ/ぢ, ず/づ). We keep the secondary form on its Kunrei
// alias so the id stays unique and self-documenting.
const KANA_SLUG_OVERRIDES: Record<string, string> = {
  ぢ: "di",
  づ: "du",
  ヂ: "di",
  ヅ: "du",
};

function slugForKana(kana: string, romajiHint: string): string {
  const override = KANA_SLUG_OVERRIDES[kana];
  return override ?? romajiHint;
}

function slugForHiragana(kana: string, romaji: string): string {
  return `hira_${slugForKana(kana, romaji)}`;
}
function slugForKatakana(kana: string, romaji: string): string {
  return `kata_${slugForKana(kana, romaji)}`;
}
function slugForHangul(_syllable: string, romaja: string): string {
  return `hangul_${romaja}`;
}

interface ConceptGroup {
  deckId: string;
  deckTitle: string;
  deckDescription: string;
  category: string;
  language: "ja" | "ko";
  entries: Array<[string, string]>;
  slug: (s: string, romaji: string) => string;
}

const GROUPS: ConceptGroup[] = [
  {
    deckId: "ja_hiragana_basic_a1",
    deckTitle: "Hiragana — Basic",
    deckDescription: "46 base hiragana (vowels + k/s/t/n/h/m/y/r/w + ん).",
    category: "alphabet.hiragana.basic",
    language: "ja",
    entries: HIRA_BASIC,
    slug: slugForHiragana,
  },
  {
    deckId: "ja_hiragana_dakuten_a1",
    deckTitle: "Hiragana — Dakuten",
    deckDescription: "25 voiced/handakuten hiragana (g/z/d/b/p).",
    category: "alphabet.hiragana.dakuten",
    language: "ja",
    entries: HIRA_DAKUTEN,
    slug: slugForHiragana,
  },
  {
    deckId: "ja_hiragana_yoon_a1",
    deckTitle: "Hiragana — Yoon",
    deckDescription: "33 yoon (contracted) hiragana — きゃ / しゃ / ちゃ etc.",
    category: "alphabet.hiragana.yoon",
    language: "ja",
    entries: HIRA_YOON,
    slug: slugForHiragana,
  },
  {
    deckId: "ja_katakana_basic_a1",
    deckTitle: "Katakana — Basic",
    deckDescription: "46 base katakana.",
    category: "alphabet.katakana.basic",
    language: "ja",
    entries: KATA_BASIC,
    slug: slugForKatakana,
  },
  {
    deckId: "ja_katakana_dakuten_a1",
    deckTitle: "Katakana — Dakuten",
    deckDescription: "25 voiced/handakuten katakana.",
    category: "alphabet.katakana.dakuten",
    language: "ja",
    entries: KATA_DAKUTEN,
    slug: slugForKatakana,
  },
  {
    deckId: "ja_katakana_yoon_a1",
    deckTitle: "Katakana — Yoon",
    deckDescription: "33 yoon katakana — キャ / シャ / チャ etc.",
    category: "alphabet.katakana.yoon",
    language: "ja",
    entries: KATA_YOON,
    slug: slugForKatakana,
  },
  {
    deckId: "ko_hangul_basic_a1",
    deckTitle: "Hangul — Basic",
    deckDescription: "10 consonant rows × 6 vowels — the core syllable grid.",
    category: "alphabet.hangul.basic",
    language: "ko",
    entries: HANGUL_BASIC,
    slug: slugForHangul,
  },
  {
    deckId: "ko_hangul_aspirated_a1",
    deckTitle: "Hangul — Aspirated",
    deckDescription: "ㅋ ㅌ ㅍ ㅊ rows — aspirated initials.",
    category: "alphabet.hangul.aspirated",
    language: "ko",
    entries: HANGUL_VOICED,
    slug: slugForHangul,
  },
  {
    deckId: "ko_hangul_palatalized_a1",
    deckTitle: "Hangul — Palatalized",
    deckDescription: "ㅑㅕㅛㅠ vowel-yoon row.",
    category: "alphabet.hangul.palatalized",
    language: "ko",
    entries: HANGUL_YOON,
    slug: slugForHangul,
  },
];

// -- IO --------------------------------------------------------------

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

async function main(): Promise<void> {
  // 1. Build concept + translation rows
  const newConcepts: Concept[] = [];
  const transByLang = new Map<string, Translation[]>();

  for (const group of GROUPS) {
    if (!transByLang.has(group.language)) transByLang.set(group.language, []);
    const transList = transByLang.get(group.language)!;
    for (const [char, romaji] of group.entries) {
      const id = group.slug(char, romaji);
      newConcepts.push({
        id,
        emoji: char,
        category: group.category,
        cefr: "A1",
        kind: "letter",
        visual: { kind: "emoji", asset: char },
      });
      transList.push({ conceptId: id, language: group.language, text: romaji });
    }
  }

  // 2. Merge into concepts.json
  const conceptsFile = await readJson<{
    schema_version: number;
    concepts: Array<{ id: string }>;
  }>(CONCEPTS_FILE);
  if (!conceptsFile) throw new Error(`Cannot read ${CONCEPTS_FILE}`);

  // Cleanup: drop any earlier letter concepts with non-ASCII ids (legacy
  // from the first script revision that used kana char in slug).
  const nonAscii = /[^\x20-\x7E]/;
  const beforeClean = conceptsFile.concepts.length;
  conceptsFile.concepts = conceptsFile.concepts.filter(
    (c) => !nonAscii.test(c.id),
  );
  const cleaned = beforeClean - conceptsFile.concepts.length;
  if (cleaned > 0) {
    process.stdout.write(`cleaned up ${cleaned} legacy non-ASCII concept ids\n`);
  }

  const existingIds = new Set(conceptsFile.concepts.map((c) => c.id));
  let added = 0;
  let replaced = 0;
  for (const c of newConcepts) {
    if (existingIds.has(c.id)) {
      const idx = conceptsFile.concepts.findIndex((e) => e.id === c.id);
      conceptsFile.concepts[idx] = c;
      replaced += 1;
    } else {
      conceptsFile.concepts.push(c);
      added += 1;
    }
  }
  await writeJson(CONCEPTS_FILE, conceptsFile);
  process.stdout.write(`concepts: +${added}, replaced ${replaced}\n`);

  // 3. Merge into translations
  for (const [lang, newRows] of transByLang) {
    const file = path.join(TRANS_DIR, `${lang}.json`);
    const existing = await readJson<{
      schema_version: number;
      language: string;
      translations: Translation[];
    }>(file);
    const data = existing ?? {
      schema_version: 1,
      language: lang,
      translations: [] as Translation[],
    };

    // Cleanup: drop legacy non-ASCII conceptId rows.
    const beforeClean = data.translations.length;
    data.translations = data.translations.filter(
      (t) => !nonAscii.test(t.conceptId),
    );
    const cleaned = beforeClean - data.translations.length;
    if (cleaned > 0) {
      process.stdout.write(`cleaned ${cleaned} legacy translation rows in ${lang}\n`);
    }

    const existingKey = new Set(
      data.translations.map((t) => `${t.conceptId}|${t.language}`),
    );
    let tAdded = 0;
    let tReplaced = 0;
    for (const t of newRows) {
      const key = `${t.conceptId}|${t.language}`;
      if (existingKey.has(key)) {
        const idx = data.translations.findIndex(
          (x) => x.conceptId === t.conceptId && x.language === t.language,
        );
        data.translations[idx] = t;
        tReplaced += 1;
      } else {
        data.translations.push(t);
        tAdded += 1;
      }
    }
    await writeJson(file, data);
    process.stdout.write(`translations/${lang}.json: +${tAdded}, replaced ${tReplaced}\n`);
  }

  // 4. Write deck files
  for (const group of GROUPS) {
    const deckPath = path.join(DECKS_DIR, `${group.deckId}.json`);
    const deck = {
      id: group.deckId,
      title: group.deckTitle,
      cefr: "A1",
      description: group.deckDescription,
      conceptIds: group.entries.map(([char, romaji]) =>
        group.slug(char, romaji),
      ),
      estimated_minutes: Math.max(2, Math.round(group.entries.length / 12)),
      kind: "alphabet" as const,
      target: group.language,
    };
    await writeJson(deckPath, deck);
    process.stdout.write(`deck ${group.deckId}: ${deck.conceptIds.length} cards\n`);
  }

  process.stdout.write("\n✅ Done. Run `pnpm test` and `pnpm dev` to verify.\n");
}

main().catch((err) => {
  process.stderr.write(`generate-alphabet-decks failed: ${String(err)}\n`);
  process.exit(1);
});
