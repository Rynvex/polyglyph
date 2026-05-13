# Polyglyph — Progress Summary

> 整理日期:2026-05-13
> 用途:給新 session 快速理解現況的 single-page snapshot。
> 細節要追 → `OPEN_ISSUES.md` + 各 `docs/authoring/*`。

---

## 一句話

Polyglyph 是離線可玩、零 LLM 成本的多語對話 + 字彙 + 字母打字遊戲。**46 個對話 × 7 語言**、**452 個 vocab/letter concepts**、**1076 個自動化 test**。內容靠獨立 authoring session 寫進 staging,cron 06:00 自動 promote。

---

## 現況數字

| 指標 | 數量 |
|---|---|
| Dialogue blueprints | **46** |
| Dialogue translations | **322**(46 × 7 langs)|
| Vocab concepts(`kind === "noun/verb/adjective/phrase"`)| **140** |
| Letter concepts(`kind === "letter"`,字母練習)| **312**(208 ja + 104 ko)|
| Alphabet decks | **9** |
| Vocab decks | **11** |
| 支援語言 | **7**(en / zh-tw / ja / ko / es / it / de)|
| Tests | **1076 pass**(從 646 起算)|
| `pnpm validate-scripts` | **368 OK**(46 × 8)|
| Lint / Build | clean |

---

## 已完成的核心功能(按 feature area)

### A. 多語 IME 引擎(`lib/typing/ime/`)

- `JapaneseRomajiIME` — Kunrei→Hepburn 雙拼接受(玩家打 `si` 跟 `shi` 都過)
- `kanaToHepburn(kana)` — 純函式,wapuro 規則(`おう→ou`、`ん→n` always、`は/へ/を→ha/he/wo`)
- `hepburnToKana(ro)` — 反向,A3 migration 用
- `hangulToRomaja(hangul)` — Hangul → Revised Romanization,jamo 層分解
- `latinFold / germanFold` — es/it/de 重音剝離(`muchísimo→muchisimo`、`ä→ae`)
- 全部走 TDD,**482 IME-層 tests**

### B. 對話內容(`public/dialogues/`)

- 39 既有對話 + 7 新對話(`bus_ticket_a1`、`coffee_shop_order_a1` 等,從 cron pipeline 進)
- **Sprint 7 大手術**:21 個 ja 檔的 126 個 player template 完整重寫,改成 `display_furigana: [{ jp, kana }]` 結構;移除手寫 `ro` 帶來的羅馬字錯誤(`hunnijuppun`、`kanabi` 之類)
- ko schema 升級:支援 hangul display + 自動 RR 衍生
- es/it/de schema:支援 display 帶重音、text 自動 fold

### C. Vocab 字彙(`public/concepts/`)

- 140 個 A1 vocab(en/zh-tw/de/es/it/ja **+ko**)— ko 是這 session 新增
- 新 Concept schema:`pos`、`visual`、`frequency`、`examples`(G3 完成)
- 11 vocab decks(food、kitchen、body parts 等)

### D. Alphabet 字母練習 ★新功能(2026-05-13)

- **新 `kind: "letter"`**(Concept enum)
- **新 `target` 欄位**(Deck) — 強制 route 到對應語言
- **新 tab 系統**:VocabLanding 切 「Vocabulary / Alphabet」(localStorage 記住)
- **Shuffle toggle**:預設隨機,避免 aiueo 順序變成記憶包袱
- 內容:
  - **ja**:hiragana basic/dakuten/yoon + katakana basic/dakuten/yoon = 6 decks / 208 字
  - **ko**:hangul basic/aspirated/palatalized = 3 decks / 104 字
- VocabCard 對 letter 走特化渲染(大字 hero + 小 romaji label)

### E. UI / UX

