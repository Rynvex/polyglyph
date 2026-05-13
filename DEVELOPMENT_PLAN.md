# Polyglyph 開發計畫

> 起草日期:2026-05-07
> 重大轉向:2026-05-08 — 從 Python+Pygame 轉 Web(Next.js+TS)以方便分享 URL
> 主要技術棧:Next.js 16 + TypeScript strict + Tailwind v4 + zod + vitest

本文件是專案的**唯一主計畫**。架構決策、JSON schema、roadmap、核心邏輯、多語言策略全部在這裡。任何重大改動先更新此文件。

> **歷史筆記**:第一版 v0.1 用 Pygame 桌面實作完整跑通(38 unit tests 全綠);
> 後因「需要可分享的 URL」改寫為 Web 版,Pygame 程式碼已從 git 移除。
> 現有 `lib/typing/`、`lib/dialogue/`、`lib/data/` 是從 Python 規格 1:1 移植過來的 TypeScript 版本。

---

## 0. 命名

**Polyglyph** = polyglot(多語使用者)+ glyph(字符,致敬 Glyphica)

備案:Lingoglyph、ChatGlyph、TypeTongue

---

## 1. 專案架構

```
polyglyph/
├── package.json
├── pnpm-lock.yaml
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
├── README.md
├── CLAUDE.md
├── DEVELOPMENT_PLAN.md          ← 本文件
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  # Landing — 選腳本
│   ├── play/[scriptId]/page.tsx  # 對話頁(SSR 載 JSON + mount client scene)
│   └── globals.css
├── components/                   # React 元件
│   ├── ChatBubble.tsx            # 對話氣泡(speaker themed)
│   ├── TypingPanel.tsx           # cell-by-cell 打字區 + hint
│   └── DialogueScene.tsx         # "use client" — 唯一綁 keydown 的元件
├── lib/                          # ⚠️ 純邏輯,禁止 import React/next/瀏覽器 API
│   ├── typing/                   # 打字引擎
│   │   ├── engine.ts             # TypingSession + CharCell
│   │   ├── normalizer.ts         # 大小寫 / 重音容錯
│   │   ├── stats.ts              # WPM / accuracy / combo
│   │   └── ime/
│   │       ├── types.ts          # InputMethod interface
│   │       ├── direct.ts         # 拉丁系直接打
│   │       ├── romaji.ts         # 日文 romaji → kana(待做)
│   │       └── hangul.ts         # 韓文 jamo → 한글(待做)
│   ├── data/
│   │   ├── schema.ts             # zod: Dialogue / Turn / Template
│   │   └── loader.ts             # parse + validate(in-memory + fetch)
│   └── dialogue/
│       └── controller.ts         # 對話 traversal + TypingSession lifecycle
├── public/
│   ├── scripts/<lang>/<topic>_<level>.json
│   ├── audio/<lang>/<dialogue_id>/*.mp3   # 預生成 TTS(待做)
│   └── images/                            # 角色頭像、背景
├── assets/                       # 來源檔(字型/原始錄音),會在 build 拷到 public
└── tests/
    ├── setup.ts                  # vitest setup(jsdom + RTL cleanup)
    └── unit/
        ├── typing/               # engine, normalizer, stats, ime/*
        ├── data/                 # schema, loader
        ├── dialogue/             # controller
        └── components/           # ChatBubble, TypingPanel, DialogueScene
```

**規模目標:** 每檔 < 300 行,單一職責。

**Server vs Client component:**
- `app/**/page.tsx`、`app/layout.tsx` — server(SSR/SSG,讀檔案,SEO meta)
- `components/DialogueScene.tsx` — `"use client"`(綁 keydown,需要 useState)
- `components/ChatBubble.tsx` / `TypingPanel.tsx` — server-able(無 hooks),被 client 父層引用即自動 client

---

## 2. JSON 對話腳本格式

### 設計原則

- `schema_version` 必填(以後改格式才好遷移)
- player turn 給多個模板(主+變體),每個有獨立 id 跟可選分支
- 預先附中文 hint(教學用,可隱藏)
- TTS 路徑預生成(離線需求)

