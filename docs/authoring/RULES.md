# Dialogue Authoring Rules

> 看完 `START_HERE.md` 後讀這份。寫對話前**必須讀完**。
> 任何疑問先在這找答案。沒找到 → 在 session 報告 flag。

---

## 1. 資料夾結構

每個對話 = **1 個 blueprint + 7 個 translation**:

```
public/dialogues/
├── blueprints/
│   └── <blueprint_id>.json
└── translations/
    └── <blueprint_id>/
        ├── en.json
        ├── zh-tw.json
        ├── ja.json
        ├── ko.json
        ├── es.json
        ├── it.json
        └── de.json
```

`<blueprint_id>` 規則:
- `^[a-z0-9_]+$`(小寫、數字、底線)
- 後綴 level:`_a1` / `_a2` / `_b1` / `_b2` / `_c1`
- 例:`morning_routine_a1`、`post_office_a2`、`tech_debt_b2`

## 2. Blueprint Schema

完整範例見 `examples/blueprint.example.json`。關鍵欄位:

```json
{
  "schema_version": 1,
  "id": "<blueprint_id>",
  "level": "A1|A2|B1|B2|C1",
  "topic": "daily|travel|food|services|work|tech|mind",
  "estimated_minutes": 4,
  "tags": ["tag1", "tag2"],
  "turns": [
    { "id": "t1", "speaker": "bot",    "has_templates": false },
    { "id": "t2", "speaker": "player", "has_templates": true, "template_count": 1 },
    { "id": "t3", "speaker": "bot",    "has_templates": false },
    { "id": "t4", "speaker": "player", "has_templates": true, "template_count": 1 }
  ]
}
```

規則:
- turn id 用 `t1, t2, t3...`,**從 1 開始連號**
- 一定是 **bot 先講** → player 回 → bot → player ... 交替
- `template_count` 對 player turn,目前都 1(以後可能多分支,先不做)
- 總 turn 數**建議 5–14**,A1/A2 偏短(5–10),B1+ 可長(10–14)

## 2b. Blueprint 額外注意

- **blueprint 沒有 `description`、`title`、`characters` 欄位**(那些都在 translation)。blueprint 只放結構性 metadata(level, topic, tags, turns)。
- `estimated_minutes`:約 = (turn 數 × 0.4) 向上取整。例:10 turns → 4 min,12 turns → 5 min。
- `tags`:`string[]`,小寫,1–3 個。可省略或留空陣列。例:`["cafe", "ordering"]`、`["onboarding"]`。tag 跟 topic 不重複 — `topic: "food"` 就不用再 tag `"food"`。

## 3. Translation Schema

```json
{
  "schema_version": 1,
  "blueprint_id": "<同 blueprint>",
  "language": "en",
  "title": "Morning Commute",
  "description": "...",
  "characters": {
    "bot":    { "name": "Maya", "voice": "en-US-AriaNeural" },
    "player": { "name": "You" }
  },
  "turns": {
    "t1": { "text": "Hey, where are you? Meeting starts soon." },
    "t2": { "templates": [
      { "id": "t2.0", "text": "...", "hint_zh": "..." }
    ]},
    ...
  }
}
```

關鍵規則:
- **bot turn** 用 `"text"` 直接寫
- **player turn** 用 `"templates": [{ id, text, hint_zh, ... }]`(目前每個 turn 1 個 template)
- 每個 player template **必須有 `hint_zh`**(中文情境提示)
- `characters` **可省略**(全省),但有的話 bot 跟 player 兩個 key 都要寫 — bot 至少 `name`,voice 可省。
- `description` 只在 translation 寫,可選但推薦。基於 Obsidian note 時請註記 `"based on Obsidian note: <title>"`。
- `characters.bot.voice` 用對應語言的 Azure TTS 名稱(可省略):
  - en: `en-US-AriaNeural` / `en-US-JennyNeural`
  - zh-tw: `zh-TW-HsiaoChenNeural` / `zh-TW-YunJheNeural`
  - ja: `ja-JP-NanamiNeural` / `ja-JP-KeitaNeural`
  - ko: `ko-KR-SunHiNeural` / `ko-KR-InJoonNeural`
  - es: `es-ES-ElviraNeural` / `es-ES-AlvaroNeural`
  - it: `it-IT-ElsaNeural` / `it-IT-DiegoNeural`
  - de: `de-DE-KatjaNeural` / `de-DE-ConradNeural`

