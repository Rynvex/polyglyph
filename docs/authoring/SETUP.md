# Authoring Session — Cross-OS Setup Guide

> 這份是給**人類 owner** 看的(你),不是給新 session。
> 選一種 setup,把對應的工作目錄路徑 + Obsidian 路徑填進 `TOPIC_ROSTER.md` 開頭,就能交給新 session 開工。

---

## 你的 Polyglyph 專案目前在哪?

假設專案 clone 在一台 **Ubuntu / Linux 機器**(例如 `~/polyglyph`),但 Claude Desktop / Claude Code 跑在 Windows 上。常見有 4 種 setup:

---

## Option A — WSL 在 Windows + 從 WSL 終端跑 Claude Code

**最像 Linux,最少陷阱**。Windows 上裝 WSL2,從 WSL 終端跑 `claude` CLI。專案就在 WSL 的 Ubuntu 環境中。

### Setup

```bash
# 1. WSL 終端打開
wsl
cd ~/polyglyph

# 2. 確認工具齊全
node --version    # 需要 v20+
pnpm --version    # 需要 v9+
pnpm install      # 第一次跑(若 node_modules 不存在)
pnpm validate-scripts  # 驗證能跑

# 3. 跑 Claude Code
claude
```

### 新 session 的 `<PROJECT_ROOT>`

```
~/polyglyph
```

### OBSIDIAN_PATH(填在 TOPIC_ROSTER.md)

如果 Vault 在 Windows 端(常見):
```
OBSIDIAN_PATH=/mnt/c/Users/<you>/Documents/Obsidian/Vault
```

如果 Vault 在 WSL 端(少見):
```
OBSIDIAN_PATH=~/Documents/Obsidian/Vault
```

### 優缺

✅ pnpm / shell / 所有命令照常跑
✅ 跟我這個 session 用同一份檔案
❌ 要會用 WSL

---

## Option B — Native Windows + 把專案 copy/clone 到 Windows

把整個 polyglyph 資料夾**複製到 Windows 端**(例如 `C:\polyglyph`),然後在 Windows 上裝 Node + pnpm,從 PowerShell 跑 Claude Code。

### Setup

```powershell
# 1. 複製專案
# 從 Ubuntu 端打包: tar czf polyglyph.tar.gz polyglyph/
# 然後傳到 Windows 解壓
# 或從 Git 倉庫 clone(目前 polyglyph 還不是 git repo,要先 git init + 推到遠端)

# 2. 在 Windows 端裝工具
# 安裝 Node.js LTS: https://nodejs.org/
npm install -g pnpm

# 3. 在專案目錄
Set-Location C:\polyglyph
pnpm install
pnpm validate-scripts

# 4. 跑 Claude Code(Windows native)
claude
```

### 新 session 的 `<PROJECT_ROOT>`

```
C:/polyglyph
```

(用 `/` 不用 `\`,Read / Write / Bash 工具兩種都吃,但 `/` 不會被 escape 弄亂)

### OBSIDIAN_PATH

```
OBSIDIAN_PATH=C:/Users/<you>/Documents/Obsidian/Vault
```

### 優缺

✅ Native Windows,不依賴 WSL
❌ **兩份檔案不同步** — 新 session 寫的對話在 Windows 端,Ubuntu 端看不到。要週末把 Windows 端 sync 回 Ubuntu(rsync / SCP / 手動 copy)
❌ Windows 上要裝 Node + pnpm + Claude Code

---

## Option C — Windows Claude Code 跨 WSL 存取(我**不推薦**)

Windows 端跑 Claude Code,但用 UNC path `\\wsl.localhost\Ubuntu\...` 跨進 WSL 檔案系統。

### 新 session 的 `<PROJECT_ROOT>`

```
\\wsl.localhost\Ubuntu\home\<you>\polyglyph
```

### 為什麼不推薦

- 跑 `pnpm validate-scripts` 從 Windows 端會卡 — Node binary 在 WSL 端,你需要 WSL terminal 才能跑
- 檔案路徑混合 `\` 跟 `/` 容易出錯
- 性能差(跨檔案系統 IO 慢)

不過如果你真的要,新 session 還是能 read/write 檔案,只是不能跑 shell。對應 START_HERE.md §0.2「不能跑 shell 命令時」流程。

---

## Option D — Cloud sync(Dropbox / OneDrive / iCloud Drive)

讓資料夾在兩台機器自動同步:
- Ubuntu 端把 polyglyph 放在 `~/Dropbox/.../polyglyph`
- Windows 端 Dropbox 自動同步到 `C:\Users\<you>\Dropbox\polyglyph`
- 兩邊都能跑 Claude Code

### 注意事項

- ⚠️ **`node_modules/` 不要同步** — 在 Dropbox 設 ignore,或放在 Dropbox 外。否則同步會吐血。
- 同步衝突:同時編輯同檔會產生 `.conflicted.json`。每天只在一台機器工作。
- 大 binary(images / vocab cache)同步慢

### 新 session 的 `<PROJECT_ROOT>`

依 Windows 上 Dropbox 路徑,例:
```
C:/Users/<you>/Dropbox/polyglyph
```

### OBSIDIAN_PATH

Obsidian vault 本身可能也在 sync(Obsidian Sync 服務或 Dropbox),那就直接給 Windows 端的路徑。

---

## 我推薦的方案

**Option A(WSL)** 如果你願意用 WSL — 最一致、最少陷阱。

**Option D(Dropbox / OneDrive)** 如果你只想用 native Windows 又不想手動 sync。

**Option B** 是「Windows 完全獨立」最乾淨,但你之後要自己處理兩邊檔案 sync。

---

## 把哪個值填進 TOPIC_ROSTER.md?

不管 Option A/B/C/D,在 `TOPIC_ROSTER.md` 頂端的 `OBSIDIAN_PATH=` 後面填**新 session 將會看到的路徑**(從新 session 的 OS 視角)。

例:Option A(WSL,vault 在 Windows 端):
```
OBSIDIAN_PATH=/mnt/c/Users/<you>/Documents/Obsidian/Vault
```

例:Option B(native Windows):
```
OBSIDIAN_PATH=C:/Users/<you>/Documents/Obsidian/Vault
```

---

## 確認 setup 成功的 smoke test

新 session 接手後,在它第一個訊息要它跑:

```
1. 列工作目錄:pwd (bash) 或 Get-Location (PowerShell)
2. 列 blueprint 數量:ls public/dialogues/blueprints/ | wc -l (bash) 或 (Get-ChildItem public/dialogues/blueprints/).Count (PowerShell)
   → 應該是 39
3. 跑 validator:pnpm validate-scripts
   → 應該 312 OK
4. 列 OBSIDIAN_PATH 內第一個 .md 檔(若有設):
   bash: find "$OBSIDIAN_PATH" -iname "*.md" | head -1
   PowerShell: Get-ChildItem -Recurse -Filter "*.md" "$env:OBSIDIAN_PATH" | Select-Object -First 1
```

三項都過 = setup OK,可以開工。
