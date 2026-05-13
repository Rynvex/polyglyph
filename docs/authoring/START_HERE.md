# Polyglyph — Dialogue Authoring Session

> **貼這份文件**(或它的路徑)**給新的 Claude Code session**,作為第一個訊息。
> 這份文件 OS-agnostic — 不管你跑 Windows、WSL、macOS、Linux 都能照做。

---

## 0. Setup — 第一次開 session 必看

工作目錄(以下統稱 `<PROJECT_ROOT>`)會根據你的 OS 不同:

| 環境 | `<PROJECT_ROOT>` 範例 |
|---|---|
| **WSL on Windows**(從 WSL 終端跑 Claude Code) | `~/polyglyph` |
| **Native Windows**(專案 clone 到 Windows 本機) | `C:\polyglyph`(對 PowerShell)或 `C:/polyglyph`(對 Node 工具) |
| **Windows → WSL 共享**(Windows 上的 Claude Code 透過 `\\wsl.localhost\` 存取 Ubuntu 檔) | `\\wsl.localhost\Ubuntu\home\<you>\polyglyph` |
| **Linux / macOS** | `/home/<user>/polyglyph` 或類似 |

開工前**先確認**:

1. **你是否能跑 `pnpm`?** 試:
   - bash / WSL:`pnpm --version`
   - PowerShell:`pnpm --version`(若 Windows 有裝 Node + pnpm 就能跑)
   - 跑不了 → 詳見 §0.2 「不能跑 shell 命令時」
2. **你的工作目錄在哪?** 用 `pwd`(bash)或 `Get-Location`(PowerShell)確認,並在心裡 / 草稿區記下這個值是 `<PROJECT_ROOT>`。後面所有路徑都從那裡算。
3. **確認讀寫權限**:在 `<PROJECT_ROOT>/docs/authoring/SESSIONS/` 建一個臨時檔(例 `_probe.txt`),寫完刪掉,確認你能讀寫。

### 0.1 各 OS 的等價命令對照

| 目的 | bash / WSL / macOS | PowerShell (Windows) |
|---|---|---|
| 切目錄 | `cd <PROJECT_ROOT>` | `Set-Location <PROJECT_ROOT>` 或 `cd <PROJECT_ROOT>` |
| 看當前目錄 | `pwd` | `Get-Location` 或 `pwd` |
| 列檔 | `ls public/dialogues/blueprints/` | `Get-ChildItem public/dialogues/blueprints/` 或 `ls public/dialogues/blueprints/` |
| 找檔(遞迴) | `find <path> -name "*.md"` | `Get-ChildItem -Recurse -Filter "*.md" <path>` |
| 跑 validator | `pnpm validate-scripts` | `pnpm validate-scripts`(一樣) |

`pnpm`、`node`、`tsx` 在兩個環境都一樣 — 你只要會切目錄跟列檔就行。

### 0.2 不能跑 shell 命令時(純 Claude Desktop / 純 MCP filesystem)

如果你只能讀寫檔(不能跑 pnpm / shell):

- **驗證對話格式**:用 Read 工具讀回你剛寫的 JSON,人工檢查 §RULES.md 的規則
- **id 衝突檢查**:用 Read / List 工具列 `<PROJECT_ROOT>/public/dialogues/blueprints/`,人眼比對
- **session 結束時**:在 session 報告明寫:「我無法跑 `pnpm validate-scripts`,請人類 owner 在自己機器跑驗證」

剩下流程一樣。

---

## 1. 你是誰

你是 Polyglyph 的對話腳本作者。今天的任務:**生成 2–3 個新對話腳本**,寫進這個專案的對話資料夾,讓玩家可以馬上練習。

---

## 2. 必讀清單(照順序)

開工前**全部讀完**:

1. **`<PROJECT_ROOT>/docs/authoring/RULES.md`** — 對話腳本的 schema、各語言慣例、品質要求。**最重要的一份**。
2. **`<PROJECT_ROOT>/docs/authoring/TOPIC_ROSTER.md`** — 待生成主題清單 + Obsidian 取材對照。**你今天從這找 2–3 個未完成項目**。
3. **`<PROJECT_ROOT>/docs/authoring/examples/` 整個資料夾** — 1 個 blueprint 範例 + 7 個翻譯範例(每個語言一份)。照這格式寫。

讀完後**確認你看懂了**才動手。如果有任何規則模糊,在 RULES.md 找答案;找不到就在 session 報告末段 flag 出來給人類 owner。

---

## 3. 今天的工作流程

### Step 1 — 選主題

讀 `<PROJECT_ROOT>/docs/authoring/TOPIC_ROSTER.md`,找最上面 2–3 個 `[ ]`(未完成)的列。**最多 3 個**,品質 > 量。

每列格式:
```
- [ ] 2026-05-12 | <topic> | <level> | <blueprint_id> | <一行情境描述> | obsidian:<note title>
```

`obsidian:<note title>` 是**可選的**取材線索。**只有當 user 把 Obsidian 路徑寫在 roster 頂端的 `OBSIDIAN_PATH=` 設定行,並且 note 標題對得上時才讀**。否則純靠 RULES.md + 你自己的訓練知識寫。

### Step 2 — 確認 blueprint id 沒重複

bash / WSL:
```bash
ls public/dialogues/blueprints/
```

PowerShell:
```powershell
Get-ChildItem public/dialogues/blueprints/
```

純 MCP filesystem:用 List/Read 工具列 `public/dialogues/blueprints/`。

如果你選的 `blueprint_id` 已存在,換一個或在 roster 行末加 `(skip — id-collision)`。

### Step 3 — Obsidian 取材(若 user 開啟)

如果 roster 頂端 `OBSIDIAN_PATH=` 有值**且**該列有 `obsidian:<note title>`:

1. **找 note**:
   - bash / WSL:`find "$OBSIDIAN_PATH" -iname "*<keyword>*.md"`
   - PowerShell:`Get-ChildItem -Recurse -Filter "*<keyword>*.md" "$env:OBSIDIAN_PATH"`
   - 純 MCP:用 List 工具列 OBSIDIAN_PATH,找匹配檔名
2. **讀 note 內容**(`Read` 工具)
3. **提取最有教學價值的 1–2 個 takeaway** — 不要把整篇塞進對話
4. **對話的 `description` 標注來源**:`"based on Obsidian note: <note title>"`

**安全規則**:不要把 Obsidian 個人筆記原文直接複製進對話。對話要是一段**情境角色扮演**,不是 note dump。

### Step 4 — 寫 8 個檔

每個主題寫:
- `public/dialogues/blueprints/<blueprint_id>.json`
- `public/dialogues/translations/<blueprint_id>/{en,zh-tw,ja,ko,es,it,de}.json`

照 `docs/authoring/examples/` 的格式來。每個翻譯都要照該語言的 schema 規則(見 RULES.md)。

> **Windows 路徑注意**:寫檔時用工具給你的相對路徑(`public/dialogues/...`),不要混入 `\` 跟 `/`。Read/Write 工具吃**正斜線 `/`** 在所有 OS 都 work。

### Step 5 — 跑 validator(能跑 shell 時)

```
pnpm validate-scripts
```

**必須通過**。任何 FAIL 都得當場修。validator 主要會檢查:
- ja player template 有 `display_furigana[].kana`,且 kana 不含漢字
- ja text 是純 ASCII(現在 compose 層自動算,你不該手寫)
- ko 用 hangul display 或 ASCII RR
- 結構性 schema 完整

**不能跑 shell 時**:跳過,在 session 報告寫「validator pending — 請 owner 跑」。

### Step 6 — 自我審查(必做)

寫完所有對話後,**對每個對話、每個 turn** 過下方 checklist:

#### 內容自審

- [ ] **語意自洽** — bot 跟 player turn 接得起來嗎?有沒有 player 答非所問?
- [ ] **register 一致** — 同一個 blueprint 7 個語言維持相似的禮貌度 / 口語度?
- [ ] **長度合理** — bot 1–2 句、player 1–2 句。沒有 1 句 30 個字的怪物。
- [ ] **沒漏譯** — 7 個翻譯都有寫,bot turn 跟 player turn 都齊。
- [ ] **hint_zh 寫了** — 每個 player template 都有 `hint_zh` 解釋意思。

#### 各語言自審

**ja**:
- [ ] 每個 player template 的 `display` 含真正的日文(漢字 / 假名 / 片假名),不是純 ASCII。
- [ ] 每個 `display_furigana` 段都是 `{ "jp": "...", "kana": "..." }`,kana 不含漢字。
- [ ] 用 wapuro Hepburn 心智模型驗算:`おう→ou`、`は/へ/を` 字面寫 `ha/he/wo`(不是 wa/e/o)、`ん→n` always。
- [ ] 不要手寫 `text` 欄位 — 讓 compose 層從 kana 自動算。

**ko**:
- [ ] `display` 用 한글。可以選擇省略 `text`(compose 自動由 hangulToRomaja 算),或同時提供 `text` 並確認跟 hangulToRomaja(display) 完全一致。
- [ ] 沒有混雜未翻譯的英文片段。

**es / it / de**:
- [ ] `display` 可帶重音(es: `áéíóúñ¿¡`,it: `àèéìòù`,de: `äöüß`),`text` 用 ASCII(de 用 `ae/oe/ue/ss`)。
- [ ] 若不寫 text,compose 會自動 fold。

**en / zh-tw**:
- [ ] en 全 ASCII,zh-tw 用繁體中文,display = text 可省略 display。

#### 結構自審

- [ ] `pnpm validate-scripts` 跑過(若你能跑 shell),沒新增 FAIL。
- [ ] 對應 7 個翻譯檔的 turn id 跟 blueprint 一致(t1, t2, t3...)。
- [ ] 玩家 turn 數 = blueprint 的 `has_templates: true` 數量。

### Step 7 — 更新 TOPIC_ROSTER.md

把你完成的列從 `[ ]` 改成 `[x]`,在行末加 ` ← done <YYYY-MM-DD>`。

如果某列你**跳過**(主題太敏感、id 衝突、Obsidian 找不到 note 等),改成 `[s]` + 原因。

### Step 8 — 寫 session 報告

在 `docs/authoring/SESSIONS/` 底下新增 `<YYYY-MM-DD>-<session-tag>.md`:

```markdown
# Authoring Session — 2026-05-12 (session-tag-here)

## Environment
- OS: Windows 11 / WSL Ubuntu / macOS …
- Could run `pnpm`: yes / no

## Generated
- `morning_routine_a1` — based on Obsidian note: <title>
- `post_office_a2` — pure synthesis

## Skipped
- (none)

## Self-audit flags (人類 review 時注意這幾項)
- `morning_routine_a1` t6 ja: register slightly more formal than other languages — please verify
- `post_office_a2` t4 ko: liaison rule applied manually, double-check 한글 reading

## Validator
- pnpm validate-scripts: 318 OK (was 312, +6)
- 或:pending (couldn't run shell)

## Time spent
- ~40 min
```

---

## 4. 不要做的事(硬規則)

- ❌ **不要改既有 39 個 blueprint** 或它們的翻譯。你只**新增**。
- ❌ **不要動 `lib/`、`scripts/`、`tests/`、schema、validator** 等任何程式碼。你只動 `public/dialogues/` 跟 `docs/authoring/`。
- ❌ **不要 commit、push、或 `git` 動作** — 純檔案輸出。
- ❌ **不要在 main 上做 destructive 操作**。
- ❌ **不要把 Obsidian 個人筆記原文直接複製** — 抽 takeaway,寫成情境對話。
- ❌ **不要造 B1+ 等級的對話給 ko / es / it / de 作為主要學習目標** — 那幾個語言玩家還在初學。**B1+ 的對話內部仍要 7 種翻譯都寫**,但設計時 register / 用字偏向 en+ja 學習者。
- ❌ **不要連續寫超過 3 個對話** — 品質會掉。寫 3 個就停手寫 session 報告。

---

## 5. 等級 / 主題分配偏好(人類 owner 的方針)

| 等級 | 占比 | 主要服務語言 | 備註 |
|---|---|---|---|
| A1 | ~25% | 所有 7 語言 | 7 種翻譯都簡單,玩家任何語言都能練 |
| A2 | ~33% | 所有 7 語言 | 同上 |
| B1 | ~25% | en + ja | ko/es/it/de 翻譯仍要寫,但設計時偏 en+ja 學習者 |
| B2 | ~12% | en + ja | 同上 |
| C1 | ~5% | en + ja | 同上 |

**主題輪換**:`daily / travel / food / services / work / tech / mind` 七大主題,每天挑 2–3 個別讓主題重複。

---

## 6. 開始的指令

直接回覆人類:

> 「我讀完了 START_HERE.md。我的工作目錄是 `<填入>`,OS 是 `<Windows / WSL / macOS / Linux>`,能跑 `pnpm`(yes / no)。接下來我會讀 RULES.md、TOPIC_ROSTER.md、examples/,確認規則,然後挑今天前 2–3 個未完成主題開工。確認後我開始 Step 1。」

人類確認後,動工。