- VocabCard hero 化(emoji `clamp(7rem,28vw,12rem)`)
- NativeLangPicker 在主頁(`navigator.language` 自動猜)
- LangPref state 拆 `nativeLang` / `targetLang` 兩個 key
- VocabLanding:Vocabulary / Alphabet tabs + CEFR pill + search + lang badge
- **Mastery 系統**:
  - `ScriptCard` 對 dialogue 顯示熟練度(new / practiced ✓ / mastered ✓✓ + 色帶)
  - `GroupMasteryStats` 群組顯示 `3/8 mastered`
- Dialogue 對應 nativeLang 選擇(`pickHint(template, lang)`)
- Sequential vs Random 切換寫在 typing panel 上方

### F. Authoring Pipeline(獨立 session 寫對話)

- `docs/authoring/START_HERE.md` — 新 session 入口 prompt
- `docs/authoring/RULES.md` — schema + 各語言 IME 慣例
- `docs/authoring/TOPIC_ROSTER.md` — 60 個預生主題(Obsidian 路徑可填)
- `docs/authoring/examples/` — 1 blueprint + 7 translations 範例
- `docs/authoring/SETUP.md` — 跨 OS(WSL / Native Windows / cloud sync)

### G. Automation(cron)

- `scripts/promote-generated.ts` 動 staging `${POLYGLYPH_STAGING:-./staging}/` → live `public/dialogues/`
  - flags:`--dry-run` / `--stable-after <sec>` / `--archive` / `--quiet`
  - 驗證:schema + IME validator + compose + duplicate check
  - 失敗 abort,不動任何檔
- `scripts/run-promote-cron.sh` 包裝(PATH / flock / log)
- 已裝 crontab:
  - `0 6 * * *` 每天 06:00
  - `@reboot sleep 120 && …` 重開後 catch-up
- log:`logs/promote-cron.log`
- 詳見 `docs/automation/CRON_SETUP.md`

### H. Validation / Audit 工具

| 命令 | 做什麼 |
|---|---|
| `pnpm validate-scripts` | 驗證 `public/dialogues` 全部 schema + IME |
| `pnpm audit-translations` | 跨語言翻譯漂移啟發式報告 |
| `pnpm audit-vocab` | vocab 覆蓋率 / schema 完整性 |
| `pnpm assign-visuals` | 對 Concept 套 visual 規則 |
| `pnpm promote-generated` | staging → live 安全 promote |
| `pnpm migrate-ja-furigana` | (一次性)ja `ro` → `kana` 遷移 |

### I. Schema 演進

| Schema | 主要欄位 |
|---|---|
| **Blueprint** | `id, level, topic, tags, turns[]`(speaker, has_templates)|
| **Translation** | `language, title, description, characters, turns{}` |
| **Concept** | `id, emoji, category, cefr, kind` + G3 加 `pos, visual, frequency` |
| **VocabTranslation** | `conceptId, language, text, romaji?, notes?, register?, examples?` |
| **Deck** | `id, title, cefr, conceptIds[], kind, target?` |

新 Concept.kind: `"letter"`,新 Deck.kind: `"vocab" | "alphabet"`、新 Deck.target(只 alphabet 用)。

---

## 已**刻意**沒做的事

| 項目 | 為什麼跳過 |
|---|---|
| ko 39 對話翻譯重寫(Sprint 3 B3)| 母語人 review 才有意義,延後 |
| es/de/it 重音回填 117 檔(Sprint 4 C3)| 同上 |
| Vocab 大量擴充到 10000 字(Sprint 6 G7+)| 沒 LLM API key + 沒人工 review |
| Real Playwright e2e | 沒裝 Playwright,沒擅自加 dep |
| Smart deck(SRS、弱項複習)| 需要 progress tracking 升級 |
| 字母純 jamo(ㄱ ㅏ)單獨打字 | jamo 不能單獨在 RR 打出來;改用 syllable |
| 大量翻譯母語 review | 用 `needs_native_review` flag 標,排後續 |

---

## 已知 open items(看 `docs/OPEN_ISSUES.md` 完整)

