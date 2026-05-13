# CLAUDE.md — Polyglyph

This file provides guidance to Claude Code when working in this repo.

## Project Context

Polyglyph 是語言學習打字對話遊戲(類 Glyphica + Duolingo),**Web 版**。完整背景見 [README.md](README.md) 跟 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)。

**最快進入點:[docs/PROGRESS.md](docs/PROGRESS.md)** — 現況數字、已做的事、進入點索引、潛在新方向都在一頁。

**Core insight:** 固定腳本 + 模板回應 + 打字玩法 = 離線可玩、零 LLM 成本、解決「不知道講什麼」的痛點。

## Tech Stack(do not deviate without discussion)

- **Next.js 16**(App Router, Turbopack)+ **TypeScript strict**
- **Tailwind v4**
- **zod** for JSON schema validation
- **vitest** + jsdom + @testing-library/react — TDD 必備
- **Playwright** for E2E(尚未加入)
- **pnpm** — package manager
- 部署目標:**Vercel**(靜態 + SSR 混合,可分享 URL)

## Architecture Boundaries(hard rules)

```
polyglyph/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing — 選腳本
│   ├── play/[scriptId]/    # 對話頁
│   ├── layout.tsx
│   └── globals.css
├── components/             # React 元件 — Client/Server 分清楚
│   ├── ChatBubble.tsx
│   ├── TypingPanel.tsx
│   └── DialogueScene.tsx   # "use client" — 需要 keyboard event
├── lib/                    # 純邏輯,**禁止 import React 或 next/***
│   ├── typing/             # 打字引擎
│   │   ├── engine.ts
│   │   ├── normalizer.ts
│   │   ├── stats.ts
│   │   └── ime/            # 各語言 IME 實作
│   │       ├── types.ts    # InputMethod interface
│   │       └── direct.ts
│   ├── data/
│   │   ├── schema.ts       # zod schemas
│   │   └── loader.ts
│   └── dialogue/
│       └── controller.ts   # 對話 traversal,純 logic
├── public/
│   └── scripts/<lang>/     # JSON dialogue scripts
└── tests/
    ├── unit/               # vitest unit + RTL component tests
    └── setup.ts
```

