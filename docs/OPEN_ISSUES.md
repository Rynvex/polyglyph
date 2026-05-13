# Polyglyph — Open Issues & Development Backlog

> 整理日期:2026-05-11(部分 sprint 已完成,**現況看 [PROGRESS.md](PROGRESS.md)**)
> 範圍:多語言對話腳本品質、輸入法 (IME) 設計、結構一致性

本文件彙整目前已知的開發項目跟品質問題,作為下一階段的工作清單。
原則上以 **「玩家永遠看到母語正寫,打字 target 是 IME 能消化的 ASCII 形式」** 為設計目標,目前各語言實作狀況不一致,且 ja / ko 兩種非拉丁字系的羅馬化品質有結構性問題。

---

## 1. 已知問題清單(按嚴重度)

### 1.1 嚴重 (HIGH) — 日文羅馬字錯誤多、且來源是手寫

**現況**
- 39 個 ja 翻譯檔已導入 `display_furigana: [{ jp, ro }]` 結構
- `text` 由 `ro` 段拼接,validator 強制 `text === concat(ro)`
- **但 `ro` 是手寫 Hepburn**,沒對應假名讀音當 ground-truth → 出現大量錯誤

**已知具體錯誤(範例,非全部)**
- `morning_commute_a2 / t4`:
  - 顯示「あと 二十分 かなあ。ナビ が ずっと 変わる。」
  - 玩家 text:`atohunnijuppunkanaakanabigazuttokawaru`
  - 錯誤:
    - `hunnijuppun` ← 二十分應為 `nijuppun`(口語)或 `nijippun`(正式),前面 `hun` 是把「分=fun」跟「二十分=nijuppun」混淆的 artifact
    - `kanabi` ← ナビ 應為 `nabi`,前面把「かなあ」尾段串進去了

**根本原因**
羅馬字是手寫的,不是從假名程式化推導的。validator 只能保證內部自洽,沒辦法保證「`ro` 真的是該假名的 Hepburn」。

**影響**
- 玩家看到的羅馬字是錯的 → 學到錯的拼音
- 沒有自動化檢查能抓
- 39 檔之間錯誤分布不均,review 成本高

---

### 1.2 嚴重 (HIGH) — 韓文 romaja 像是隨手生成、且 display 看不到 한글

**現況**
- ko 的 player template 中 `text` 跟 `display` **都是 romaja**
  ```json
  "text": "kollok itta bwa",
  "display": "kollok itta bwa"   // ← 玩家完全看不到韓文
  ```
- 沒有像 ja 那樣的「display(正寫)+ text(打字 target)」雙層結構

**已知具體錯誤(`morning_commute_a2`)**
| 句意 | 現有 romaja | 正確應為 | 問題 |
|---|---|---|---|
| 真的不好意思,完全不動 | `jinjja mianhae geuni jeonhyeo an umjigyeo` | `geuni` 不通(應為 `geu-gil` 或 `gilheul`) | 詞彙錯 |
| 大概再二十分鐘,導航一直變 | `amado ibsipbun jeongdo navi gye gyeesok bakkwoeyo` | `gyesok`(計續)不是 `gyeesok` | RR 拼錯 |
| 你救了我,下次還你人情 | `neo jeongmal sallyeoijwosseo damen naega gapeulge` | `ne jeongmal sallyeojwosseo daeumen naega gapeulge` | 多處錯 |
| 成交,等下見 | `kollok itta bwa` | 整句不成韓語 | 翻譯 nonsense |

**根本原因**
- romaja 沒有從 한글 程式化生成
- 翻譯本身可能是 LLM 直接生成 romaja,沒先寫韓文再羅馬化
- Korean 的 IME 設計從一開始就缺一層

**影響**
- 玩家學到錯的韓文發音
- 看不到 한글 對應 → 失去學習韓文 character 的機會

---

### 1.3 中等 (MEDIUM) — 西 / 德 / 義 全部去重音

