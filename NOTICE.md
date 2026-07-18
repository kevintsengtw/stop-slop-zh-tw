# NOTICE — 授權與出處

本 skill 參考、改寫並結合四個開放授權專案。各來源的取用範圍、修改方式與授權如下。

## 來源一：stop-slop

- 專案：https://github.com/hardikpandya/stop-slop
- 作者：Hardik Pandya
- 授權：MIT
- 取用內容：skill 的整體結構（SKILL.md / references 分層）、核心規則框架、評分 rubric 的概念。
- 修改說明：規則依正體中文與台灣技術寫作情境重新組織、改寫及擴充，並加入台灣用語、排版工具與保真流程，不是英文原文直譯。
- 完整授權：[LICENSES/stop-slop-MIT.txt](LICENSES/stop-slop-MIT.txt)

## 來源二：Humanizer-zh-TW

- 專案：https://github.com/kevintsai1202/Humanizer-zh-TW
- 作者：歸藏
- 授權：MIT
- 取用內容：正體中文 AI 寫作模式的整理方式、保留含義、信任讀者、人味／個性及品質評分等概念。
- 修改說明：本專案依自己的流程重新實作；Annotation mode、長文防縮水、保真硬門檻、台灣用語掃描與確定性排版工具是另外設計的功能，不宣稱來自 Humanizer-zh-TW。
- 完整授權：[LICENSES/Humanizer-zh-TW-MIT.txt](LICENSES/Humanizer-zh-TW-MIT.txt)

## 來源三：taiwan-md

- 專案：https://github.com/frank890417/taiwan-md（網站 https://taiwan.md）
- 維護者：frank890417
- 授權：CC BY-SA 4.0
- 取用內容：中國用語 → 台灣用語的對照概念與高頻詞彙子集（見 references/terminology.md 與 data/terms.json）。
- 修改說明：只保留與本專案相關的子集，經人工校正、分類並加入 auto／flag 與比對邊界；不是來源資料的完整鏡像。

## 來源四：Chinese-Vocabulary-Radar（中國用語雷達）

- 專案：https://github.com/aronhack/Chinese-Vocabulary-Radar
- 授權：程式 MIT；資料（taiwan_china_vocabs.json）CC0 公眾領域
- 取用內容：technical 與網路流行語的部分高頻詞，經人工精選、校正後併入 references/terminology.md 與 data/terms.json。
- 說明：CC0 法律上不要求姓名標示，此處列出僅為致謝與可追溯。併入時已剔除誤譯與非台灣慣用的條目。

## 本衍生作品授權

因納入 CC BY-SA 4.0 的內容，本專案整體發行包依「相同方式分享（ShareAlike）」原則，以 **CC BY-SA 4.0** 釋出，完整條款見根目錄 [LICENSE](LICENSE)。第三方內容仍保有各自的著作權與授權聲明。

- 你可自由使用、修改、再散布。
- 散布時須保留上述四個來源的標示、修改說明與第三方授權文字。
- stop-slop 與 Humanizer-zh-TW 的 MIT copyright 和 permission notice 收錄於 `LICENSES/`，散布時不得移除。
- taiwan.md 衍生內容須依 CC BY-SA 4.0 或相容授權釋出。

CC BY-SA 4.0 說明：https://creativecommons.org/licenses/by-sa/4.0/deed.zh-tw

## 詞條來源追蹤

正式詞庫的 `source` 欄位對應 [data/term-sources.json](data/term-sources.json)。早期 209 筆詞條在逐筆來源制度建立前已由 taiwan.md、Chinese-Vocabulary-Radar 與人工審訂組成，因此統一標成 `legacy-curated-composite`，不推測無法證實的單一上游。

之後的新候選必須保留明確來源；人工併入正式詞庫時，也必須保留或更新 `source`，並在 `note` 記錄容易誤判的語境邊界。

## 提醒

若你打算把這份 skill 公開散布（例如放上 GitHub 或 Gitea Release），
請保留本 NOTICE.md，並在 README 標明出處。