- 跑 `pnpm audit-translations` 產出 `docs/AUDIT_TRANSLATIONS.md`,檢視翻譯漂移 flag
- 跑 `pnpm audit-vocab` 產出 `docs/AUDIT_VOCAB.md`,檢視 vocab 覆蓋率
- `docs/VISUAL_STRATEGY.md` — 視覺策略草案(metonymy 對照表 30 個 pilot)

---

## 重點檔案 / 進入點

| 目的 | 路徑 |
|---|---|
| 主規範 | `CLAUDE.md` |
| 設計脈絡 | `DEVELOPMENT_PLAN.md` |
| 待辦 backlog | `docs/OPEN_ISSUES.md` |
| Authoring 入口 | `docs/authoring/START_HERE.md` |
| Cron 設定 | `docs/automation/CRON_SETUP.md` |
| Pipeline 主腳本 | `scripts/promote-generated.ts` |
| IME 主腳本 | `lib/typing/ime/{japanese-romaji,kana-to-hepburn,hangul-to-romaja,diacritic-fold}.ts` |
| Vocab UI | `components/{VocabLanding,VocabScene,VocabCard}.tsx` |
| Dialogue UI | `components/{DialogueScene,ScriptCard,GroupMasteryStats}.tsx` |

---

## 完成時序(粗略)

| Sprint | 日期 | 內容 |
|---|---|---|
| 1 | 05-11 | ja IME 整套(Kunrei normalizer + kanaToHepburn + schema + 39 檔遷移 + validator)|
| 2 | 05-11 | UI(VocabCard hero、NativeLangPicker、tab toggle、Dialogue nativeLang)|
| 3 | 05-11 | ko hangulToRomaja + ko schema + audit-translations |
| 4 | 05-11 | es/it/de diacritic fold + schema |
| 5 | 05-11 | Vocab 基礎建設(schema 升級、pipeline 工具、search/filter)|
| 6 | 05-11 | G6 batch 1 vocab seed(50 個 en+ja) |
| 7 | 05-11 | 21 ja 對話檔重寫(126 player templates;native-script-required validator)|
| 8 | 05-11 | Mastery 系統(ScriptCard、GroupMasteryStats)|
| 9 | 05-12 | Authoring pipeline + Cron 自動化 |
| 10 | 05-13 | Korean vocab(140 條)+ ja/ko alphabet drill(312 letters / 9 decks)+ shuffle / tab persistence |

---

## 給「下一步」討論的潛在方向

不是排序,只是清單(留給新 session 跟你討論):

### 短期內容補強
- 讓 authoring pipeline 也支援**生 vocab**(目前只生 dialogue)
- 把 alphabet decks 也加進 mastery 統計(目前 Mastery 只 dialogue)
- 韓文母語人 review 那 140 條 ko vocab + 104 個 hangul drill

### 中期 UX
- Smart deck(今日新詞 / 弱項複習 / 隨機混合)
- 跨 session 學習進度同步(目前只 localStorage,換瀏覽器就丟)
- TTS 完整化(已有 Web Speech 基礎,可考慮 cache 跟離線)
- 大量 deck 後的搜尋 / 分類 UX(目前 11 + 9 = 20 個 deck 還好,到 100+ 會痛)

### 中期內容擴充
- A2 字母拓展(ja 半濁/外來語表;ko 完整 batchim)
- Vocab 推進到 A1 滿(870 詞)— 需要 LLM 或大量人工
- 對話主題擴充(目前 46 個,roster 還剩 ~55 個未做)
- 加新語言(fr / pt / vi)— DEVELOPMENT_PLAN 明示「不在這 Roadmap」但 user 可能想討論

### 長期 / 結構性
- 帳號 + 雲端同步(SaaS 方向)
- 跟 LLM 整合(對話分支 / 即時生成 / 智能批改)— 但這違背「零 LLM 成本」初衷
- 行動裝置原生 app
- 多人 deck / 社群投稿
- SRS 間隔重複系統

每個方向都有 trade-off,**新 session 應該先問你優先序而不是擅自挑**。