### 完整範例:`data/scripts/en/cafe_basic_a2.json`

```json
{
  "schema_version": 1,
  "id": "en.cafe_basic.a2",
  "language": "en",
  "level": "A2",
  "topic": "ordering_food",
  "title": "Coffee Shop Basics",
  "description": "Order a coffee and a pastry at a cafe.",
  "estimated_minutes": 3,
  "tags": ["food", "service", "casual"],
  "characters": {
    "bot":    { "name": "Barista", "avatar": "barista.png", "voice": "en-US-AriaNeural" },
    "player": { "name": "You" }
  },
  "turns": [
    {
      "id": "t1",
      "speaker": "bot",
      "text": "Hi there! What can I get you today?",
      "audio": "tts/en/cafe_basic/t1.mp3",
      "translation_zh": "嗨,今天要點什麼?"
    },
    {
      "id": "t2",
      "speaker": "player",
      "templates": [
        {
          "id": "t2.main",
          "text": "I'd like a medium latte, please.",
          "weight": 1.0,
          "hint_zh": "我想要一杯中杯拿鐵,謝謝。",
          "next": "t3.standard"
        },
        {
          "id": "t2.oat",
          "text": "Can I have a latte with oat milk?",
          "weight": 0.8,
          "hint_zh": "可以幫我加燕麥奶嗎?",
          "next": "t3.oat"
        }
      ]
    },
    {
      "id": "t3.standard",
      "speaker": "bot",
      "text": "One medium latte coming right up. Anything else?",
      "audio": "tts/en/cafe_basic/t3a.mp3"
    },
    {
      "id": "t3.oat",
      "speaker": "bot",
      "text": "Sure, oat milk it is. That'll be a dollar extra.",
      "audio": "tts/en/cafe_basic/t3b.mp3"
    }
  ],
  "rewards": {
    "complete":  { "xp": 50 },
    "perfect":   { "xp": 100, "badge": "barista_friend" }
  }
}
```

### Pydantic 驗證骨架

```python
# src/polyglyph/data/models.py
from typing import Literal, Optional
from pydantic import BaseModel

class Template(BaseModel):
    id: str
    text: str
    weight: float = 1.0
    hint_zh: Optional[str] = None
    next: Optional[str] = None

class Turn(BaseModel):
    id: str
    speaker: Literal["bot", "player"]
    text: Optional[str] = None
    templates: Optional[list[Template]] = None
    audio: Optional[str] = None
    translation_zh: Optional[str] = None

class Dialogue(BaseModel):
    schema_version: int
    id: str
    language: str
    level: Literal["A1", "A2", "B1", "B2", "C1"]
    topic: str
    title: str
    turns: list[Turn]
```

`tools/validate_scripts.py` 對全部 JSON 跑 `Dialogue.model_validate()`,放進 CI。

---

## 3. Roadmap

| 版本 | 範圍 | 狀態 |
|------|------|------|
| **v0.1** Dialogue MVP | 對話打字引擎、LINE-style UI、checkpoint、結算、cafe + 10 份對話 | ✅ 完成 |
| **v0.2** Polish | Live HUD、進度條、CapsLock 警告、Alt+R 重打、快捷鍵全流程、theme toggle(暗/亮/auto) | ✅ 完成 |
| **v0.3** Custom Dialogue (BYOK) | `/create` paste flow、OpenRouter 直連、export/import JSON、Resume banner | ✅ 完成 |
| **v0.4** Dialogue Pipeline | Sources / Drafts / Library 三段流程,Source 可重用、Draft 可審查/編輯、Tags + filter | 🚧 Next |
| **v0.5** Vocabulary MVP | Concept / Translation / Deck schema、共用詞庫、Picture→Word + Audio→Word、Web Speech audio、5 個 starter deck | 🔜 |
| **v0.6** SRS | Leitner 5-box 間隔複習,單字 + 對話共用、「今日複習」隊列、mastery dashboard | |
| **v0.7** Pipeline+ | URL fetch、batch generate、collections、bulk ops、re-generate variation | |
| **v0.8** Vocab+ | User-built decks、LLM 翻譯延伸、OpenMoji 升級、TTS BYOK 高音質、Cloze 模式 | |
| **v1.0** | 多語完整(義/德/西/日/韓 IME)、弱點分析、復用 deck 系統穩定 | |
| **v1.5+** | Workshop 分享、PWA 離線、雲端同步 | |
| **v2.0+** | 閱讀理解模式(讀 dialogue 不打字)、行動裝置原生 | |

