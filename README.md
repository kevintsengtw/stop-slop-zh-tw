# Stop Slop（台灣正體中文版）

移除正體中文（台灣）文章裡的 AI 味，並把中國用語校正成台灣慣用語。

這是 [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) 的台灣正體中文改寫版，結合 [taiwan.md](https://taiwan.md) 的用語對照資料。重點不是把英文規則直譯，而是針對中文語料訓練出來的真實 AI tell，加上台灣用語層。

## 為什麼是「結合」而不是「翻譯」

英文 stop-slop 抓的是 "Here's the thing"、"not just X but Y"、em dash 濫用這類英文模式，直譯到中文沒有用。中文 AI 有自己的 tell：「不僅僅是X，更是Y」「值得注意的是」「賦能／抓手／閉環」、四字成語排比、「首先…其次…最後」骨架。

還有一層是**歐化語法／翻譯腔**——句法結構本身像翻譯，即使一個塑膠句都沒有。「透過…我們可以」「對於…來說」「使得」「…之一」「們」濫用，這些是中文 AI 最深的水印。一篇文章可以零塑膠卻整篇歐化（理論根基：余光中〈論中文的常態與變態〉）。

而且對台灣讀者來說，**很多 AI 味其實就是中國用語滲漏**（視頻、代碼、賦能）。所以「除 AI 味」「去翻譯腔」與「正台灣用語」這三層會互相強化——這正是把 stop-slop 與 taiwan-md 結合的意義。

## 結構

```
stop-slop-zh-tw/
├── SKILL.md                 # 核心規則
├── references/
│   ├── phrases.md           # 中文 AI 贅詞、互聯網黑話、套話
│   ├── structures.md        # 中文結構性陳腔濫調 + 歐化語法／翻譯腔
│   ├── terminology.md       # 中國用語→台灣用語（taiwan-md 層）
│   └── examples.md          # before/after 改寫範例
├── README.md
└── NOTICE.md                # 授權與出處
```

## 安裝

**專案層級（單一 repo 使用）：** 把整個資料夾放進專案的 `.claude/skills/`，Claude Code 會自動載入，不必額外設定。

```text
你的專案/
└── .claude/
    └── skills/
        └── stop-slop-zh-tw/   ← 放這裡即可
```

**全域使用（所有專案共用）：** 把資料夾放進 `~/.claude/skills/`，或建連結指向現有位置。

```bash
# macOS / Linux
ln -s "$(pwd)/stop-slop-zh-tw" ~/.claude/skills/stop-slop-zh-tw
```

```powershell
# Windows（建 junction 指向實際位置）
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\.claude\skills\stop-slop-zh-tw" `
  -Target "D:\path\to\your-project\.claude\skills\stop-slop-zh-tw"
```

**Claude Projects：** 把 `SKILL.md` 與 references 上傳到專案知識。

**API / 系統提示：** 把 `SKILL.md` 放進 system prompt，references 按需載入。

## 觸發

撰寫、編輯、審閱中文文章時自動相關。也可直接說「用 stop-slop-zh-tw 幫我改這段」「除一下 AI 味」「校正台灣用語」。

## 預設立場（可自行調整）

- 預設用「你」而非「您」
- 技術名詞保留英文（Agent、MCP、Extension、PR、commit）
- 同形詞（框架、部署、分支）不過度校正

## 出處

- 方法論與結構：[hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop)（MIT）
- 台灣用語：[frank890417/taiwan-md](https://github.com/frank890417/taiwan-md) / [taiwan.md](https://taiwan.md)（CC BY-SA 4.0）

見 [NOTICE.md](NOTICE.md)。