**鐵則:**
- `lib/` **禁止 import React、next/*、瀏覽器 API**(`window`/`document` 之類)。引擎是純 TS,要保持 Node + Edge runtime 都能跑。
- `lib/typing/ime/` 各 IME 一檔,共用 `ime/types.ts` 的 `InputMethod` interface。
- `components/DialogueScene.tsx` 是唯一綁 `keydown` 的地方,其他元件保持純展示。
- React 全部 immutable update — engine、stats、controller 都會回傳新物件。

## Coding Rules

- 每檔 < 300 行,每函式 < 50 行
- 不可 mutation:engine/stats/controller 已示範模式 — `{...s, ...patch}` 或 `arr.slice()`
- 不要寫 backwards-compat 層或半完成的 placeholder
- TypeScript strict 必填(連 test 也要)
- Code comments **English only**;chat 跟 user 用中文
- 公開函式 / 元件 props 都要 explicit type;區域變數讓 TS infer

## Testing Rules

- **TDD for `lib/`** 全部模組(這是核心)
- 元件測試用 `@testing-library/react`,測**行為**不測 className
- vitest 設 80% threshold(statements/branches/functions/lines)
- `tests/setup.ts` 每個 case 自動 cleanup

## Commands

```bash
# 開發
pnpm dev                     # localhost:3014
pnpm build                   # Next.js 生產編譯 + tsc strict
pnpm start                   # 跑生產 build

# 測試
pnpm test                    # vitest run(全部)
pnpm test:watch              # watch mode
pnpm test:cov                # 帶 coverage 報告

# Lint / 工具
pnpm lint                    # ESLint(Next.js + TS)
pnpm validate-scripts        # 驗證 public/dialogues 全部 JSON 合 schema

# 對話 / vocab 管理
pnpm promote-generated       # 從 ${POLYGLYPH_STAGING:-./staging}/ staging 提升對話到 public/dialogues/
                             #   常用 flags:--dry-run / --stable-after <sec> / --archive / --quiet
pnpm audit-translations      # 跨語言翻譯漂移啟發式報告 → docs/AUDIT_TRANSLATIONS.md
pnpm audit-vocab             # vocab 覆蓋率 / schema 完整性 → docs/AUDIT_VOCAB.md
pnpm assign-visuals          # 依規則填 Concept.visual.{kind, asset}
pnpm migrate-ja-furigana     # 一次性 ja 翻譯 ro→kana 遷移(已跑過,留作 reference)
```

## JSON Script Format

每個對話 = **1 blueprint + 7 translations**:

```
public/dialogues/
├── blueprints/<id>.json
└── translations/<id>/{en,zh-tw,ja,ko,es,it,de}.json
```

完整 schema + 範例在 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md#2-json-對話腳本格式) 跟 [docs/authoring/RULES.md](docs/authoring/RULES.md)(每個語言的 IME 慣例)。

寫新腳本前一律先跑 `pnpm validate-scripts`,確保符合 zod 模型 + 各語言 IME 規則(ja 必須有 `display_furigana[].kana` + native display 等)。

## Dialogue Authoring Pipeline

新對話由**獨立 Claude session** 生成(我們把它叫做 *authoring session*),經 staging → cron promote 進主線。**這個 session(主開發)不直接寫新對話到 `public/dialogues/`**,避免跟正在運行的 authoring session 撞同一個檔。

### 流程圖

```
authoring session(Windows / WSL / 任何裝置)
       ↓ 照 docs/authoring/START_HERE.md 寫
${POLYGLYPH_STAGING:-./staging}/{blueprints, translations}/   ← staging(跨裝置共用 mount)
       ↓ cron 每天 06:00 + 開機後 catch-up
       ↓ stable-check + IME validator + compose + dup check
public/dialogues/{blueprints, translations}/          ← live(主頁立刻看得到)
       ↓ archive
${POLYGLYPH_STAGING:-./staging}/_promoted/<YYYY-MM-DD>/<id>/   ← 歷史保存
```

### 關鍵文件

| 文件 | 用途 |
|---|---|
| [docs/authoring/START_HERE.md](docs/authoring/START_HERE.md) | 貼給新 authoring session 的入口 |
| [docs/authoring/RULES.md](docs/authoring/RULES.md) | Schema、各語言 IME 慣例、品質要求 |
| [docs/authoring/TOPIC_ROSTER.md](docs/authoring/TOPIC_ROSTER.md) | 60 個預生主題清單 + `OBSIDIAN_PATH` 設定 |
| [docs/authoring/examples/](docs/authoring/examples/) | 8 個範例檔(1 blueprint + 7 translations) |
| [docs/authoring/SETUP.md](docs/authoring/SETUP.md) | 4 種跨 OS setup(WSL / Native Windows / Linux / cloud sync) |
| [docs/automation/CRON_SETUP.md](docs/automation/CRON_SETUP.md) | cron job 安裝 / 排查 / 改時間 / 移除 |

### 主開發 session(我)的責任

- ❌ **不要直接寫新對話到 `public/dialogues/`** — 那是 authoring session 的工作
- ✅ 可以 **改 schema / 規則 / IME / validator**(這是 lib 層,authoring session 不該動)
- ✅ 可以**改既有對話**修 bug(如 Sprint 7 的 21 檔 ja 重寫)— 但要謹慎,因為 authoring 流程可能對某些舊對話有依賴
- ✅ 可以**手動跑** `pnpm promote-generated` 提前 promote(若不想等 06:00)

### 已裝的 cron

```cron
0 6 * * *               ~/polyglyph/scripts/run-promote-cron.sh
@reboot sleep 120 && …  (同上,catch-up)
```

詳細在 [docs/automation/CRON_SETUP.md](docs/automation/CRON_SETUP.md)。

## Workflow Reminders

1. **大功能先寫 plan** — 用 `/plan` 或 planner agent
2. **核心邏輯先寫 test**(`lib/typing/`、IME、normalizer、controller)
3. **寫完 code** 立刻 `/code-review`
4. **commit message** 用 conventional format:`feat(typing): ...`、`fix(ime/romaji): ...`
5. UI 改動完 → `pnpm build` 過 + 開 `pnpm dev` 用實際打字測過再說 done

## What NOT to Do

- ❌ 不要在 `lib/` 寫 `import React` 或 `import 'next/...'`
- ❌ 不要為了「以防萬一」加 fallback / try-catch 包整段
- ❌ 不要把 dialogue 邏輯寫死在 `components/` 裡 — 全部從 JSON 經過 controller
- ❌ 不要在 server component 裡用 `window`/`document`
- ❌ 不要 mutate state,React 18+ 對 referential equality 很敏感
- ❌ 不要直接寫新對話到 `public/dialogues/`(走 authoring pipeline,見上一段)
- ❌ 不要動 `${POLYGLYPH_STAGING:-./staging}/_promoted/` 已歸檔的對話(主線版本是 SSOT)

## Local Dev Port

Default dev port: **3014**(see `package.json` `dev` script). Change with `pnpm dev -- -p <port>` if it clashes.