**驗收原則:每個版本要能完整玩一個 loop**,不靠 placeholder。

### v0.1–v0.3 已完成(2026-05-08 ~ 05-09)

打字引擎、IME、Stats、控制器、UI、Pipeline copy-paste/BYOK、theme system 等都已 ship。

**測試總計:248 passed / lib 100% statements / build clean / lint clean**

---

### v0.4 + v0.5 — 雙 pillar MVP 設計

#### 產品架構

```
┌──────────────────┐      ┌──────────────────┐
│  Dialogue Pillar │      │  Vocab Pillar    │
│  (打語感)         │      │  (打基礎)         │
│  Sentence-level  │      │  Word-level      │
└──────────────────┘      └──────────────────┘
            ↓                        ↓
       ┌────────────────────────────────┐
       │ 共用基礎(已存在,不變)         │
       │ TypingEngine / IME / Stats     │
       │ Theme / Kbd / Layout shells    │
       │ localStorage CRUD / BYOK LLM   │
       └────────────────────────────────┘
```

**關鍵 insight:** TypingSession 已是通用引擎,vocab 一張 card = `target = "manzana"` 的單行 session。新增 vocab pillar **零引擎改動**,只是新資料層 + UI 殼。

#### v0.4 Dialogue Pipeline 流程

```
Sources(素材庫)──generate──▶ Drafts(待審) ──publish──▶ Library(練習用)
                                  │
                                  └── delete / regen / edit text / hint_zh
```

新資源:
- `lib/data/sources.ts` — Source CRUD(paste 文字,儲存於 localStorage)
- `lib/data/user-scripts.ts` 擴充 — `status: "draft" | "published"` + `tags: string[]` + `sourceId?: string`
- `lib/data/tags.ts` — 共用 tag 工具(Dialogue + Vocab 都用)

新頁面:
- `/sources` — 素材清單,可重用「同一個 source 再生一份對話」
- `/drafts` — 待審佇列,可 inline 編輯每 turn 的 text/hint_zh,publish 才上架
- `/` — 加 tabs `Library | Drafts (N) | Sources` + tag filter chips

#### v0.5 Vocab Module Schema

| 資源 | 描述 | 何處 |
|---|---|---|
| **Concept**(語意原子,語言無關) | `id`, `emoji`, `category`, `cefr`, `kind` | `public/concepts/concepts.json` |
| **Translation**(每語言一筆) | `conceptId`, `language`, `text`, `romaji?`, `notes?` | `public/concepts/translations/<lang>.json` |
| **Deck**(對應 dialogue script 的角色) | `id`, `title`, `cefr`, `conceptIds[]` | `public/decks/<id>.json` |

啟動 5 個 deck × ~80 concepts × 4 種語言(`en` / `zh-tw` / `ja` / `es`):
- `kitchen_a1`, `food_a1`, `body_parts_a1`, `numbers_a1`, `common_objects_a1`

練習模式:
- **Picture → Word** — 顯示 emoji,打目標語單字
- **Audio → Word** — `speechSynthesis.speak()` 唸 → 打單字

新元件:
- `lib/vocab/controller.ts`(類似 DialogueController)
- `lib/audio/web-speech.ts`(瀏覽器 TTS wrapper)
- `<VocabCard>` + `<VocabSession>`(reuse `<TypingPanel>` + `<DialogueSummary>`)

新路由:
- `/vocab` — deck 選擇頁
- `/vocab/[deckId]?lang=es` — 練習頁

Landing 加 pillar tabs:`Dialogues | Vocab`

---

## 4. 核心程式碼位置

> 舊版本(Pygame)的 Python 程式碼骨架已從本文件移除 — 直接讀以下 TS 原始碼跟測試,規格更精確。

