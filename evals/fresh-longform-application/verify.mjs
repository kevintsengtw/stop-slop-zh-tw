#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { findProtectedRegions } from '../../scripts/text-regions.mjs';
import { formatTypography } from '../../scripts/zh-tw-typography.mjs';
import { scan } from '../../scripts/zh-tw-terms.mjs';

const original = readFileSync(new URL('./original.md', import.meta.url), 'utf8');
const revised = readFileSync(new URL('./revised.md', import.meta.url), 'utf8');
const terms = JSON.parse(readFileSync(new URL('../../data/terms.json', import.meta.url), 'utf8'));

const SELECTED_SLOP = [
  '在當今數字化浪潮席捲各行各業的時代',
  '不僅僅是',
  '眾所周知',
  '形成閉環',
  '核心抓手',
  '沉澱最佳實踐',
  '充分說明',
  '重新定義',
  '值得注意的是',
  '就這樣',
  '不是人被機器替代，而是人被賦能',
  '總而言之',
  '深刻重構',
  '數字化護城河',
  '讓我們擁抱變化',
  '未來可期',
];

const REQUIRED_EXACT_STRINGS = [
  'title: SeatFlow 十二週上線復盤',
  'owner: library-digital-team',
  '`SeatFlow 3.8.1`',
  '`booking-api`',
  '`https://seat.example.test/v2/reservations`',
  '`config/seat-production.yml`',
  '`node scripts/audit-booking-events.mjs --since 2026-02-03`',
  '`Fallback is enabled，retry after 30 seconds。`',
  '`SeatFlow 3.8.0`',
  '`LIB-284`',
  '「系統知道哪張椅子空著，但不知道眼前這位讀者為什麼需要靠近電梯。」',
];

function countOccurrences(text, value) {
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(value, index)) !== -1) {
    count += 1;
    index += value.length;
  }
  return count;
}

function frequency(values) {
  const result = {};
  for (const value of values) result[value] = (result[value] || 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function numericTokens(text) {
  return text.match(/\d+(?:[.,:-]\d+)*/g) || [];
}

function h2Count(text) {
  return (text.match(/^## /gm) || []).length;
}

function contentBlockCount(text) {
  const withoutFrontmatter = text.replace(/^(?:\uFEFF)?---[\s\S]*?---\s*/, '');
  return withoutFrontmatter
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith('#')).length;
}

function nonWhitespaceLength(text) {
  return text.replace(/\s/gu, '').length;
}

function selectedSlopCount(text) {
  return SELECTED_SLOP.reduce((total, phrase) => total + countOccurrences(text, phrase), 0);
}

function protectedSubstringFrequency(text) {
  const values = findProtectedRegions(text).map((region) => text.slice(region.start, region.end));
  const unique = [...new Set(values)];
  return Object.fromEntries(unique.map((value) => [value, countOccurrences(text, value)]));
}

const originalTypography = formatTypography(original);
const revisedTypography = formatTypography(revised);
const secondTypographyPass = formatTypography(revisedTypography.output);
const originalTermHits = scan(original, terms);
const revisedTermHits = scan(revised, terms);
const originalProtected = protectedSubstringFrequency(original);
const revisedProtected = Object.fromEntries(
  Object.keys(originalProtected).map((value) => [value, countOccurrences(revised, value)]),
);

for (const value of REQUIRED_EXACT_STRINGS) {
  assert.equal(
    countOccurrences(revised, value),
    countOccurrences(original, value),
    `指定保護字串出現次數不同：${value}`,
  );
}

assert.deepEqual(frequency(numericTokens(revised)), frequency(numericTokens(original)), '數字 token 或次數改變');
assert.deepEqual(revisedProtected, originalProtected, '技術保護區字串或次數改變');
assert.equal(h2Count(revised), h2Count(original), 'H2 章節數改變');
assert.equal(contentBlockCount(revised), contentBlockCount(original), '非標題內容區塊數改變');
assert.ok(nonWhitespaceLength(revised) / nonWhitespaceLength(original) >= 0.8, '長文保留率低於 80%');
assert.ok(originalTypography.issues.length > 0, '原稿應包含排版問題，以驗證規則能觸發');
assert.deepEqual(revisedTypography.issues, [], '改寫版仍有排版問題');
assert.equal(secondTypographyPass.output, revised, '第二次排版結果不同，不具冪等性');
assert.deepEqual(secondTypographyPass.issues, [], '第二次排版仍產生問題');
assert.ok(originalTermHits.length > 0, '原稿應包含台灣用語問題，以驗證規則能觸發');
assert.deepEqual(revisedTermHits, [], '改寫版仍有台灣用語命中');
assert.ok(selectedSlopCount(original) > 0, '原稿應包含選定的 AI 寫作模式');
assert.equal(selectedSlopCount(revised), 0, '改寫版仍包含選定的 AI 寫作模式');

const metrics = {
  nonWhitespace: {
    original: nonWhitespaceLength(original),
    revised: nonWhitespaceLength(revised),
    retainedPercent: Number((nonWhitespaceLength(revised) / nonWhitespaceLength(original) * 100).toFixed(1)),
  },
  h2Sections: { original: h2Count(original), revised: h2Count(revised) },
  contentBlocks: { original: contentBlockCount(original), revised: contentBlockCount(revised) },
  numericTokens: {
    original: numericTokens(original).length,
    revised: numericTokens(revised).length,
    exactMultiset: true,
  },
  protectedSubstrings: {
    unique: Object.keys(originalProtected).length,
    exactCounts: true,
  },
  terminologyHits: {
    originalAuto: originalTermHits.filter((hit) => hit.mode === 'auto').length,
    originalFlag: originalTermHits.filter((hit) => hit.mode === 'flag').length,
    revisedAuto: revisedTermHits.filter((hit) => hit.mode === 'auto').length,
    revisedFlag: revisedTermHits.filter((hit) => hit.mode === 'flag').length,
  },
  typographyIssues: {
    original: originalTypography.issues.length,
    revised: revisedTypography.issues.length,
    idempotent: true,
  },
  selectedSlopHits: {
    original: selectedSlopCount(original),
    revised: selectedSlopCount(revised),
  },
};

console.log(JSON.stringify({ passed: true, metrics }, null, 2));