**現況**
- es / de / it 的 `display` 跟 `text` 都是 ASCII,沒有重音字符

**範例對照**
```
es: "Lo siento muchisimo"      應為 "Lo siento muchísimo"
es: "donde estas"              應為 "dónde estás"
es: "Conduce con cuidado!"     西班牙文應為 "¡Conduce con cuidado!"
de: "faengt", "spaet", "fuer", "uebernehmen", "Naechsten"
                               應為 "fängt", "spät", "für", "übernehmen", "Nächsten"
de: 用「Sorry」而非「Entschuldigung」(口語沒問題,但是借自英文)
it: "lunedi e'", "caffe'"      應為 "lunedì è", "caffè"
it: "Si, tranquillo"           應為 "Sì, tranquillo"
```

**根本原因**
DirectIME 全部打 ASCII,所以連 `display`(玩家看到的提示)都被去重音了 → 跟 ja 拆 display/text 兩層的做法不一致。

**影響**
- 玩家看到的不是母語人會寫的東西
- 學習者學到「沒重音的西語/德語/義語」

---

### 1.4 中等 (MEDIUM) — Kunrei vs Hepburn 輸入歧義(ja)

**現況**
- ja `text` 是純 Hepburn(`shi / chi / tsu`)
- DirectIME 1:1 比對,玩家若打 Kunrei 風格(`si / ti / tu / hu / zi / di / du / syo / sya / tya`)→ 不通過
- 真實的日本 IME(Mozc / MS-IME)三種拼法都吃

**影響**
- 學過 Kunrei 或 Wapuro 的玩家會卡住
- 跟現實 IME 行為脫節

**已存在的素材**
- `lib/typing/ime/japanese.ts` 已內建 Kunrei aliases,但 factory 沒在用
- 可以抽出 normalizer 在 DirectIME 之前先過濾

---

### 1.5 中等 (MEDIUM) — 翻譯內容跨語言可能漂移

**現況**
- 結構上 `blueprints/<id>.json` 是 source-of-truth,但只有骨架(turn 順序、speaker)
- 各語言內容看起來像 LLM 各自生成,以 en 為大致參考(看 hint_zh 各語言相同可佐證)
- ja 因為被多次 bulk-rewrite 修 IME 問題,**意思可能已經跟 en 漂移**

**範例**
- `morning_commute_a2 t8`:
  - en: `You're a lifesaver. I owe you one.`
  - de: `Du rettest mir den Morgen. Ich schulde dir was.`(較字面;母語常說 `Du rettest mich.`)
- 整體沒系統性 audit 過

**影響**
- 同一 blueprint 不同語言實際在練不同句子
- 失去「同一張卡多語面」的單字庫設計初衷

---

### 1.6 低 (LOW) — Validator 只查內部自洽,沒查語義正確性

**現況**
- 既有 validator(`lib/data/dialogues/validate-ime.ts`):
  - 檢查 ja `text` 純 ASCII 無 whitespace
  - 檢查 `text === concat(display_furigana[].ro)`
  - 檢查 ko `text` ASCII
- **沒有**:
  - 檢查 ja `ro` 真的是該假名的 Hepburn
  - 檢查 ko romaja 真的是該 한글 的 RR
  - 檢查 es/de/it 是否該有重音

---

### 1.7 中等 (MEDIUM) — Vocab 卡片太小,沒有「主角感」

**現況**
- `components/VocabCard.tsx` 是橫條 pill(icon `h-16 w-16` + 一行 word + 音訊鈕)
- VocabScene 把卡片貼在頂端,中間到輸入框之間是大片空白
- 1920 寬螢幕上更明顯,卡片變成「縮在角落的條目」而不是「正在練的這張卡」

**影響**
- 視覺重心錯,玩家專注力被空白 + 工具列搶走
- emoji 看不清(對抽象詞 metonymy icon 更需要大)