| 概念 | 程式碼 | 測試 |
|---|---|---|
| 打字狀態機 | `lib/typing/engine.ts` | `tests/unit/typing/engine.test.ts` |
| 容錯 normalizer | `lib/typing/normalizer.ts` | `tests/unit/typing/normalizer.test.ts` |
| WPM/combo/accuracy | `lib/typing/stats.ts` | `tests/unit/typing/stats.test.ts` |
| IME 介面 | `lib/typing/ime/types.ts` | — |
| 拉丁系直打 IME | `lib/typing/ime/direct.ts` | `tests/unit/typing/ime/direct.test.ts` |
| 對話 schema (zod) | `lib/data/schema.ts` | `tests/unit/data/schema.test.ts` |
| JSON loader | `lib/data/loader.ts` | `tests/unit/data/loader.test.ts` |
| 對話 traversal | `lib/dialogue/controller.ts` | `tests/unit/dialogue/controller.test.ts` |
| 對話氣泡 | `components/ChatBubble.tsx` | `tests/unit/components/ChatBubble.test.tsx` |
| 打字 panel | `components/TypingPanel.tsx` | `tests/unit/components/TypingPanel.test.tsx` |
| Scene 整合 | `components/DialogueScene.tsx` | `tests/unit/components/DialogueScene.test.tsx` |

---

## 5. 多語言實作待辦

> v0.1 只做拉丁直打。下面是各語言新增 IME 時的契約。

### 5.1 IME interface(已定型)

```typescript
// lib/typing/ime/types.ts
export interface InputMethod {
  feed(raw: string): Iterable<string>;
  reset(): void;
  buffer(): string;
}
```

`feed` 收 raw 鍵盤字元、吐已 commit 的字元。直打 IME 一進一出;拼音/羅馬字 IME 累積到完成才吐。

### 5.2 待寫的 IME

| 語言 | 檔案 | 邏輯 | 依賴 |
|---|---|---|---|
| 日文 romaji | `lib/typing/ime/romaji.ts` | `ka` → `か`、`tt` → `っt`、末尾 `n` → `ん` | 自寫 ROMAJI_TABLE |
| 韓文 hangul | `lib/typing/ime/hangul.ts` | jamo → 한글 合字 | npm `hangul-js` 或自寫合字算法 |
| 中文 pinyin | `lib/typing/ime/pinyin.ts`(v1.5+) | pinyin → 字 | 詞頻字典 |

每個 IME 配對應 `tests/unit/typing/ime/<name>.test.ts`,**至少覆蓋對應語言的 ROMAJI_TABLE / 合字規則 + 邊界 case**。目標 95% coverage。

### 5.3 字型策略

`app/layout.tsx` 用 `next/font/google`:
- Latin:已用 Geist
- 加 CJK 時:`Noto_Sans_JP` + `Noto_Sans_KR` + `Noto_Sans_SC`,subset 跟 `display: 'optional'` 避免 CLS

---

## 6. UI 即時反饋

| 狀態 | 顏色(Tailwind) | 視覺 |
|---|---|---|
| Pending(光標前) | `text-zinc-500` | 待打 |
| Pending(在光標) | `border-b-2 border-sky-400 bg-sky-400/10` | 高亮指引 |
| Correct | `text-emerald-400` | 爽感 |
| Wrong | `text-rose-400` | 警示 |

效果待加(v0.3):combo flash、粒子、shake — 用 CSS animation + `framer-motion` 或純 CSS。

---

## 6.5 Content Roadmap(內容供給路線)

> 加入於 2026-05-09。引擎已過 MVP,瓶頸從**程式**轉到**內容**。
> 這節是給未來自己 / 協作者的 onboarding,寫作前先看。

### 現況快照(2026-05-09)

