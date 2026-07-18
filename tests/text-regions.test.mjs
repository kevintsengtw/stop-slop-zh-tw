import assert from 'node:assert/strict';
import test from 'node:test';

import { findProtectedRegions, getLocation, protectedRegionAt } from '../scripts/text-regions.mjs';

test('辨識 Markdown、URL、HTML 與技術 token 保護區', () => {
  const input = [
    '[連結](https://example.com/a,b?x=1) 與 `const x = "a,b";`',
    '<a href="https://example.com">文字</a> user@example.com C:\\repo\\file.md',
    '數量 1,264，版本 v1.2.3，日期 2026-07-16，時間 12:30。',
    '```js',
    'const message = "中文, English";',
    '```',
  ].join('\n');

  const regions = findProtectedRegions(input);
  const types = new Set(regions.map((region) => region.type));
  assert.equal(types.has('markdown-link-target'), true);
  assert.equal(types.has('inline-code'), true);
  assert.equal(types.has('html-tag'), true);
  assert.equal(types.has('email'), true);
  assert.equal(types.has('file-path'), true);
  assert.equal(types.has('version-or-decimal'), true);
  assert.equal(types.has('grouped-number'), true);
  assert.equal(types.has('date'), true);
  assert.equal(types.has('time'), true);
  assert.equal(types.has('fenced-code'), true);

  const codeIndex = input.indexOf('const message');
  assert.equal(protectedRegionAt(regions, codeIndex)?.type, 'fenced-code');
});

test('Markdown 連結只保護目標，顯示文字仍可處理', () => {
  const input = '[使用OpenAI API](https://example.com/a,b?x=1)';
  const regions = findProtectedRegions(input);
  assert.equal(protectedRegionAt(regions, input.indexOf('OpenAI')), null);
  assert.equal(protectedRegionAt(regions, input.indexOf('https'))?.type, 'markdown-link-target');
});

test('位置資訊使用一基準行號與欄位', () => {
  assert.deepEqual(getLocation('第一行\nABC中文', 6), { line: 2, column: 3 });
});

test('用語掃描可選擇不保護數字 token', () => {
  const input = '版本 v1.2.3';
  assert.equal(findProtectedRegions(input).some((region) => region.type === 'version-or-decimal'), true);
  assert.equal(findProtectedRegions(input, { protectNumeric: false }).some((region) => region.type === 'version-or-decimal'), false);
});

test('保護 YAML frontmatter 與常見檔名 token', () => {
  const input = '---\ndescription: 中文, English.\n---\n請看 [original.md](original.md)。';
  const regions = findProtectedRegions(input);
  assert.equal(protectedRegionAt(regions, input.indexOf('description'))?.type, 'yaml-frontmatter');
  assert.equal(protectedRegionAt(regions, input.indexOf('original.md'))?.type, 'file-name');
});