---

### 1.8 中等 (MEDIUM) — 「I read in」放在 vocab 頁,該是全域設定

**現況**
- `VocabLanding` 的 LANGUAGE PAIR 區塊把 `I read in`(nativeLang)跟 `I type in`(targetLang)綁在一起
- 兩者本質不同:
  - `nativeLang` 是 profile-level(我的母語不會每次練習都換),適用於 vocab 跟 dialogue 兩邊的 hint
  - `targetLang` 是 per-session(這次想練的目標語言),跟 deck 選擇綁在一起才合理
- 目前 dialogue 端的 hint 還是寫死 `hint_zh`(只有中文母語的人看得懂提示)

**影響**
- 跨頁面設定不一致,使用者要在 vocab 頁設母語才生效,dialogue 頁讀不到
- Dialogue translations 缺多語言 hint(只有 hint_zh)→ 非中文母語者無提示

---

### 1.9 嚴重 (HIGH) — Vocab 量級遠不及目標(140 → 10,000)

**現況數據**
```
Concepts:    140
  A1: 128 / A2: 12  (B1+ 全空)
Decks:       11   (全部 A1)
Languages:   de / en / es / it / ja / zh-tw  (ko 缺翻譯)
Schema:      { id, emoji, category, cefr, kind }
```

**問題**
- A1 常用約 1000 字,目前才 128(連 A1 都沒做完)
- B1 以上 0 個 — 中高階學習者沒內容
- Schema 太簡:沒例句、沒細詞性、沒詞形變化、沒 frequency rank
- **抽象概念(思想 / 公正 / 即使)用 emoji 表達不出來**,沒有 visual fallback 策略
- 7 語言 × 10000 字 = 70,000 條翻譯,目前作法不可能 scale
- 11 個 deck 全 A1,沒主題分層;若直接跳到 10000 / 16 = 625 個 deck,UI 會崩潰

**影響**
- Product/market fit:目前內容只夠當 demo,不到實用學習工具
- 抽象詞視覺策略不訂下來,後面擴量都會卡

---

## 2. 結構統一目標(目標狀態)

每個語言的 player template 應該長這樣:

| 語言 | display(玩家看到) | text(打字 target) | 衍生來源 | IME 處理 |
|---|---|---|---|---|
| en | `Hello` | `Hello` | 直接寫 | DirectIME |
| zh-tw | `你好` | `你好` | 直接寫 | DirectIME(直接打 CJK) |
| es | `Lo siento muchísimo` | `Lo siento muchisimo` | display 去重音 | LatinDiacriticIME(打 `i` 接受 `í`) |
| it | `lunedì è caffè` | `lunedi e caffe` | display 去重音 | LatinDiacriticIME(同 es) |
| de | `fängt über Straße` | `faengt ueber Strasse` | ä→ae、ö→oe、ü→ue、ß→ss | GermanIME(雙向接受) |
| ja | `元気ですか` + furigana ruby | `genkidesuka` | `display_furigana[].kana` 程式化轉 Hepburn | DirectIME + Kunrei normalizer |
| ko | `정말 미안해` + RR ruby | `jeongmal mianhae` | `display`(한글) 程式化轉 RR | DirectIME + RR alias |

**設計原則**
- 玩家**永遠看到正寫**(有重音、有 한글、有漢字+假名)
- 打字 target 是 IME 能消化的 ASCII 形式
- 非 ASCII → ASCII 的轉換**程式化**,不手寫
- IME 寬鬆接受多種拼法(Kunrei/Wapuro for ja、ASCII fallback for es/de/it)

---

## 3. 開發項目(Backlog)

### Track A:日文(優先,因為已開始)

#### A1. `kanaToHepburn()` 純函式
- 路徑:`lib/typing/ime/kana-to-hepburn.ts`
- 範圍:完整 hiragana + katakana、拗音、促音、ん 規則、長音、片假名 ー
- TDD 完整測試表
- **估時:2h**