## 4. 各語言的 IME 規則(**最重要,出錯會擋發布**)

每個語言的 player template 的 `text` / `display` 各有規則。

### en

```json
{ "id": "t2.0", "text": "I'm stuck in traffic.", "hint_zh": "..." }
```

- `text` ASCII 直書
- `display` 可省略(預設等於 text)

### zh-tw

```json
{ "id": "t2.0", "text": "我塞在路上。", "hint_zh": "..." }
```

- `text` 用繁體中文
- `display` 可省略

### ja(規則最多,**注意**)

```json
{
  "id": "t2.0",
  "display": "本当にごめん。渋滞にハマってる。",
  "display_furigana": [
    { "jp": "本当", "kana": "ほんとう" },
    { "jp": "に", "kana": "に" },
    { "jp": "ごめん。", "kana": "ごめん" },
    { "jp": "渋滞", "kana": "じゅうたい" },
    { "jp": "に", "kana": "に" },
    { "jp": "ハマってる。", "kana": "はまってる" }
  ],
  "hint_zh": "抱歉,我塞在路上。"
}
```

- **不要寫 `text`** — compose 層會從 `display_furigana[].kana` 自動算 wapuro Hepburn 給打字引擎。
- `display` 是玩家看到的日文,**必須含真正的 kanji/kana/katakana**,不能純 ASCII。
- `display_furigana` 是必要的:
  - 每段 `{ jp, kana }`,kana **不能含漢字**(代表段不被 reverse 出來)
  - 標點放在 `jp`,**不要**放在 `kana`(例:`{ "jp": "ごめん。", "kana": "ごめん" }`)
  - 純 katakana 或外來語的段,kana 用平假名表示(例:`{ "jp": "ナビ", "kana": "なび" }`)— 或保留片假名也行(例:`{ "jp": "ナビ", "kana": "ナビ" }`),validator 兩者皆收
  - ASCII brand name 不會被 IME 折疊:`{ "jp": "Wi-Fi", "kana": "Wi-Fi" }`
  - 視覺分隔符 `・` 在 kana 會被 compose 自動 drop,可放可不放

#### wapuro Hepburn 心智模型(玩家會打的東西)

| Kana | 寫成 | 不是 |
|---|---|---|
| おう | `ou` | ô / ō |
| えい | `ei` | ē |
| ん(任何位置) | `n` | m(即使 shinbun) |
| は(粒子或字面) | `ha` | wa |
| へ | `he` | e |
| を | `wo` | o |
| し / しゃ / しゅ / しょ | `shi / sha / shu / sho` | si / sya / syu / syo |
| ち / ちゃ / ちゅ / ちょ | `chi / cha / chu / cho` | ti / tya / tyu / tyo |
| つ | `tsu` | tu |
| ふ | `fu` | hu |
| じ / ぢ | `ji`(都是) | zi / di |
| ず / づ | `zu`(都是) | du |
| っ(促音)+ ち | `tcha` / `tchi` / `tchu` / `tcho`(t prefix) | ccha 之類 |

寫完後 compose 層用 `lib/typing/ime/kana-to-hepburn.ts` 把 kana 轉成 Hepburn,跟玩家輸入比對。所以 **kana 必須對 — 不需要驗算 Hepburn**。

### ko

```json
{
  "id": "t2.0",
  "display": "정말 미안해. 길이 막혀.",
  "hint_zh": "真的不好意思,塞車。"
}
```

- `display` 用 한글
- `text` **可以省略**(compose 自動 `hangulToRomaja(display)` 算出 ASCII RR)
- 若你覺得自動 RR 不準(連音 / 받침 規則),手動寫 `text` 覆蓋,但要跟 `hangulToRomaja(display)` 完全相同 — validator 會比對

### es

```json
{
  "id": "t2.0",
  "display": "Lo siento muchísimo. Estoy atrapado en el tráfico.",
  "hint_zh": "..."
}
```

- `display` 用正確西文(含 áéíóúñ¿¡)
- `text` 可省略(compose `latinFold` 自動產 ASCII)
- 若手動寫 `text`,用 ASCII 等價(`muchisimo` 等)

### it

同 es,字符集 àèéìòù。

### de

```json
{
  "id": "t2.0",
  "display": "Tut mir leid, ich stecke im Stau.",
  "hint_zh": "..."
}
```

