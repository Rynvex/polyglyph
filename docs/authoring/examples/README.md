# Authoring Examples

> 真檔複製。**直接抄這格式**(改成你的 blueprint id),內容自寫。

8 個檔對應 `morning_commute_a2` 這個 A2 daily 對話 — 一個塞車打電話給同事的情境。

## 為什麼選這個當範例

- **A2 等級** — 不太簡單也不太複雜,各語言都好寫
- **daily 主題** — 各語言都有對應自然表達
- **混合語體** — 朋友間口語,但帶禮貌(「ごめん」「すみません」)
- **ja 結構完整** — `display_furigana` 含漢字、片假名(ナビ)、平假名、外來語、標點各種混合
- **ko 用 hangul display** — 示範 Sprint 7 之後的新 ko schema
- **es / de** 帶重音(`muchísimo`、`ä/ö/ü/ß`)— 示範 Sprint 4 後的 schema

## 各檔重點

| 檔案 | 看什麼 |
|---|---|
| `blueprint.example.json` | turn 編號、speaker 交替、has_templates |
| `en.example.json` | 簡單 ASCII text + 偶爾用 display 給打字提示 |
| `zh-tw.example.json` | 全繁中,display 跟 text 同字 |
| `ja.example.json` | **重點**:display_furigana 切段、kana 不含漢字、wapuro Hepburn 心智 |
| `ko.example.json` | display 是 한글 |
| `es.example.json` | 有重音字符(西文) |
| `it.example.json` | 義文重音 |
| `de.example.json` | ä/ö/ü/ß 跟對應 ae/oe/ue/ss |

## 注意

- `morning_commute_a2` 已經是上線檔,**不要在 docs/authoring/examples/ 改它**。要看新版改動請看 `public/dialogues/translations/morning_commute_a2/` 真檔。
- 你寫的對話不要用這個 blueprint id。
