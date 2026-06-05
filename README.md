# Stop Slop（台灣正體中文版）

移除正體中文（台灣）文章裡的 AI 味，並把中國用語校正成台灣慣用語。

這是 [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) 的台灣正體中文改寫版，結合 [taiwan.md](https://taiwan.md) 的用語對照資料。重點不是把英文規則直譯，而是針對中文語料訓練出來的真實 AI tell，加上台灣用語層。

## 為什麼是「結合」而不是「翻譯」

英文 stop-slop 抓的是 "Here's the thing"、"not just X but Y"、em dash 濫用這類英文模式，直譯到中文沒有用。中文 AI 有自己的 tell：「不僅僅是X，更是Y」「值得注意的是」「賦能／抓手／閉環」、四字成語排比、「首先…其次…最後」骨架。

還有一層是**歐化語法／翻譯腔**——句法結構本身像翻譯，即使一個塑膠句都沒有。「透過…我們可以」「對於…來說」「使得」「…之一」「們」濫用，這些是中文 AI 最深的水印。一篇文章可以零塑膠卻整篇歐化。

而且對台灣讀者來說，**很多 AI 味其實就是中國用語滲漏**（視頻、代碼、賦能）。所以「除 AI 味」「去翻譯腔」與「正台灣用語」這三層會互相強化——這正是把 stop-slop 與 taiwan-md 結合的意義。

## 結構

```
stop-slop-zh-tw/
├── SKILL.md                 # 核心規則
├── references/
│   ├── phrases.md           # 中文 AI 贅詞、中國網路常用語、套話
│   ├── structures.md        # 中文結構性陳腔濫調 + 歐化語法／翻譯腔
│   ├── terminology.md       # 同形詞判斷 + 最高頻保底表 + 掃描器用法
│   └── examples.md          # before/after 改寫範例
├── data/
│   └── terms.json           # 完整用語詞庫（機器讀，不進 context）
├── scripts/
│   ├── zh-tw-terms.mjs      # 台灣用語掃描器（Node，零依賴）
│   └── build-terms.mjs      # 從授權相容來源產生候選詞（供人工審）
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

## 使用方式

裝好之後，在 Claude Code 撰寫或貼上中文時會自動相關，你也可以直接下指令。常見用法：

| 你想做的事 | 這樣說 |
| ------------ | -------- |
| 改寫一段 | 「用 stop-slop-zh-tw 幫我改這段」 |
| 審閱整篇草稿 | 「這篇有沒有 AI 味？照 stop-slop-zh-tw 抓一遍」 |
| 只校正台灣用語 | 「幫我把這段的中國用語校正成台灣用語」 |
| 要分數 | 「依 stop-slop-zh-tw 的六維評分，並指出最該改的三處」 |

**它會做三層處理：**

1. **除 AI 味** — 砍開場清喉嚨、贅詞、公式化結構（「不僅僅是X，更是Y」「首先…其次…」）。
2. **去翻譯腔** — 抓歐化／西化語法（「透過…我們可以」「對於…來說」「使得」「們」濫用）。
3. **正台灣用語** — 中國用語換台灣慣用語（視頻→影片、代碼→程式碼），技術名詞保留英文。

接著會依**直接／節奏／信任／真實／密度／台灣味**六個維度各評 1–10，低於 42/60 建議重寫。

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

> AI 進展很快，但寫程式從來就不只是把程式碼打出來而已。測試該怎麼做，很多團隊都是花了不少冤枉錢才學會的。
>
> 講白一點，做法不外乎三件事：把測試流程理順、把 CI/CD 串起來、讓團隊真的在乎品質。我自己的經驗是，受測對象（SUT）設計得好，程式跑起來更快、相容性也更穩——這件事的影響比想像中大。
>
> 以前我們把測試資料丟進資料庫，偵錯時盯著記憶體和快取，設定預設跑在本地伺服器上。現在 Agent 接手了一部分：它會分析、會寫、也會偵錯。對開發者來說，這不只是換了個工具，做事的方式整個變了。
>
> AI 會繼續改變我們寫程式的方式。你怎麼用它，比它能做什麼更重要。

改了什麼：

- **中國用語校正（掃描器 + 語境判斷）：**
  - auto 全套：軟件→軟體、代碼→程式碼、信息→資訊、數據→資料、數據庫→資料庫、調試→偵錯、內存→記憶體、緩存→快取、性能→效能、兼容→相容、默認→預設、服務器→伺服器。
  - flag 判斷：質量→品質（quality 語境）、配置→設定、智能體→Agent（技術語境保留）、測試對象→受測對象（SUT，見下方取捨）、小夥伴→（刪）。
- **砍掉 AI 起手式與收尾：** 「在當今這個…時代」「眾所周知」「不言而喻」「值得注意的是」「總而言之」「未來可期」「希望這篇文章能幫助到你，別忘了分享」全部移除。
- **打破公式化結構：**
  - 「不僅僅是 X，更是 Y」→ 直接講「不只是把程式碼打出來」。
  - 「首先…其次…最後」的僵化骨架 → 收成一句「不外乎三件事」。
  - 「這不是工具的升級，而是研發範式的顛覆」→ 改成白話的「不只是換了個工具，做事的方式整個變了」。
- **去中國網路常用語：** 賦能、抓手、閉環、落地、範式、重新定義、細思極恐 → 全換白話。
- **沒生命的東西別做人類動作：** 「數據告訴我們」→「我自己的經驗是」。
- **空泛宣稱指名具體：** 「這背後的意義，細思極恐」→「這件事的影響比想像中大」（語氣收斂，不誇大）。

自評（六維，1–10）：

| 維度 | 分數 | 說明 |
| ---- | ---- | ---- |
| 直接 | 8 | 拿掉宣告式起手，直接陳述 |
| 節奏 | 8 | 長短句混搭，破除排比 |
| 信任 | 7 | 收掉鋪陳與討拍收尾 |
| 真實 | 8 | 像工程師口吻，非行銷稿 |
| 密度 | 7 | 四段砍成四段但每句有料 |
| 台灣味 | 9 | 無中國用語殘留，用「你」 |

合計 47/60，過 42 門檻。

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

## 出處

- 方法論與結構：[hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop)（MIT）
- 台灣用語：[frank890417/taiwan-md](https://github.com/frank890417/taiwan-md) / [taiwan.md](https://taiwan.md)（CC BY-SA 4.0）

見 [NOTICE.md](NOTICE.md)。