#### A2. Schema 改:`display_furigana` segment 改為 `{ jp, kana }`
- 移除作者寫的 `ro` / `text`(對 ja)
- compose 層在載入時用 `kanaToHepburn()` 算出 `ro`、再拼接出 `text`
- runtime 型別不變(`ro` / `text` 仍存在,只是衍生)
- **估時:1h**

#### A3. 39 個 ja 檔案遷移
- 寫 `scripts/migrate-ja-furigana-to-kana.ts`
- 從現有 `ro` 反推 `kana`(用反向表),寫進 `kana` 欄位
- 不一致(像 `hunnijuppun` 那種)輸出 worklist,人工修
- 漢字段(二十分、一年 等)強制人類選定 reading(歧義無法 deterministic)
- **估時:3–4h**

#### A4. ja Kunrei normalizer
- 在 DirectIME 之前加一層輸入 normalizer
- 接受 si/ti/tu/hu/zi/di/du/syo/sya/tya/sya 等變體
- target 仍是 Hepburn,不變
- **估時:0.5h**

---

### Track B:韓文(獨立大塊)

#### B1. `hangulToRomaja()` 純函式
- 路徑:`lib/typing/ime/hangul-to-romaja.ts`
- Revised Romanization 標準
- 處理連音、받침、구개음화、ㅎ 탈락 等音變
- 完整測試
- **估時:3h**

#### B2. Schema 改:ko 加 `display`(한글)+ `text`(自動 RR)
- 跟 ja 結構對齊
- compose 層自動衍生 `text`
- 可加 `display_romaja_segments`(類似 ja furigana,讓玩家看 한글 上方有 RR)
- **估時:2h**

#### B3. 39 個 ko 檔案重寫
- 現有 romaja 內容當廢料丟掉
- 從 hint_zh + en 重新翻成自然韓文 → 寫進 `display`
- `text` 用 `hangulToRomaja(display)` 生成
- **估時:8–12h**(主要是逐句翻譯)

#### B4. ko RR alias normalizer
- 接受 `oe / eo / eu / ae` 等變體拼法
- **估時:0.5h**

---

### Track C:西 / 德 / 義 重音回填

#### C1. `LatinDiacriticIME`(es / it 共用)
- target 是無重音 ASCII
- 玩家打有重音字也接受(`í→i`、`ñ→n`、`è→e` 等先 normalize 再比對)
- **估時:1.5h**

#### C2. `GermanIME`
- target 是 ae/oe/ue/ss
- 玩家打 `ä/ö/ü/ß` 也接受
- **估時:1h**

#### C3. 39 × 3 檔重音回填
- 寫 patch script,逐檔人工 review 補回正寫(自動工具有歧義 — 西文 `si` vs `sí`、`mas` vs `más` 等)
- **估時:6–8h**

#### C4. Schema 改:es/de/it 接受 `display` ≠ `text`
- compose 層比對時把 display 過 normalizer 再比 text
- **估時:1h**

---

### Track D:翻譯品質審查

#### D1. `audit-translations.ts`
- 路徑:`scripts/audit-translations.ts`
- 對每個 blueprint × 每個 turn × 每個語言:
  - 印 en 原句 + 該語言句 + hint_zh
  - flag 長度差異 > 2x、registry 不一致(en 用 idiom 但翻譯沒翻出)、術語不統一
- 輸出 `docs/AUDIT_TRANSLATIONS.md`
- **估時:2h**

#### D2. 人工 audit 修正
- 根據 D1 報告逐筆檢查
- 39 × 7 = 273 個 (blueprint × language) 組合,但只看 player turns(平均 5–6 個 per blueprint)
- **估時:5–10h**(可分批做)

---

### Track E:Lint / Validation 強化