- **Concepts**: 140 個(原 80 + 新增 60)
- **Languages**: en / zh-tw / es / ja(每個 concept 必有翻譯,被 integrity test 強制)
- **Decks**: 11 個(原 5 + 新 6:travel / weather / family / emotions / time / transportation)
- **Dialogues**: 14 篇(原 11 + 新 3:`doctor_visit_a2`(formal)、`friends_catching_up_b1`(idiom-heavy)、`morning_commute_a2`(casual))
- **Register schema**: 已加入 `formal | neutral | casual | slang | idiom`,**多語體變體**已支援(同 conceptId 多筆 translation,各帶 register tag)

### 為什麼有 register?

> 「father」在中文有「父親 / 爸爸 / 老爸」三層;在日文有「chichi / otousan / oyaji」;
> 在西班牙文 「mamá」是 casual 但同字無重音 「mama」是「乳房」。
> 教學內容若只有一個 neutral 翻譯,使用者進真實場景會卡。

每筆 translation 可以打 `register` tag。整合性 test 會擋住非法值。**目前 UI 仍只顯示第一筆**,後續做 register 切換時不需動資料。

### 目標規模 vs 現況

| 里程碑 | Concepts | Decks | Dialogues | 說明 |
|-------|----------|-------|-----------|------|
| **現況** | 140 | 11 | 14 | A1 / A2 涵蓋日常基礎 |
| **M1** | 500 | 25 | 25 | A1 完整 + A2 過半,多 30 篇情境 |
| **M2** | 2000 | 80 | 60 | A1–B1 完整、含旅遊 / 工作 / 健康全套 |
| **M3** | 5000 | 200 | 120 | 達到 NGSL(New General Service List)前 5000 |
| **M4** | 10000 | 400 | 200 | 學測 / GRE / N1 等高階詞,媒體閱讀夠用 |

### 內容供給策略(三條路徑,擇一)

#### 路徑 A:LLM 半自動(推薦,單人可執行)

1. 寫 `scripts/seed-from-list.ts`:讀一份 `top_5000_en.txt`(NGSL 公開資料),呼叫 OpenRouter / Claude API 產生 4 語翻譯 + register tag
2. 每批 50 個,人工 review LSR(Low-confidence Set Review)10 個,合格率 ≥ 95% 才批量 merge
3. Diacritics 風險:加 `tests/data-vocab/ascii-only.test.ts` 檢查 es text 是否有非 ASCII(若有則必須有 notes 說明)
4. **預估時間**:M1(500)~ 4 hr,M2(2000)~ 12 hr,M3(5000)~ 25 hr

#### 路徑 B:NGSL/Frequency-list 直供

- 直接 fork 現成資料集(NGSL、Wiktionary frequency lists)
- 翻譯欄位手填
- **慢但品質可控**;適合 hobby 進度

#### 路徑 C:UGC(User-Generated Content)

- 開放使用者投稿 deck / concept,審核後合併
- v0.7 Pipeline+ 階段才考慮

### 寫作守則(明天的自己)

1. **先跑** `pnpm test tests/unit/data/vocab/integrity.test.ts` —— 改 concepts 必須伴隨 4 個翻譯檔同步,不然 21 條 invariant 會擋
2. **emoji 必填**:integrity test 強制
3. **register 用 tag 表示**,不要直接寫進 `text`(例:不要寫 「mama (casual)」 進 text 欄)
4. **diacritics 暫時走 ASCII**(es:café → cafe,notes 標明) — 等 SpanishIME 寫好再轉
5. **新 deck 至少 4 張卡**(integrity test 強制)
6. **dialogue register 用標籤**:在 `tags` 加 `casual` / `formal` / `idioms` / `slang` 任一,讓主頁可以分類

### 不在這 Roadmap 的事

- 圖片 / 視覺資產 — 另見 `/plan` 對話 2026-05-09 的「Sourcing Images for Vocab」討論,Tier 2 OpenMoji 路線優先
- 多人 deck / 社群分享 — 留到 v0.8+

---

## 6.6 Dialogue Authoring Pipeline(現行,2026-05-12 啟用)

對話內容(blueprint + 7 translations)透過**獨立 authoring session** 生成,經 staging → cron 自動 promote 進主線。**主開發 session 不直接寫對話到 `public/dialogues/`**,職責切分:

| 角色 | 範圍 |
|---|---|
| 主開發 session(這個 repo 平常的 Claude Code) | schema、IME、validator、lib、UI |
| Authoring session(獨立 Claude Code,可在不同機器) | 純生對話內容,讀 `docs/authoring/START_HERE.md` 照做 |
| Cron(localhost) | 自動驗證 staging 並 promote |

### 流程

```
authoring session 寫
   → ${POLYGLYPH_STAGING:-./staging}/{blueprints, translations}/     [staging]
   → cron 06:00 + @reboot 跑 scripts/run-promote-cron.sh
   → pnpm promote-generated --stable-after 120 --archive --quiet
       ├─ stable check(檔案 ≥ 2 min 未動才動)
       ├─ schema parse(BlueprintSchema + TranslationSchema)
       ├─ IME validator(validateTranslationIme)
       ├─ compose round-trip(composeDialogue 不 throw)
       └─ duplicate check(public/dialogues 不重 id)
   → public/dialogues/{blueprints, translations}/             [live]
   → ${POLYGLYPH_STAGING:-./staging}/_promoted/<YYYY-MM-DD>/<id>/      [archive]
```

任何 blocking 問題(schema / IME / compose / missing)→ **abort,一個檔不動**,記進 `logs/promote-cron.log` 等下次重試。Duplicate 跟 unstable 是 silent skip(等下次)。

### 重要文件位置

| 用途 | 檔案 |
|---|---|
| 給 authoring session 的入口 prompt | `docs/authoring/START_HERE.md` |
| Schema + 各語言 IME 慣例 | `docs/authoring/RULES.md` |
| 60 個預生主題 + OBSIDIAN_PATH 設定 | `docs/authoring/TOPIC_ROSTER.md` |
| 8 個範例檔(1 blueprint + 7 translations) | `docs/authoring/examples/` |
| 跨 OS setup(Windows / WSL / Linux) | `docs/authoring/SETUP.md` |
| Session 完成報告 | `docs/authoring/SESSIONS/<date>-<tag>.md` |
| Cron 設定 / 排查 | `docs/automation/CRON_SETUP.md` |

### Cron 安裝(已執行)

```cron
0 6 * * *                ~/polyglyph/scripts/run-promote-cron.sh
@reboot sleep 120 && …   (catch-up if machine was off at 6 AM)
```

cron daemon 預設開機自動啟動(`systemctl is-enabled cron` = enabled)。

### 跟 § 6.5 Content Roadmap 的關係

§ 6.5 講「**內容怎麼**生」(路徑 A/B/C — LLM 半自動 / 字源直供 / UGC)。
§ 6.6 講「**內容怎麼進主線**」(staging → validate → live → archive)。

當前實際採用 **§ 6.5 路徑 A 的變體**:authoring session 即「跑 LLM」(LLM = Claude session 本身),staging + cron 取代「人工 LSR review」的工程化部分。LSR 仍可手動跑(看 `audit-translations` 報告)。

---

## 7. 未來擴展方向

| 主題 | 描述 |
|------|------|
| **Workshop / 社群腳本** | 玩家分享 `.zip`(腳本 + TTS),app 內 import,GitHub Gist 訂閱 |
| **隨機 / 程序生成** | 同主題 N 套腳本,進場隨機抽;同 turn 多 template 隨機選 |
| **語音輸入(STT)** | Whisper.cpp 本地小模型,玩家可選打字或說 |
| **弱點 / SRS** | `data/progress/<player>/weakness.json` 累積打錯詞,Anki 風格 |
| **解鎖 / 成就** | 通關解鎖新主題 / 角色 / UI 主題 |
| **分支 + 多結局** | template `next` 已預留,UI 顯示分支點 |
| **Web 版 v2.0** | TypeScript 重寫核心,React + Canvas/PixiJS;共用 `data/scripts/*.json` |
| **行動版** | Godot 4 移植,GDScript 重寫 UI 層,JSON + IME 邏輯保留 |
| **多人對戰** | 兩玩家輪流扮演 player/bot,即時比 WPM,WebRTC |
| **AI 偏離模式(付費)** | LLM 生成自由 player 回應,embedding 比 template 給分;離線無 LLM 仍是預設 |

