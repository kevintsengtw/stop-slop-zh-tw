import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { formatTypography } from '../scripts/zh-tw-typography.mjs';

test('SF：中文句子使用全形標點並統一中英文空格', () => {
  const input = '使用  OpenAI API測試, 結果正常.';
  const result = formatTypography(input);
  assert.equal(result.output, '使用 OpenAI API 測試，結果正常。');
  assert.equal(result.issues.some((issue) => issue.ruleId === 'zh-fullwidth-punctuation'), true);
  assert.equal(result.issues.some((issue) => issue.ruleId === 'cjk-latin-spacing'), true);
});

test('SF：純英文句子將全形標點修復為半形', () => {
  assert.equal(
    formatTypography('Build failed， please retry。').output,
    'Build failed, please retry.',
  );
});

test('SNF：URL、程式碼、Email、路徑與數字 token 保持原樣', () => {
  const protectedValues = [
    'https://example.com/a,b?x=1',
    '`const message = "Hello, world.";`',
    'user@example.com',
    'C:\\repo\\file.md',
    'v1.2.3',
    '1,264',
    'NT$3,500',
    '2026-07-16',
    '12:30',
  ];
  const input = `網址: ${protectedValues.join(' ')} 發布.`;
  const output = formatTypography(input).output;
  for (const value of protectedValues) assert.equal(output.includes(value), true, value);
  assert.equal(output.startsWith('網址：'), true);
  assert.equal(output.endsWith('發布。'), true);
});

test('Markdown 連結顯示文字可修正，連結目標不可修改', () => {
  const input = '[使用OpenAI API,測試](https://example.com/a,b?x=1)';
  assert.equal(
    formatTypography(input).output,
    '[使用 OpenAI API，測試](https://example.com/a,b?x=1)',
  );
});

test('YAML frontmatter 與連結中的檔名保持原樣', () => {
  const input = '---\ndescription: 中文, English.\n---\n請看 [original.md](original.md),謝謝.';
  const output = formatTypography(input).output;
  assert.equal(output, '---\ndescription: 中文, English.\n---\n請看 [original.md](original.md)，謝謝。');
});

test('Markdown 表格儲存格結尾空白不被移除', () => {
  const input = '| 問題 | 說明 |\n| --- | --- |\n| 狀態 | 通過嗎？ |';
  assert.equal(formatTypography(input).output, input);
});

test('fenced code 與 inline code 內容完全不變', () => {
  const input = [
    '中文OpenAI,測試.',
    '',
    '```js',
    'const 中文API = "a,b";',
    '```',
    '',
    '行內 `const 中文API = "a,b";` 保留。',
  ].join('\n');
  const output = formatTypography(input).output;
  assert.equal(output.includes('const 中文API = "a,b";'), true);
  assert.equal(output, [
    '中文 OpenAI，測試。',
    '',
    '```js',
    'const 中文API = "a,b";',
    '```',
    '',
    '行內 `const 中文API = "a,b";` 保留。',
  ].join('\n'));
});

test('格式化具備冪等性', () => {
  const once = formatTypography('使用OpenAI API,結果正常.').output;
  const twice = formatTypography(once);
  assert.equal(twice.output, once);
  assert.deepEqual(twice.issues, []);
});

test('JSON 診斷包含規則、行列、片段與保護狀態', () => {
  const issue = formatTypography('第一行\n使用OpenAI.').issues[0];
  assert.equal(typeof issue.ruleId, 'string');
  assert.deepEqual({ line: issue.line, column: issue.column }, { line: 2, column: 3 });
  assert.equal(issue.excerpt.includes('使用OpenAI'), true);
  assert.equal(issue.protected, false);
});

test('CLI 的 --dry-run 不寫入，--fix 才安全寫回', () => {
  const directory = mkdtempSync(join(tmpdir(), 'stop-slop-typography-'));
  const file = join(directory, 'sample.md');
  const script = fileURLToPath(new URL('../scripts/zh-tw-typography.mjs', import.meta.url));
  try {
    writeFileSync(file, '使用OpenAI,測試.', 'utf8');
    execFileSync(process.execPath, [script, '--dry-run', file]);
    assert.equal(readFileSync(file, 'utf8'), '使用OpenAI,測試.');

    execFileSync(process.execPath, [script, '--fix', file]);
    assert.equal(readFileSync(file, 'utf8'), '使用 OpenAI，測試。');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI 的 --check 發現問題時回傳非零且不寫入', () => {
  const directory = mkdtempSync(join(tmpdir(), 'stop-slop-typography-check-'));
  const file = join(directory, 'sample.md');
  const script = fileURLToPath(new URL('../scripts/zh-tw-typography.mjs', import.meta.url));
  try {
    writeFileSync(file, '中文,測試.', 'utf8');
    const result = spawnSync(process.execPath, [script, '--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(readFileSync(file, 'utf8'), '中文,測試.');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('SNF：dotted 技術識別字不被改成全形句號', () => {
  const input = [
    '本專案支援 .NET 8 與 .NET 10，目標框架為 net8.0 / net9.0 / net10.0。',
    'TUnit 0.6.123 與 Testing.Platform 的版本鏈鎖必須遵守。',
    'System.IO.Abstractions.TestingHelpers 用於檔案系統測試。',
    '設定檔為 .csproj，忽略清單為 .gitignore，設定放在 .claude 目錄。',
  ].join('\n');
  const result = formatTypography(input);
  assert.deepEqual(result.issues, []);
  assert.equal(result.output, input);
});

test('SF：中文句尾的半形句點仍會改成全形', () => {
  const result = formatTypography('這句話結束了.下一句應該被改成全形句號。');
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].ruleId, 'zh-fullwidth-punctuation');
  assert.equal(result.output, '這句話結束了。下一句應該被改成全形句號。');
});