#### E1. 強化 validate-ime
- ja:檢查 `kana` 純假名(沒有漢字漏填)
- ja:檢查 `kanaToHepburn(kana) === stored_ro`
- ko:檢查 `hangulToRomaja(display) === text`
- es/de/it:檢查 `display` 至少出現過一次該語言預期重音字符(弱檢查;太多句沒重音的話 warn 不 error)
- **估時:1h**

#### E2. 跨語言 hint_zh 一致性檢查
- 同一 blueprint 同一 turn 的 hint_zh 各語言是否大幅不一致(可能代表翻譯漂移)
- 加進 `pnpm validate-scripts`
- **估時:1h**

---

### Track F:UI / UX

#### F1. VocabCard 變主角(垂直填滿)
- 現況橫條 pill → 改成中間置中、emoji 放大(`h-32 w-32 text-7xl`)、word 字級放大
- VocabScene 用 flex 把卡片區撐滿(輸入框留底,頂端只 progress + deck title)
- 小螢幕用 clamp 字級避免 emoji 擠壓 input
- **估時:1.5h**

#### F2. LangPref state 拆分
- `lib/data/lang-prefs.ts` 拆兩個獨立 setting:
  - `loadNativeLang() / saveNativeLang()` — 全域(`polyglyph:native-lang`)
  - `loadTargetLang() / saveTargetLang()` — vocab 專屬
- 舊 key `polyglyph:lang-pair` backwards-compat 讀取後拆寫回
- **估時:1h**

#### F3. 主頁加 nativeLang picker
- `app/page.tsx` 上方加全域設定列:`I read in: [日本語 ▾]`
- 第一次造訪用 `navigator.language` 推測 default
- 樣式低調(不蓋 hero)
- **估時:1h**

#### F4. VocabLanding 移除 nativeLang 欄
- 只留 `I type in` 單欄 inline picker
- 提示文字「Hints shown in {nativeLang}. Change in home page settings.」帶回首頁 link
- **估時:1h**

#### F5. Dialogue 接 nativeLang
- `DialogueScene` / dialogue landing 統一讀 `loadNativeLang()`
- 顯示對應的 hint 翻譯欄位(如 `hint_<lang>`)
- 注意:當前 dialogue translations 只有 `hint_zh`,需配合 G3
- **估時:0.5h**

#### F6. 視覺 review + 測試
- 1920 / 1280 / 768 / 375 各跑一遍實機
- VocabCard 新版 RTL 測試
- LangPref localStorage 寫入測試
- **估時:1h**

---

### Track G:Vocab 擴充(140 → 10,000,以英文為準)

#### G1. 字源研究 + 取得
- 鎖定 license 友善的 frequency list:
  - **NGSL**(2,801,CC BY-SA 4.0)為主幹
  - **NAWL**(963 學術詞,CC BY-SA 4.0)補 B2
  - **BSL / TSL**(商務,CC BY-SA 4.0)補商務向
  - **COCA top frequency**(開源版本)補長尾到 10000
- Oxford 3000/5000 受版權保護,只當參考不直接 import
- 輸出 `data/sources/<list>.csv`,含 word / cefr-hint / frequency-rank
- **估時:2h**

#### G2. 視覺策略 + 設計指引
- 三層策略(寫進 `docs/VISUAL_STRATEGY.md`):
  - **L1 Emoji**:具體名詞、明顯動作、表情(已有 ~140)
  - **L2 SVG Icon**:抽象名詞、概念、邏輯連接 — 用 **Lucide**(MIT, ~1500)
  - **L3 Photo**(可選):A2+ 場景圖 — Unsplash/Pexels API
- 抽象詞 metonymy 對照表(thought → 💭/lightbulb、justice → ⚖️、patience → ⏳…)
- 寫 `lib/visual/concept-visual-rules.ts`,從 `category + kind` 自動指定 icon family
- 連接詞 / 介詞 → 純文字卡(放大例句,圖區留空)
- **估時:4h**