---

## 7.5 下一輪候選方向(規劃 session 2026-05-13)

> 狀態:**候選**,還沒選定哪個先動工。三個方向已對齊 user 偏好:
> 內容品質 > 數量、單人可維護、TDD、離線可玩 / 零 LLM 成本、Vercel 可部署。

### 方向 A — 跨系統學習進度 + Lite SRS(localStorage,無 backend)

**核心 insight**
現有 46 對話 + 312 字母 + 140 vocab 全部資產,只有 dialogue 那層有 mastery,vocab/alphabet 沒進度感。沒有「今天該練什麼」就是無止境隨機 — 這是語言 app 流失第一名原因。Lite SRS = 只看 due date 跟對錯次數,純 localStorage,上 Vercel 沒問題,把「已有的內容」變成「會教你的工具」。

**範圍**
- `lib/progress/` 新模組(純函式、TDD)
  - 紀錄事件:`{ kind: "dialogue-turn" | "vocab" | "letter", id, result, timestamp }`
  - SRS 演算法:候選 Leitner 三層 / Anki simplified / SM-2(待 user 對齊)
  - Due queue:`getDue(now, limit) → Item[]`
  - Migration:schema version 欄,localStorage key namespacing
- UI 整合三個 surface
  - VocabCard / AlphabetCard / DialogueScene 統一回報事件
  - 主頁 / VocabLanding 加「Today's queue」入口(N 個 due item,跨 kind 混合)
- 進度視覺化(輕量;不做圖表,只做小 badge / heatmap pill)

**估時** M(8–12h:lib TDD 4h + UI 整合 3h + migration 1h + 視覺化 2h + 測試 2h)

**風險**
- SRS interval 調校需實測,初始參數可能太密或太鬆 → 把 interval 表寫成 config 而非硬寫
- localStorage schema 變動洗掉舊使用者 mastery → 寫一次性 migration(舊 mastery key → 新 progress event seed)
- 三種 kind 的「正確」含金量不同(打對一個 hiragana ≠ 完成一句對話)→ event 帶 weight,SRS 計算前先 normalize

**耦合度** 低 — `lib/` 純新增、TDD 主場;UI 改三個現有元件;**不動 schema、不動 dialogue/concepts 內容**。

---

### 方向 B — Vocab ↔ Dialogue 雙向連結

**核心 insight**
目前兩套內容是平行宇宙。對話裡看到「切符」想立刻學成卡片 → 沒路。學完「謝謝」這張卡 → 沒辦法找到用到它的對話。連起來等於用 **0 行新內容**把現有資產的學習密度翻倍。

**範圍**
- Schema 加 `Translation.turns[].concepts: string[]`(或側檔 `mapping/<id>.json`)
- 自動 tagger:`scripts/tag-dialogue-concepts.ts`
  - en/es/it/de 用 word boundary regex + diacritic-fold 匹配
  - zh-tw 用 maximum-match(現有 vocab 詞表當字典)
  - ja 用 kana / kanji 子字串匹配 + furigana 對齊
  - ko 用 hangul 子字串 + 변형(用言活用)候選表
  - 全部生 **suggestion**,人工審後 commit(不全自動)
- UI:對話 turn 出現 vocab 時加微互動(hover 顯示 emoji + tap 開 mini drill)
- 反向:VocabCard 顯示「用過這字的對話 ×N」連結

**估時** M(10–14h:tagger 5h × 多語複雜度 + schema/validator 1h + authoring rules 1h + UI 4h + 測試 2h)

**風險**
- 7 語 tokenization 不一致,ja/zh/ko 不空白分詞 → 接受「不完美的 suggestion + 人工 review」工作流,不追求全自動
- 多義詞 false positive(英文 `table` 動詞 / 名詞)→ concept 已能分 `table_noun` / `table_verb`,但 tagger 沒上下文難判 → 標 ambiguous,人工確認
- 自動 tag 後 authoring session 不知道規則 → 更新 `docs/authoring/RULES.md`

