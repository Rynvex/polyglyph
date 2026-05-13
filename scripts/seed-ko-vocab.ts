#!/usr/bin/env tsx
/**
 * seed-ko-vocab — one-shot inject of 140 Korean translations for the
 * existing vocab catalog (A1 concepts only). Idempotent: replaces rows
 * that already exist by conceptId.
 *
 * Translations are written from training knowledge; expect a follow-up
 * native-speaker review for register / colloquial vs literary choices.
 * `needs_native_review: true` is *not* set per-row because the project
 * doesn't currently model that flag — track in docs/AUDIT_VOCAB.md
 * instead.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const KO_FILE = path.resolve("public/concepts/translations/ko.json");

interface Translation {
  conceptId: string;
  language: "ko";
  text: string;
  notes?: string;
}

// text = Revised Romanization (typing target), notes = 한글
const ROWS: Array<[string, string, string]> = [
  // food.fruit / food.staple / food.protein / food.dish / food.drink
  ["apple", "sagwa", "사과"],
  ["banana", "banana", "바나나"],
  ["bread", "ppang", "빵"],
  ["cheese", "chijeu", "치즈"],
  ["egg", "gyeran", "계란"],
  ["fish", "saengseon", "생선"],
  ["chicken", "dakgogi", "닭고기"],
  ["rice", "bap", "밥"],
  ["soup", "guk", "국"],
  ["salad", "saelleodeu", "샐러드"],
  ["water", "mul", "물"],
  ["coffee", "keopi", "커피"],
  ["tea", "cha", "차"],
  ["milk", "uyu", "우유"],
  ["juice", "juseu", "주스"],
  ["wine", "wain", "와인"],

  // kitchen
  ["knife", "kal", "칼"],
  ["fork", "pokeu", "포크"],
  ["spoon", "sutgarak", "숟가락"],
  ["plate", "jeopsi", "접시"],
  ["cup", "keop", "컵"],
  ["bottle", "byeong", "병"],
  ["pot", "naembi", "냄비"],
  ["fridge", "naengjanggo", "냉장고"],
  ["stove", "gaseureinji", "가스레인지"],
  ["oven", "obeun", "오븐"],
  ["table", "siktak", "식탁"],
  ["chair", "uija", "의자"],
  ["salt", "sogeum", "소금"],
  ["pepper", "huchu", "후추"],
  ["sugar", "seoltang", "설탕"],
  ["butter", "beoteo", "버터"],

  // body
  ["head", "meori", "머리"],
  ["eye", "nun", "눈"],
  ["ear", "gwi", "귀"],
  ["nose", "ko", "코"],
  ["mouth", "ip", "입"],
  ["tooth", "chia", "치아"],
  ["hand", "son", "손"],
  ["arm", "pal", "팔"],
  ["leg", "dari", "다리"],
  ["foot", "bal", "발"],
  ["heart", "simjang", "심장"],
  ["hair", "meorikarak", "머리카락"],
  ["finger", "songarak", "손가락"],
  ["knee", "mureup", "무릎"],
  ["shoulder", "eokkae", "어깨"],
  ["back", "deung", "등"],

  // numbers (native Korean numbers — pure-Korean系)
  ["one", "hana", "하나"],
  ["two", "dul", "둘"],
  ["three", "set", "셋"],
  ["four", "net", "넷"],
  ["five", "daseot", "다섯"],
  ["six", "yeoseot", "여섯"],
  ["seven", "ilgop", "일곱"],
  ["eight", "yeodeol", "여덟"],
  ["nine", "ahop", "아홉"],
  ["ten", "yeol", "열"],
  ["twenty", "seumul", "스물"],
  ["fifty", "swin", "쉰"],
  ["hundred", "baek", "백"],
  ["thousand", "cheon", "천"],
  ["first", "cheotjjae", "첫째"],
  ["second", "duljjae", "둘째"],

  // common objects
  ["key", "yeolsoe", "열쇠"],
  ["phone", "jeonhwa", "전화"],
  ["book", "chaek", "책"],
  ["pen", "pen", "펜"],
  ["bag", "gabang", "가방"],
  ["umbrella", "usan", "우산"],
  ["watch", "sigye", "시계"],
  ["wallet", "jigap", "지갑"],
  ["money", "don", "돈"],
  ["ticket", "pyo", "표"],
  ["passport", "yeogwon", "여권"],
  ["computer", "keompyuteo", "컴퓨터"],
  ["camera", "kamera", "카메라"],
  ["door", "mun", "문"],
  ["window", "changmun", "창문"],
  ["key_card", "kikadeu", "키카드"],

  // places (travel)
  ["airport", "gonghang", "공항"],
  ["hotel", "hotel", "호텔"],
  ["station", "yeok", "역"],
  ["city", "dosi", "도시"],
  ["country", "nara", "나라"],
  ["beach", "haebyeon", "해변"],
  ["mountain", "san", "산"],
  ["hospital", "byeongwon", "병원"],
  ["park", "gongwon", "공원"],
  ["museum", "bakmulgwan", "박물관"],

  // weather
  ["sun", "hae", "해"],
  ["rain", "bi", "비"],
  ["snow", "nun", "눈"],
  ["wind", "baram", "바람"],
  ["cloud", "gureum", "구름"],
  ["storm", "pokpung", "폭풍"],
  ["fog", "angae", "안개"],
  ["rainbow", "mujigae", "무지개"],
  ["lightning", "beongae", "번개"],
  ["moon", "dal", "달"],

  // family
  ["mother", "eomeoni", "어머니"],
  ["father", "abeoji", "아버지"],
  ["sister", "jamae", "자매"],
  ["brother", "hyeongje", "형제"],
  ["friend", "chingu", "친구"],
  ["baby", "agi", "아기"],
  ["child", "ai", "아이"],
  ["family", "gajok", "가족"],
  ["grandfather", "harabeoji", "할아버지"],
  ["grandmother", "halmeoni", "할머니"],

  // emotions (dictionary form, -하다)
  ["happy", "haengbokhada", "행복하다"],
  ["sad", "seulpeuda", "슬프다"],
  ["angry", "hwanada", "화나다"],
  ["tired", "pigonhada", "피곤하다"],
  ["scared", "museopda", "무섭다"],
  ["surprised", "nollada", "놀라다"],
  ["calm", "chabunhada", "차분하다"],
  ["excited", "sinnada", "신나다"],
  ["bored", "jiruhada", "지루하다"],
  ["nervous", "ginjanghada", "긴장하다"],

  // time
  ["day", "nal", "날"],
  ["night", "bam", "밤"],
  ["morning", "achim", "아침"],
  ["evening", "jeonyeok", "저녁"],
  ["today", "oneul", "오늘"],
  ["tomorrow", "naeil", "내일"],
  ["yesterday", "eoje", "어제"],
  ["hour", "sigan", "시간"],
  ["minute", "bun", "분"],
  ["week", "ju", "주"],

  // transportation
  ["car", "jadongcha", "자동차"],
  ["bus", "beoseu", "버스"],
  ["train", "gicha", "기차"],
  ["plane", "bihaenggi", "비행기"],
  ["bike", "jajeongeo", "자전거"],
  ["taxi", "taeksi", "택시"],
  ["boat", "bae", "배"],
  ["road", "gil", "길"],
  ["motorcycle", "otobai", "오토바이"],
  ["subway", "jihacheol", "지하철"],
];

async function main(): Promise<void> {
  const raw = await fs.readFile(KO_FILE, "utf-8");
  const data = JSON.parse(raw) as {
    schema_version: number;
    language: string;
    translations: Translation[];
  };

  const conceptIds = new Set(ROWS.map(([id]) => id));
  // Drop any existing vocab rows we're about to replace (preserve letter rows)
  const before = data.translations.length;
  data.translations = data.translations.filter(
    (t) => !conceptIds.has(t.conceptId),
  );
  const dropped = before - data.translations.length;

  for (const [conceptId, text, notes] of ROWS) {
    data.translations.push({ conceptId, language: "ko", text, notes });
  }

  await fs.writeFile(KO_FILE, JSON.stringify(data, null, 2) + "\n", "utf-8");
  process.stdout.write(
    `seed-ko-vocab: ${ROWS.length} rows written (replaced ${dropped}). ko.json now has ${data.translations.length} translations total.\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`seed-ko-vocab failed: ${String(err)}\n`);
  process.exit(1);
});
