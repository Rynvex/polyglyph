# Topic Roster

> 60 個預生主題,新 session 每天從上往下挑 2–3 個 `[ ]` 完成。
> 完成後改成 `[x]` + ` ← done <YYYY-MM-DD>`,跳過用 `[s]` + 理由。

## 設定(人類 owner 維護這段)

```
OBSIDIAN_PATH=
```

填寫範例(挑你的環境):

| 環境 | 範例值 |
|---|---|
| Native Windows(PowerShell / Claude Code on Windows) | `C:/Users/<you>/Documents/Obsidian/Vault`(用 `/`,Read 工具吃這格式) |
| WSL on Windows | `~/Documents/Obsidian/Vault`(從 WSL 看)<br>或 `/mnt/c/Users/<you>/Documents/Obsidian/Vault`(從 WSL 存取 Windows 端 vault) |
| Windows → WSL 共享 vault | `\\wsl.localhost\Ubuntu\home\<you>\Documents\Obsidian\Vault` |
| Linux / macOS | `~/Documents/Obsidian/Vault` |
| **不啟用** | 留空 — session 純合成,跳過 `obsidian:` 提示 |

**`obsidian:<note title>`** 是建議的取材線索。沒設 `OBSIDIAN_PATH` 或找不到 note 時,直接純合成主題。

**新 session 讀 OBSIDIAN_PATH 後**:
- bash / WSL:`find "$OBSIDIAN_PATH" -iname "*<keyword>*.md"`
- PowerShell:`Get-ChildItem -Recurse -Filter "*<keyword>*.md" "C:/.../Vault"`
- 純 MCP filesystem 工具:用 List + 字串比對檔名

## 等級分布(60 個目標)

| 等級 | 數量 | 服務主體 |
|---|---|---|
| A1 | 15 | 所有 7 語言 |
| A2 | 20 | 所有 7 語言 |
| B1 | 15 | en + ja 偏重 |
| B2 | 7 | en + ja 偏重 |
| C1 | 3 | en + ja 偏重 |

## 主題輪盤

格式:`- [ ] <suggested date> | <topic> | <level> | <blueprint_id> | <情境一句> | obsidian:<note title 或空>`

### A1 — 全 7 語言

- [ ] 2026-05-12 | daily | A1 | self_intro_a1 | 第一次見面自我介紹 |
- [ ] 2026-05-12 | daily | A1 | time_and_date_a1 | 問現在幾點 / 今天星期幾 |
- [ ] 2026-05-13 | food | A1 | coffee_shop_order_a1 | 在咖啡廳點咖啡 |
- [ ] 2026-05-13 | travel | A1 | bus_ticket_a1 | 買單程公車票 |
- [ ] 2026-05-14 | services | A1 | post_office_basics_a1 | 寄明信片 |
- [ ] 2026-05-14 | daily | A1 | phone_call_basic_a1 | 接電話確認身份 |
- [ ] 2026-05-15 | daily | A1 | weather_today_a1 | 問今天天氣 |
- [ ] 2026-05-15 | food | A1 | grocery_basics_a1 | 超市找東西 |
- [ ] 2026-05-16 | services | A1 | taxi_destination_a1 | 跟司機說目的地 |
- [ ] 2026-05-16 | daily | A1 | apartment_smalltalk_a1 | 跟鄰居打招呼 |
- [ ] 2026-05-17 | travel | A1 | airport_basics_a1 | 機場找登機門 |
- [ ] 2026-05-17 | daily | A1 | family_quick_chat_a1 | 跟家人快速通話 |
- [ ] 2026-05-18 | food | A1 | water_request_a1 | 餐廳要水 / 要菜單 |
- [ ] 2026-05-18 | services | A1 | help_desk_a1 | 飯店櫃台問 wifi 密碼 |
- [ ] 2026-05-19 | daily | A1 | saying_goodbye_a1 | 各種道別 |

### A2 — 全 7 語言

- [ ] 2026-05-19 | daily | A2 | morning_routine_a2 | 起床到出門的流程 |
- [ ] 2026-05-20 | travel | A2 | train_delay_a2 | 火車誤點問下一班 |
- [ ] 2026-05-20 | food | A2 | dietary_preference_a2 | 跟服務生說素食 / 過敏 |
- [ ] 2026-05-21 | services | A2 | gym_signup_a2 | 健身房報名 |
- [ ] 2026-05-21 | work | A2 | first_day_intro_a2 | 公司第一天認識同事 |
- [ ] 2026-05-22 | daily | A2 | birthday_invite_a2 | 邀請朋友來慶生 |
- [ ] 2026-05-22 | travel | A2 | hotel_room_issue_a2 | 房間冷氣壞了 |
- [ ] 2026-05-23 | food | A2 | takeout_order_a2 | 電話訂外帶 |
- [ ] 2026-05-23 | services | A2 | mobile_plan_a2 | 辦手機門號 |
- [ ] 2026-05-24 | work | A2 | calling_in_sick_a2 | 打電話跟主管請病假 |
- [ ] 2026-05-24 | daily | A2 | losing_keys_a2 | 跟室友說鑰匙不見 |
- [ ] 2026-05-25 | travel | A2 | renting_a_car_a2 | 機場租車 |
- [ ] 2026-05-25 | food | A2 | leftover_complaint_a2 | 餐點冷了客氣抱怨 |
- [ ] 2026-05-26 | services | A2 | haircut_appointment_a2 | 預約剪髮 |
- [ ] 2026-05-26 | work | A2 | meeting_reschedule_a2 | 改開會時間 |
- [ ] 2026-05-27 | daily | A2 | helping_neighbor_a2 | 幫鄰居搬東西 |
- [ ] 2026-05-27 | travel | A2 | museum_ticket_a2 | 博物館買票問 audio guide |
- [ ] 2026-05-28 | food | A2 | birthday_cake_order_a2 | 訂生日蛋糕 |
- [ ] 2026-05-28 | services | A2 | laundry_pickup_a2 | 洗衣店取衣 |
- [ ] 2026-05-29 | mind | A2 | sleep_quality_a2 | 睡不好跟朋友抱怨 |

