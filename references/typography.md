# 台灣中文排版規則

需要檢查或修正中文標點、中英混排空格時讀取本文件。先保護技術內容，再套用機械規則；不要用排版修正改變文字內容。

## 硬性規則

1. 含中文的句子使用全形標點：`，。：；！？`。
2. 純英文句子使用半形標點：`, . : ; ! ?`。
3. 中文與英文字母或英文縮寫之間使用一個 U+0020 半形空白。

```text
使用OpenAI API測試, 結果正常.
→
使用 OpenAI API 測試，結果正常。
```

```text
Build failed， please retry。
→
Build failed, please retry.
```

第三項只規範中文與英文字母的交界，不自行延伸成數字、單位或所有空白的全域正規化規則。

## 保護區

不得修改下列區域內的標點、空格或用語：

- Markdown fenced code block
- Markdown inline code
- URL、autolink 與 Markdown 連結目標
- HTML 標籤及屬性
- Email 與常見檔案路徑
- dotted 技術識別字（`.NET`、`net8.0`、`Testing.Platform`、`System.IO.Abstractions`）
- 千分位數字、版本號、小數、日期與時間

Markdown 連結的顯示文字仍可檢查，只有目標需要保護：

```text
[使用OpenAI API,測試](https://example.com/a,b?x=1)
→
[使用 OpenAI API，測試](https://example.com/a,b?x=1)
```

括號與引號只在能安全判斷成對關係和語境時處理。現階段確定性工具不自動轉換括號與引號，留給人工審閱。

## 工具

預設使用檢查模式，不寫入來源檔案：

```bash
node scripts/zh-tw-typography.mjs --check <檔案>
node scripts/zh-tw-typography.mjs --json <檔案>
node scripts/zh-tw-typography.mjs --dry-run <檔案>
```

確認差異後才寫回：

```bash
node scripts/zh-tw-typography.mjs --fix <檔案>
```

- `--check`：列出逐筆問題；發現問題時回傳 exit code 1。
- `--json`：輸出規則 ID、行號、欄位、片段、建議與保護區。
- `--dry-run`：顯示預計修改，不寫入檔案。
- `--fix`：以暫存檔和原子替換安全寫回。

工具重複執行必須具備冪等性。若第二次仍產生差異，視為規則衝突或實作錯誤，不要繼續自動寫回。

## 人工複核

確定性工具完成後仍要檢查：

- 句子被判成中文或英文是否符合實際語境。
- 引號內原話、產品名稱與刻意引用的錯字是否應維持原樣。
- 數字、單位、版本、路徑及指令是否完全一致。
- 排版修正是否意外改變 Markdown 結構。