#### G3. Concept schema 升級
- 從 `{ id, emoji, category, cefr, kind }` 擴充到:
  ```ts
  {
    id, category, cefr,
    visual: { kind: "emoji"|"icon"|"photo"|"none", asset: string|null },
    pos: "noun-concrete"|"noun-abstract"|"verb-action"|"verb-state"|"adj"|"adv"|"prep"|"conj"|"interj",
    frequency: { source, rank },
  }
  ```
- Translations 加 `examples: [{ text, hint_<lang> }]`(每個語言)
- ja / ko 翻譯 hook 進 Track A1+A2 / B1+B2 的自動衍生(打字 target 由 reading 推出)
- 既有 140 詞遷移 script
- **估時:3h**

#### G4. Pipeline 工具
- `scripts/import-frequency-list.ts` — 讀清單 → 生 concept stub(1h)
- `scripts/categorize-concepts.ts` — LLM 標 POS / abstract-vs-concrete / category(1h)
- `scripts/assign-visuals.ts` — 套 visual rule engine 決定 L1/L2/L3(1h)
- `scripts/auto-translate.ts` — LLM 批次翻譯到 7 語(2h)
- `scripts/fetch-images.ts` — 需照片時抓 Unsplash 並 cache(1.5h)
- `scripts/audit-vocab.ts` — 列出未經人工 review 的高頻詞(0.5h)
- **估時 6h**

#### G5. Deck 重組 + UI(search / filter / smart deck)
- Deck JSON 由規則自動生:`{ category, cefr, limit }`
- VocabLanding 加 search box、CEFR filter、主題 filter
- 「Smart deck」:今日新詞、弱項複習、隨機混合
- Deck 大小可變(8–20),不再固定 16
- **估時:6h**

#### G6. 內容生成 — Batch 1(到 1000 字,A1 滿)
- 補齊 A1 的 ~870 個常用詞
- 高頻全人工 review(7 語)
- ja 利用 Track A 完成的 kana 衍生、ko 利用 Track B 的 RR 衍生
- **估時:25h**

#### G7. 內容生成 — Batch 2(到 2000,A2 滿)
- 補齊 A2 的 ~1990 個詞
- 高頻人工 + 中段 LLM 抽檢(20%)
- **估時:30h**

#### G8. 內容生成 — Batch 3(到 5000,B1 鋪)
- LLM 為主,抽檢 10%
- **估時:40h**

#### G9. 內容生成 — Batch 4(到 10000,B2 + C1)
- LLM 為主,抽檢 5%
- **估時:40h**

> Track G 強耦合 Track A / B(ja kana / ko hangul 自動衍生),建議 Track A1–A4 + B1–B4 先完成,Vocab 擴量才不會在 ja/ko 翻譯重蹈手寫覆轍。

---

## 4. 風險彙總

| Risk | Level | 緩解 |
|---|---|---|
| 漢字讀音歧義(二十分 = nijippun / nijuppun) | HIGH | A3 worklist 強制人類選 |
| ko 39 檔人力翻譯量大 | HIGH | B3 分批做,可只挑 demo 用的幾檔先重做 |
| 西文重音自動回填會錯(`si` vs `sí`) | HIGH | C3 人工 review,不全自動 |
| 抽象詞視覺品質參差 | HIGH | G2 視覺指引 + metonymy 對照表 + 設計 review |
| Vocab 翻譯爆量(70,000 條)LLM 品質不穩 | HIGH | G6 高頻人工、Track A/B 結合、抽檢分階段 |
| ko 翻譯從零做(vocab + dialogue 雙重) | HIGH | Track B 跟 G6 共用 hangul→RR 衍生 pipeline |
| 修正 Hepburn vs 標準 Hepburn 長音規則 | MEDIUM | A1 鎖定標準 Hepburn(`ou/ee/ii`),寫死進 lib |
| LatinDiacriticIME 計分時要 normalize 雙邊 | MEDIUM | C1 在比對前就把雙邊 strip 重音 |
| 重做的 ja/ko 內容跟 en 再次漂移 | MEDIUM | D1+E2 抓 |
| Deck 數量爆炸(625 個)UI 難用 | MEDIUM | G5 search/filter/smart deck |
| Image asset 量大、CDN 成本 | MEDIUM | Vercel image CDN + emoji 優先、photo 最後 |
| Frequency list license 風險 | MEDIUM | G1 鎖定 NGSL/NAWL CC BY-SA |
| Vocab card 放大後 input 被擠出視窗 | MEDIUM | F1 flex 保護 input 高度 + clamp 字級 |
| nativeLang 拆分後 dialogue 端讀錯 | MEDIUM | F5 確認所有讀取點 |
| 玩家看不懂為何 `display` 跟 `text` 不一樣 | LOW | UI 文案說明 / hover tooltip |
| 詞性多義(table=noun & verb) | LOW | 同字不同義開不同 concept(`table_noun`、`table_verb`)|