### B1 — en + ja 偏重

- [ ] 2026-05-29 | work | B1 | code_review_pushback_b1 | 對 PR comment 客氣不同意 | obsidian:Code Review Etiquette
- [ ] 2026-05-30 | tech | B1 | git_workflow_b1 | 跟新人解釋 rebase vs merge | obsidian:Git Workflows
- [ ] 2026-05-30 | mind | B1 | parkinson_law_b1 | 解釋 Parkinson 法則 | obsidian:Parkinson's Law
- [ ] 2026-05-31 | work | B1 | one_on_one_career_b1 | 跟主管 1-on-1 聊職涯 |
- [ ] 2026-05-31 | tech | B1 | rest_vs_graphql_b1 | 解釋 REST vs GraphQL 差異 | obsidian:API Design
- [ ] 2026-06-01 | mind | B1 | second_order_thinking_b1 | 介紹 second-order thinking | obsidian:Mental Models
- [ ] 2026-06-01 | work | B1 | giving_feedback_b1 | SBI 框架給同事回饋 | obsidian:Feedback
- [ ] 2026-06-02 | tech | B1 | docker_quick_intro_b1 | 跟非技術 PM 講 docker 用途 |
- [ ] 2026-06-02 | mind | B1 | inversion_thinking_b1 | 解釋 inversion(Charlie Munger)| obsidian:Mental Models
- [ ] 2026-06-03 | work | B1 | demo_day_prep_b1 | 跟主管討論 demo day 內容 |
- [ ] 2026-06-03 | tech | B1 | testing_pyramid_b1 | 解釋 testing pyramid | obsidian:Testing
- [ ] 2026-06-04 | mind | B1 | regret_minimization_b1 | Bezos 後悔最小化框架 | obsidian:Decision Frameworks
- [ ] 2026-06-04 | work | B1 | resignation_intent_b1 | 跟主管表達想離職 |
- [ ] 2026-06-05 | tech | B1 | observability_basics_b1 | 為什麼需要 metrics / logs / traces | obsidian:Observability
- [ ] 2026-06-05 | mind | B1 | strong_opinions_weakly_b1 | strong opinions, weakly held | obsidian:Mental Models

### B2 — en + ja 偏重

- [ ] 2026-06-06 | tech | B2 | embedding_explain_b2 | 跟同事解釋 embedding 是什麼 | obsidian:NLP Basics
- [ ] 2026-06-06 | mind | B2 | base_rate_neglect_b2 | base rate fallacy 在 hiring 的應用 | obsidian:Cognitive Biases
- [ ] 2026-06-07 | work | B2 | scope_creep_pushback_b2 | 客氣推回 scope creep |
- [ ] 2026-06-07 | tech | B2 | event_sourcing_b2 | 跟資深同事討論 event sourcing | obsidian:Architecture
- [ ] 2026-06-08 | mind | B2 | optionality_b2 | nassim taleb optionality 概念 | obsidian:Antifragile
- [ ] 2026-06-08 | tech | B2 | retrieval_augmented_generation_b2 | 跟 ML 同事討論 RAG | obsidian:RAG
- [ ] 2026-06-09 | work | B2 | tough_postmortem_b2 | 主持嚴肅的 postmortem |

### C1 — en + ja 偏重

- [ ] 2026-06-10 | mind | C1 | russell_conjugation_b2 | russell 的修辭操弄 | obsidian:Rhetoric
- [ ] 2026-06-11 | tech | C1 | distributed_consensus_c1 | 解釋 Paxos vs Raft 的取捨 | obsidian:Distributed Systems
- [ ] 2026-06-12 | mind | C1 | ergodicity_c1 | 解釋 ergodicity 在投資的應用 | obsidian:Ergodicity

---

## 完成後該長這樣

```
- [x] 2026-05-12 | daily | A1 | self_intro_a1 | 第一次見面自我介紹 |  ← done 2026-05-12
- [s] 2026-05-12 | daily | A1 | time_and_date_a1 | ... (skipped — too similar to greetings_a1)
- [ ] 2026-05-13 | food | A1 | coffee_shop_order_a1 | 在咖啡廳點咖啡 |
```

## 補充說明

- **`obsidian:<note title>`** 是「**建議**」,不是「**強制**」:
  - 如果 `OBSIDIAN_PATH` 沒設 → 純合成
  - 如果設了但找不到對應 note → 純合成,session 報告 flag
  - 如果找到 → 用 RULES.md §7 的取材安全規則
- **日期欄位是建議,不是死線**。可以提前或延後,只要把握「2–3 個 / 天」即可。
- **id 衝突檢查**:寫對話前必跑 `ls public/dialogues/blueprints/` 確認該 id 沒被佔。
- **覺得這個 roster 不夠用 / 主題不對胃口**:在 session 報告 flag,我們再增補。