**耦合度** 中 — 動 translation schema(加可選欄位,backwards-compat 簡單);validator 要驗 concept id 存在;authoring pipeline 要跑 tagger;UI 兩邊都動。**比 A 重,但價值持續**。

---

### 方向 C — 聚焦式品質清債(不擴量)

**核心 insight**
User 自己說「品質 > 數量」。三個已知具體債可以**在不需要母語 reviewer** 的前提下解掉,提升每一次 impression 的信任度。明確切割:**不**做需要 native speaker review 的 ko/es/de/it 翻譯重寫(Sprint 3 B3 / Sprint 4 C3 留著)。

**範圍**
- (a) 跑 `pnpm migrate-ja-furigana`(產生 worklist),處理「規則性可確定」的部分
  - 利用既有 `kanaToHepburn` 反向校驗,自動分類「規則差(は→wa)」vs「真錯」
  - 真錯的逐筆修
- (b) 跑 `pnpm audit-translations`,逐筆判定漂移 flag
  - 多數是長度差 > 2x 或 hint_zh 漂移,人工 5 分鐘 / 筆可結論
  - 結論:修 / 保留(註記理由)/ 標 `needs_native_review`
- (c) 跑 `pnpm audit-vocab`,補齊覆蓋率 gap

**估時** S–M(6–10h,純編輯活,有現成 audit 工具)

**風險**
- Scope creep 誘導跑去做 ko/es/de/it native review → 明確寫死「**不做**」於工作單頂端
- (a) 範圍判定錯,某些 `は→wa` 其實是錯不是規則差 → kanaToHepburn 規則先固化,有疑問就標 worklist 不擅自修

**耦合度** 低 — 純內容 + 既有 script,不動 lib、不動 schema、不動 UI。

---

### 三方向相互關係

```
   A (進度 + SRS) ──┐
                    ├──→ 開啟未來「智能推薦」
   B (Vocab↔Dialogue) ┘    (B 需要 A 的 progress 資料才好做 smart recommendation)

   C (品質清債) ── 獨立,任何時候可填空插入
```

**建議順序判斷**:A 是 B 的底盤(沒 progress 資料就推不出聰明的「下一張卡」);C 不依賴前兩者,可當 A/B 等待 review 或思考時的填空工。**初步傾向 A 先,B 次,C 穿插**。**待 user 確認**。

---

## 8. 風險與決策紀錄

| 風險 | 緩解 |
|------|------|
| 打字引擎邏輯錯誤蔓延全專案 | TDD,先把 typing_engine 跟 IME 全部測到 95% |
| 字型檔太大裝 release | 動態載入,只載當前語言;MVP 用 Noto Sans 就好 |
| pygame-ce 跨平台問題 | CI matrix(Linux/macOS/Windows)從第一天跑 |
| TTS 預生成耗時 | 用 `edge-tts` 免費 + `tools/tts_pregen.py` 批次跑 |
| JSON schema 隨開發改變 | `schema_version` 欄位 + migration script |

---

## 9. 開工 checklist

### v0.1 MVP(已完成 2026-05-08)

- [x] Next.js 16 + Tailwind v4 + TS strict scaffold
- [x] vitest + jsdom + RTL,80% coverage threshold
- [x] TDD `lib/typing/` engine、normalizer、stats、DirectIME(45 tests)
- [x] zod schema + loader(15 tests)
- [x] `lib/dialogue/controller`(10 tests)
- [x] `components/` ChatBubble + TypingPanel + DialogueScene(14 tests)
- [x] `app/page.tsx` + `app/play/[scriptId]/page.tsx`
- [x] `public/scripts/en/cafe_basic_a2.json`
- [x] `pnpm build` + `pnpm lint` 全綠
- [x] `pnpm start` 跑起來,`/` 跟 `/play/cafe_basic_a2` HTTP 200

### v0.2 Deploy 下一步

- [ ] `pnpm validate-scripts` script 寫完(`scripts/validate-scripts.ts`)
- [ ] GitHub Action:`pnpm install` → `pnpm test` → `pnpm build`
- [ ] `vercel deploy --prod`,拿到 URL
- [ ] README 加 Live Demo 連結
- [ ] tag v0.2