---

## 5. 推薦執行順序

### Sprint 1 — 立即痛點 + 系統化基礎(~8h)
1. **A4** ja Kunrei normalizer(0.5h)— 立即解輸入痛點
2. **A1 + A2** kanaToHepburn + schema(3h)
3. **A3** ja 39 檔遷移(3–4h)
4. **E1** validator 強化 ja(1h)

### Sprint 2 — UI / UX(~6h,可平行)
5. **F1** VocabCard hero 化(1.5h)
6. **F2 + F3** LangPref 拆分 + 主頁 picker(2h)
7. **F4 + F5** VocabLanding 簡化 + Dialogue 接 nativeLang(1.5h)
8. **F6** 視覺 review + 測試(1h)

### Sprint 3 — 韓文 + 翻譯 audit(~17–22h)
9. **D1** translation audit 報告(2h)— 看全貌再決投入規模
10. **B1 + B2 + B4** ko 基礎 + RR alias(5.5h)
11. **B3** ko 39 檔對話重寫(8–12h)

### Sprint 4 — 西 / 德 / 義 重音(~10–12h)
12. **C1 + C2 + C4** IME + schema(3.5h)
13. **C3** 西/德/義 重音回填(6–8h)

### Sprint 5 — Vocab 擴充基礎建設(~21h)
14. **G1** 字源研究(2h)
15. **G2** 視覺策略(4h)
16. **G3** Concept schema 升級(3h)
17. **G4** Pipeline 工具(6h)
18. **G5** Deck UI 重組(6h)

### Sprint 6+ — Vocab 內容批次(~135h,分批)
19. **G6** Batch 1 → A1 滿(25h)
20. **G7** Batch 2 → A2 滿(30h)
21. **G8** Batch 3 → B1(40h)
22. **G9** Batch 4 → B2 + C1(40h)

### 持續性
- **D2** 翻譯人工 audit(分批)
- **E2** 跨語言 hint lint
- **G6+** 玩家回饋驅動的內容修正

> **核心建議**:Sprint 1 + Sprint 2 = 14h,先把日文輸入痛點 + UI 結構解掉,之後再依預算決定怎麼往 vocab 擴量推進。Sprint 5(基礎建設)做完之前不建議直接動手鋪詞 — 沒視覺策略 + 沒 schema 升級就鋪詞,後面要回頭重做。

---

## 6. 不在這份文件範圍

- 新增其他語言(fr / pt / vi 等)
- 新增 dialogue blueprint
- TTS / 語音相關
- 排行榜、學習進度系統(SRS、間隔重複)
- 行動裝置原生 app
- 帳號 / 雲端同步
- LLM 即時對話(本專案核心是離線、零 LLM 成本)

這些屬於另外的 backlog,先聚焦把現有 7 語言的內容跟結構做對、把 vocab 擴到實用規模。
