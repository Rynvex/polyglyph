# Cron 自動 promote 設定

> **狀態**:已安裝。每天 06:00 自動跑 + 開機後 2 分鐘 catch-up。
> 這份文件記錄發生了什麼、怎麼檢查、怎麼改、怎麼移除。

---

## 安裝的 crontab 兩行

```cron
0 6 * * * ~/polyglyph/scripts/run-promote-cron.sh
@reboot sleep 120 && ~/polyglyph/scripts/run-promote-cron.sh
```

| 行 | 意思 |
|---|---|
| `0 6 * * *` | 每天 06:00 跑一次 |
| `@reboot sleep 120 && ...` | 開機後等 2 分鐘(等 mount / 網路就緒)跑一次 — 如果機器昨天 6 AM 沒開,開機後會 catch-up |

cron daemon 本身在 Ubuntu 預設**開機自動啟動**(`systemctl is-enabled cron` → `enabled`)。

---

## wrapper script 做了什麼

`scripts/run-promote-cron.sh`:

1. **設 PATH** — cron 沒繼承 shell 的 PATH,要手動加 `~/.local/bin`(pnpm 在這)
2. **flock 鎖** — 同時跑兩個 instance 會死鎖 mount point,鎖檔在 `/tmp/polyglyph-promote.lock`
3. **cd 到專案根** — pnpm 才能讀 workspace
4. **跑** `pnpm promote-generated --stable-after 120 --archive --quiet`
5. **log 進** `logs/promote-cron.log`

### `--stable-after 120` 的意義

如果新 session 正在寫對話,中途檔案 mtime 還新鮮,腳本會 **silent skip**,留到下次跑。120 秒(2 分鐘)門檻是 belt-and-braces:

- Claude session 寫 8 個檔通常 30–60 秒
- 06:00 跑的時候,你大概不會剛好在生對話
- @reboot 那次更不會

### `--archive`

成功 promote 的對話會被**搬到** `${POLYGLYPH_STAGING:-./staging}/_promoted/<YYYY-MM-DD>/<id>/`,staging 區永遠乾淨。下次 cron 跑就不會再 detect duplicate noise。

### `--quiet`

沒事不印東西。log 只有 timestamp 標頭 + 真實事件(promote 成功 / 失敗)。

---

## 檢查運作狀況

### 看 log

```bash
tail -50 ~/polyglyph/logs/promote-cron.log
```

### 手動觸發測試(不用等到 6 AM)

```bash
~/polyglyph/scripts/run-promote-cron.sh
echo "exit: $?"
tail -20 ~/polyglyph/logs/promote-cron.log
```

### 確認 crontab 還在

```bash
crontab -l | grep polyglyph
```

### 確認 cron daemon 開機自動跑

```bash
systemctl is-enabled cron   # 應該是 enabled
systemctl status cron       # 應該是 active (running)
```

### 確認 promoted 的對話真的進去了

```bash
ls ${POLYGLYPH_STAGING:-./staging}/blueprints/       # 應該漸漸變空(已 promote 都 archive)
ls ${POLYGLYPH_STAGING:-./staging}/_promoted/         # 應該有日期資料夾
ls ~/polyglyph/public/dialogues/blueprints/ | wc -l   # 應該漸漸增加
```

---

## 失敗排查

### 「我把對話放到 staging 但 6 AM 沒進去」

1. 確認 `~/polyglyph/logs/promote-cron.log` 有 06:00 那筆執行記錄。沒有 = cron 沒跑(check `systemctl status cron`、`crontab -l`)。
2. 有執行記錄但沒 promote → 看 log 內 issue 訊息,8 種 blocking kind 之一(schema / IME / compose / missing 等)
3. log 沒問題卻沒 promote → 可能 `--stable-after 120` 把它當「太新」skip — log 會說 `Newest file modified Ns ago`。下次跑或手動 `~/scripts/run-promote-cron.sh` 即可
4. **檔案進不去主線但 staging 變空了** — promote 成功但 archive 動作做完。檢查 `public/dialogues/blueprints/` 應該有新檔

### 「對話格式不對被 reject 怎麼辦」

腳本 abort 後 staging 對話**留在原處不動**(不 archive)。你看 log 找原因,修 staging 那組檔,等下次 cron 跑 / 手動觸發,它會再驗一次。

### 「想暫停自動 promote」

```bash
crontab -e
# 在 polyglyph 那兩行前面加 #
```

或整段刪掉。要恢復照下面「重裝」步驟。

### 「兩台機器都裝了 cron 跑同一個 staging」(race)

別這樣。flock 在同機器有效,跨機器(NFS / Samba)的 lock 行為不可靠。**只在一台機器裝 cron**。

---

## 重裝 / 改時間

`crontab -e` 編輯,範例:

```cron
# 每天兩次 (06:00 + 14:00)
0 6,14 * * * ~/polyglyph/scripts/run-promote-cron.sh

# 每小時整點
0 * * * * ~/polyglyph/scripts/run-promote-cron.sh

# 重開機 catch-up
@reboot sleep 120 && ~/polyglyph/scripts/run-promote-cron.sh
```

存檔後 cron 自動 reload,不用重啟服務。

---

## 完整移除

```bash
# 移掉 crontab 那兩行
crontab -e   # 手動刪 polyglyph 那段

# 刪掉 log + lock(可選)
rm ~/polyglyph/logs/promote-cron.log
rm -f /tmp/polyglyph-promote.lock
```

script 本身留在 `scripts/` 不影響別的。

---

## 為什麼選 cron 不選 systemd timer

兩個都行。Cron 的優點:

- **更熟悉** — 一行 cron 表達式比兩個 systemd unit 簡單
- **單檔搞定** — `crontab -e` vs `~/.config/systemd/user/*.{service,timer}`
- **`@reboot` 行為等同 systemd 的 `Persistent=true`** — 反正一個 catch-up 機制就夠

如果你要 systemd timer 版本(可以 `systemctl --user status` 查狀態、journald 自動 rotate log),跟我說我就改。