- `display` 帶 ä/ö/ü/ß
- `text` 可省略(compose `germanFold` 自動產 `ae/oe/ue/ss` 形式)
- 若手動寫 `text`,德國打字機慣例:`ä→ae`、`ö→oe`、`ü→ue`、`ß→ss`

## 5. 文化 / 內容守則

✅ **OK**:
- 日常情境(早餐、通勤、購物、求醫、機場)
- 職場互動(站會、PR review、薪資談判、interview)
- 學術 / 技術主題(ML 概念、系統設計、思維模型)
- 友情 / 家人對話
- 城市旅遊、訂房、點餐

❌ **避免**:
- **政治敏感**(選舉、領土、特定政黨)
- **宗教觀點**(評論宗教好壞)
- **族群刻板印象**
- 暴力 / 性 / 毒品 / 賭博
- 真實名人(用虛構名字)
- **冒犯性語言** — 即使是英文 slang 也限制在禮貌範圍
- 抄襲 user 的個人 Obsidian 筆記原文 — **抽 takeaway,改寫成情境**

## 6. Registry / 風格一致性

同一個 blueprint 的 7 個翻譯應該 **register 一致**:

| en | zh-tw | ja | ko | es | it | de | 等級 |
|---|---|---|---|---|---|---|---|
| neutral | 中性禮貌 | です/ます 體 | 해요 體 | usted? tu? | tu / Lei | du / Sie | 看情境決定 |
| formal | 客氣 | 敬語 / お~ | 합니다 | usted | Lei | Sie | 業務 / 客服 |
| casual | 口語 | 普通体 だ/だよ | 반말 (해) | tu | tu | du | 朋友 |

**朋友間** → casual(全部)
**陌生人 / 業務** → neutral(初次)→ 可能轉 casual
**客戶 / 上級** → formal

不要 en 寫 casual 但 ja 用敬語、ko 用 합니다 — 不一致。

## 7. 取材於 Obsidian 的安全規則

若 user 開啟 Obsidian path 且 roster 該列指定 note:

1. **Read the note**(用 `Read` 工具)
2. **抽 1–2 個 takeaway**:概念名稱、定義、一個例子、適用情境
3. **設計情境**:誰問誰?為什麼會聊到這?
4. **寫對話**:player 是「想學的人」或「教別人的人」,bot 是另一方
5. **不要**:複製 note 原文整段、把 note 結構搬進對話(像 markdown bullet list)
6. **description** 加註:`"based on Obsidian note: <note-title>"`

對話應該是個**情境角色扮演**,note 是**靈感**不是**內容**。

## 8. Validator 規則(壓力測試)

寫完跑 `pnpm validate-scripts`。需通過:

- 結構性:schema 完整、turn id 對齊、player turn 有 templates
- ja:player display 含 native script、kana 不含漢字、display_furigana 完整
- ko:display 是 한글 / 或 ASCII RR 跟 text 一致
- 7 個翻譯都存在

如果你違反任何規則,validator 會 FAIL 並指出哪個檔哪個 turn。**修到全綠才算完成**。

## 9. 寫不出來時的退路

- **規則衝突**:flag 在 session 報告,人類 review
- **概念太抽象**(沒情境)— 換主題
- **note 找不到 / 不適合對話化** — 換成純合成主題,roster 上的 `obsidian:` 行末加 ` (skipped — couldn't adapt)`
- **某語言翻不出自然版本** — 寫出可通版本,在 session 報告 flag 那個 turn,人類後續找母語人 review
- **id 衝突** — 換 id 或改加後綴(例:`morning_routine_a1_v2`)

## 10. 範例對照

`examples/` 資料夾有 3 個對話的完整 8 檔:

- `morning_commute_a2` — A2 daily,日常通勤情境,適合 ja 結構參考
- `cafe_a2` — A2 food,點餐情境,短而緊湊
- `backprop_explain_b2` — B2 tech,深度學習概念,適合 obsidian 取材 + 高階 register 參考

照著抄格式不要照著抄內容。

---

## 心智模型

你不是在做翻譯,你是在**寫一段可以反覆練習的微型對話劇本**。玩家會逐字打出 player turn,所以:

- 句子要**自然短促**,不要結構複雜的長句
- 用詞要**該等級的常見詞**(A1 不要塞 B2 字)
- bot 的回應要**像真人**,不要 RPG NPC 風(別寫「歡迎光臨,我是您今天的助理」)
- 整段對話**要有起承轉合**,bot 的 turn 推進情境,player 的回應是學習目標
