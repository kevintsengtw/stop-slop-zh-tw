# Stop Slop（台灣正體中文版）

[![CI](https://github.com/kevintsengtw/stop-slop-zh-tw/actions/workflows/ci.yml/badge.svg)](https://github.com/kevintsengtw/stop-slop-zh-tw/actions/workflows/ci.yml)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](LICENSE)

移除正體中文（台灣）文章裡的 AI 味，並把中國用語校正成台灣慣用語。

本專案以 [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) 的方法論為基礎，參考 [Humanizer-zh-TW](https://github.com/kevintsai1202/Humanizer-zh-TW) 的正體中文 AI 模式與人味概念，並結合 [taiwan.md](https://taiwan.md) 的用語對照資料。針對中文語料中的寫作模式重新實作，再加入台灣用語、保真流程與確定性排版工具，沒有照抄或直譯任何一份來源。

## 為什麼是「結合」而不是「翻譯」

英文 stop-slop 抓的是 "Here's the thing"、"not just X but Y"、em dash 濫用這類英文模式，直譯到中文沒有用。中文 AI 有自己的 tell：「不僅僅是 X，更是 Y」「值得注意的是」「賦能／抓手／閉環」、四字成語排比、「首先…其次…最後」骨架。

還有一層是**歐化語法／翻譯腔**——句法結構本身像翻譯，即使一個塑膠句都沒有。「透過…我們可以」「對於…來說」「使得」「…之一」「們」濫用，這些是中文 AI 最深的水印。一篇文章可以零塑膠卻整篇歐化。

而且台灣讀者看到的 AI 味，**很多其實就是中國用語滲漏**（視頻、代碼、賦能）。所以「除 AI 味」「去翻譯腔」與「正台灣用語」這三層會互相強化——這正是把 stop-slop 與 taiwan-md 結合的意義。

## 結構

```
stop-slop-zh-tw/
├── SKILL.md                 # 核心規則
├── references/
│   ├── phrases.md           # 中文 AI 贅詞、中國網路常用語、套話
│   ├── structures.md        # 中文結構性陳腔濫調 + 歐化語法／翻譯腔
│   ├── terminology.md       # 同形詞判斷 + 最高頻保底表 + 掃描器用法
│   ├── editing-workflow.md  # 審閱模式、長文防縮水、保真與人味邊界
│   ├── typography.md        # 中文全形標點、英文半形標點與中英空格
│   └── examples.md          # before/after 改寫範例
├── data/
│   ├── terms.json           # 完整用語詞庫（機器讀，不進 context）
│   └── term-sources.json    # 詞條來源 ID、授權與追蹤限制
├── scripts/
│   ├── zh-tw-terms.mjs      # 台灣用語掃描器（Node，零依賴）
│   ├── zh-tw-typography.mjs # 台灣中文排版檢查與安全修正
│   ├── text-regions.mjs     # Markdown／URL／程式碼共用保護區
│   ├── file-utils.mjs       # 原子寫回工具
│   ├── validate-terms.mjs   # 詞庫結構與比對安全性驗證
│   └── build-terms.mjs      # 從授權相容來源產生候選詞（供人工審）
├── tests/
│   ├── zh-tw-terms.test.mjs # 掃描器與詞庫回歸測試
│   ├── text-regions.test.mjs
│   └── zh-tw-typography.test.mjs
├── agents/openai.yaml       # Codex skill 介面資訊
├── evals/                   # 長文端對端驗證與可重現腳本
├── LICENSES/                # 第三方 MIT 授權文字
├── package.json             # 公開驗證命令與 Node.js 需求
├── README.md
└── NOTICE.md                # 授權與出處
```

## 執行需求

- Node.js 18 以上；CI 會測試 Node.js 18、20、22。
- 執行期不需要第三方 npm 套件，也不需要先跑 `npm install`。
- 支援 Windows、macOS 與 Linux；文字檔統一使用 UTF-8 和 LF。
- `package.json` 只提供驗證命令，本專案不發布成 npm package。

## 安裝

skill 的安裝位置有兩種慣例：`.agents/skills/` 是跨工具通用路徑，Codex 直接掃描；`.claude/skills/` 是 Claude Code 專屬路徑。Claude Code 目前只讀後者，所以想讓一份檔案兩邊共用，就把資料夾放在 `.agents/skills/`，再從 `.claude/skills/` 建連結指過去。

**只用 Claude Code：** 把整個資料夾放進專案的 `.claude/skills/`，Claude Code 會自動載入，不必額外設定。

```text
你的專案/
└── .claude/
    └── skills/
        └── stop-slop-zh-tw/   ← 放這裡即可
```

**跨工具共用（Claude Code、Codex 與其他支援 Agent Skills 的工具）：** 資料夾放 `.agents/skills/`，再讓 `.claude/skills/` 連過去。

```text
你的專案/
├── .agents/
│   └── skills/
│       └── stop-slop-zh-tw/   ← 資料夾放這裡
└── .claude/
    └── skills/
        └── stop-slop-zh-tw    ← 連結指向上面
```

```bash
# macOS / Linux
mkdir -p .claude/skills
ln -s ../../.agents/skills/stop-slop-zh-tw .claude/skills/stop-slop-zh-tw
```

```powershell
# Windows（建 junction 指向實際位置）
New-Item -ItemType Directory -Force -Path ".claude\skills" | Out-Null
New-Item -ItemType Junction `
  -Path "$PWD\.claude\skills\stop-slop-zh-tw" `
  -Target "$PWD\.agents\skills\stop-slop-zh-tw"
```

**全域使用（所有專案共用）：** Claude Code 讀 `~/.claude/skills/`，Codex 與其他工具讀 `~/.agents/skills/`；也可以只放一份，另一邊建連結指向它。

```bash
# macOS / Linux
ln -s "$(pwd)/stop-slop-zh-tw" ~/.claude/skills/stop-slop-zh-tw
```

```powershell
# Windows（建 junction 指向實際位置）
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\.claude\skills\stop-slop-zh-tw" `
  -Target "D:\path\to\your-project\.agents\skills\stop-slop-zh-tw"
```

**Codex：** 掃描順序是 `$CWD/.agents/skills`、沿路往上到 `$REPO_ROOT/.agents/skills`、`$HOME/.agents/skills`、`/etc/codex/skills`，最後是內建 skill。放進其中一層即可，不需要設定 `CODEX_HOME`。

**Claude Projects：** 把 `SKILL.md` 與 references 上傳到專案知識。

**API / 系統提示：** 把 `SKILL.md` 放進 system prompt，references 按需載入。

若只建立最小執行安裝，保留 `SKILL.md`、`agents/`、`references/`、`data/`、`scripts/` 即可。重新散布時仍須一併保留 `LICENSE`、`LICENSES/` 與 `NOTICE.md`；`tests/`、`evals/` 和 `plans/` 是維護與驗證資料，不是 skill 執行期依賴。

## 使用方式

裝好之後，在 Claude Code 撰寫或貼上中文時會自動相關，你也可以直接下指令。常見用法：

| 你想做的事 | 這樣說 |
| ------------ | -------- |
| 改寫一段 | 「用 stop-slop-zh-tw 幫我改這段」 |
| 審閱整篇草稿 | 「這篇有沒有 AI 味？照 stop-slop-zh-tw 抓一遍」 |
| 只找問題、不改稿 | 「只標出有 AI 味的地方，先不要改」 |
| 只校正台灣用語 | 「幫我把這段的中國用語校正成台灣用語」 |
| 只檢查排版 | 「檢查中文標點和中英文空格，不要改內容」 |
| 要分數 | 「依 stop-slop-zh-tw 的六維評分，並指出最該改的三處」 |

**它會做三層處理：**

1. **除 AI 味** — 砍開場清喉嚨、贅詞、公式化結構（「不僅僅是 X，更是 Y」「首先…其次…」）。
2. **去翻譯腔** — 抓歐化／西化語法（「透過…我們可以」「對於…來說」「使得」「們」濫用）。
3. **正台灣用語** — 中國用語換台灣慣用語（視頻→影片、代碼→程式碼），技術名詞保留英文。

改寫前會先確認任務模式。只想找問題時，輸出位置、問題、理由與處理方向，不附改寫版；要求改寫時，長文預設保留段落規模和所有資訊點。交稿前會回頭核對數字、專名、引言、因果與作者立場，也不會替作者編造第一人稱經歷或資料。完整規則見 [references/editing-workflow.md](references/editing-workflow.md)。

需要評分時，會依**直接／節奏／信任／真實／密度／台灣味**六個維度各評 1–10。分數只用來指出檢查方向，不作為自動重寫或刪減內容的門檻。

**一個完整例子：**

改前：

> 在當今這個 AI 飛速發展的時代，軟件開發早已不僅僅是寫代碼那麼簡單，更是一場關於工程效能的深刻變革。眾所周知，測試的重要性不言而喻。值得注意的是，很多團隊在這條路上交了不少學費。
>
> 首先，我們要對測試流程進行賦能，找到一個強抓手；其次，把 CI/CD 的閉環徹底打通；最後，讓質量意識在團隊裡真正落地。數據告訴我們，一個好的測試對象設計，能夠顯著提升代碼的性能與兼容性——這背後的意義，細思極恐。
>
> 過去，我們把測試信息存進數據庫，調試時盯著內存和緩存，配置默認跑在本地服務器上。如今，智能體（Agent）重新定義了這一切。它能分析、能編寫、能調試，賦能每一位開發者。可以說，這不是工具的升級，而是研發範式的顛覆。
>
> 總而言之，擁抱 AI、擁抱變化，未來可期。希望這篇文章能幫助到你，如果覺得有用，別忘了分享給更多的小夥伴！

改後：

> AI 進展很快。軟體開發除了寫程式碼，也包含測試；很多團隊花了不少代價，才建立出合適的測試做法。
>
> 做法有三個環節：整理測試流程、串好 CI/CD、建立團隊的品質標準。原稿還主張「測試對象的設計會影響程式效能與相容性」，但沒有附資料來源。〔待作者補充：資料或案例〕
>
> 以前我們把測試資料丟進資料庫，偵錯時盯著記憶體和快取，設定預設跑在本地伺服器上。現在 Agent 接手了一部分工作：它會分析、會寫，也會偵錯，開發流程也跟著改變。
>
> AI 會繼續改變我們寫程式的方式。

改了什麼：

- **中國用語校正（掃描器 + 語境判斷）：**
  - auto 全套：軟件→軟體、代碼→程式碼、信息→資訊、數據→資料、數據庫→資料庫、調試→偵錯、內存→記憶體、緩存→快取、性能→效能、兼容→相容、默認→預設、服務器→伺服器。
  - flag 判斷：質量→品質（quality 語境）、配置→設定、智能體→Agent（技術語境保留）、測試對象→受測對象（SUT，見下方取捨）、小夥伴→（刪）。
- **砍掉 AI 起手式與收尾：** 「在當今這個…時代」「眾所周知」「不言而喻」「值得注意的是」「總而言之」「未來可期」「希望這篇文章能幫助到你，別忘了分享」全部移除。
- **打破公式化結構：**
  - 「不僅僅是 X，更是 Y」→ 直接列出軟體開發包含程式碼與測試。
  - 「首先…其次…最後」的僵化骨架 → 收成一句「做法有三個環節」。
  - 「這不是工具的升級，而是研發範式的顛覆」→ 改成具體的「Agent 接手部分工作，開發流程也跟著改變」。
- **去中國網路常用語：** 賦能、抓手、閉環、落地、範式、重新定義、細思極恐 → 全換白話。
- **不替作者補經驗或來源：** 「數據告訴我們」沒有交代數據來源，改寫時保留原本主張並標示待補，不擅自變成「我自己的經驗」。
- **空泛宣稱不硬補內容：** 「這背後的意義，細思極恐」沒有資訊量，直接刪除；缺少的證據明確標示待作者補充。

自評（六維，1–10）：

| 維度 | 分數 | 說明 |
| ---- | ---- | ---- |
| 直接 | 8 | 拿掉宣告式起手，直接陳述 |
| 節奏 | 8 | 長短句混搭，破除排比 |
| 信任 | 7 | 收掉鋪陳與討拍收尾 |
| 真實 | 8 | 像工程師口吻，非行銷稿 |
| 密度 | 7 | 四段砍成四段但每句有料 |
| 台灣味 | 9 | 無中國用語殘留，用「你」 |

合計 47/60；優先檢查「信任」與「密度」兩個較低的面向。

一個取捨先講：「對象」是 flag 詞（object→物件，但 target／測試對象要看語境），不會無腦校正。原文「測試對象設計」語意其實有點含糊——指 test double（測試替身）還是受測系統？從「設計得好能提升效能與相容性」判斷指的是受測系統，故改成「受測對象（SUT，System Under Test）」而非「測試物件」。若原意是 mock／stub 那類測試替身，再調整即可。

更多 before/after 見 [references/examples.md](references/examples.md)。

## 觸發

撰寫、編輯、審閱中文文章時自動相關。也可直接說「用 stop-slop-zh-tw 幫我改這段」「除一下 AI 味」「校正台灣用語」。

## 預設立場（可自行調整）

- 預設用「你」而非「您」
- 技術名詞保留英文（Agent、MCP、Extension、PR、commit）
- 同形詞（框架、部署、分支）不過度校正

## 用語對照的範圍與延伸資源

用語對照數以千計，不可能（也不該）全塞進會載入 context 的 skill 檔。本專案採 **hybrid 架構**：

- **判斷層**（去 AI 味、去翻譯腔）靠 LLM，留在 phrases.md／structures.md，無法也不該 script 化。
- **查表層**（正台灣用語）的完整詞庫放 [data/terms.json](data/terms.json)，由掃描器 [scripts/zh-tw-terms.mjs](scripts/zh-tw-terms.mjs) 讀取——**詞庫不進 context，只回報實際命中的詞**，所以詞庫再大也不膨脹。
- [references/terminology.md](references/terminology.md) 只留同形詞判斷、最高頻保底表（給不能執行 script 的 Projects／API 環境）與掃描器用法。

詞庫可用 `match` 指定比對策略：中文多字詞預設為 `substring`，明確技術詞組可用 `phrase`，英數詞使用 `word` 避免 `emo` 命中 `emoji`，少數複雜規則才使用 `regex`。單一中文字不能直接做全域子字串掃描；應改收完整詞組。

```bash
npm run validate
```

這會執行 28 項 Node.js 測試、skill 結構檢查、209 筆正式詞條驗證及第二次長文端對端驗證。GitHub Actions 會在 Node.js 18、20、22 重複執行相同命令。

詞條驗證器會拒絕重複 `from`、不合法的 mode、沒有邊界策略的英數詞、單字級中文字，以及含多個替代選項的 `auto` 詞條。
正式詞條另須提供 `source`；來源 ID 與授權說明記錄在 [data/term-sources.json](data/term-sources.json)。

排版工具會先保護 Markdown 程式碼、URL、連結目標、HTML 標籤、Email、路徑與數字型技術 token，再處理三項硬性規則：中文句子使用全形標點、英文句子保留半形標點、中英文之間使用一個半形空白。

```bash
node scripts/zh-tw-typography.mjs --check <檔案>
node scripts/zh-tw-typography.mjs --json <檔案>
node scripts/zh-tw-typography.mjs --dry-run <檔案>
node scripts/zh-tw-typography.mjs --fix <檔案>
```

`--check`、`--json` 與 `--dry-run` 都不寫入；確認差異後才使用 `--fix`。

詞庫可從下列來源擴充（已標授權與可用性）：

| 資源 | 內容 | 授權 | 對本專案 |
| ---- | ---- | ---- | -------- |
| [taiwan.md](https://taiwan.md) | 3936+ 條，分 A–F 類 | CC BY-SA 4.0 | ✅ 本專案基礎，可併用 |
| [aronhack 中國用語雷達](https://github.com/aronhack/Chinese-Vocabulary-Radar) | 約 1000 條，繁體 key，含網路新詞 | 資料 CC0 | ✅ 可自由使用 |
| [OpenCC](https://github.com/BYVoid/OpenCC) | TWPhrases 簡→台詞庫，最成熟 | Apache 2.0 | ✅ 可用（須註明出處）；為簡體 key，適合做前處理 |
| [g0v 萌典 moedict-data-csld](https://github.com/g0v/moedict-data-csld) | 《中華大辭典》同實異名 CSV | 詞條 CC BY-NC-ND 4.0 | ⚠️ 僅供查閱驗證，不可改作併入 |
| [教育部兩岸常用詞語對照表](https://dict.concised.moe.edu.tw/appendix.jsp?ID=54) | 教育部辭典附錄，權威 | 版權所有 | ⚠️ 僅供查閱，不可併入 |
| [維基教科書．大陸台灣計算機術語對照表](https://zh.wikibooks.org/zh-tw/%E5%A4%A7%E9%99%86%E5%8F%B0%E6%B9%BE%E8%AE%A1%E7%AE%97%E6%9C%BA%E6%9C%AF%E8%AF%AD%E5%AF%B9%E7%85%A7%E8%A1%A8) | 純資訊領域術語 | CC BY-SA 3.0 | ✅ 相容（註明＋相同方式分享） |

**授權提醒：** 標 ⚠️ 的來源可查閱、可連結引用，但**不可把詞條複製改作併入**本專案。NC（非商業）、ND（禁止改作）、版權所有都與本專案的 CC BY-SA 4.0 不相容。

**更新詞庫（維護者）：** 跑 `node scripts/build-terms.mjs` 會從 aronhack（CC0）抓資料，去重、過濾後把**新候選詞**寫到 `data/terms.candidates.json`（不覆蓋 `terms.json`）。**候選一律需人工審**——確認譯法、決定 `auto`／`flag`、剔除無關生活詞，再手動併入 `terms.json`。這道人工關卡是刻意的：來源資料含錯譯（如 進程→程序、鼠標→游標），自動併入會把錯誤帶進來。

## 驗證範圍與限制

目前有兩組合成長文案例。第二組會自動比對篇幅、章節、內容區塊、92 個數字 token、24 種技術保護字串、用語、排版與冪等性；完整報告見 [evals/fresh-longform-application/comparison.md](evals/fresh-longform-application/comparison.md)。

合成案例適合回歸測試，但不能取代真實文章與獨立人工審閱。因此目前適合視為公開 beta；在加入取得授權的真實語料、不同文體與外部盲測前，不宣稱已涵蓋所有中文寫作情境。

## 出處

- 方法論與結構：[hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop)（MIT）
- 正體中文 AI 模式與人味概念：[kevintsai1202/Humanizer-zh-TW](https://github.com/kevintsai1202/Humanizer-zh-TW)（MIT）
- 台灣用語：[frank890417/taiwan-md](https://github.com/frank890417/taiwan-md) / [taiwan.md](https://taiwan.md)（CC BY-SA 4.0）
- 詞彙資料：[aronhack/Chinese-Vocabulary-Radar](https://github.com/aronhack/Chinese-Vocabulary-Radar)（資料 CC0）

完整第三方授權、取用範圍與修改說明見 [NOTICE.md](NOTICE.md) 及 [LICENSES/](LICENSES/)。本專案整體發行包依 [CC BY-SA 4.0](LICENSE) 釋出。
