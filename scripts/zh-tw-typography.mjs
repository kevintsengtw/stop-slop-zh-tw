#!/usr/bin/env node
// zh-tw-typography.mjs — 台灣中文標點與中英文空格檢查器

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { atomicWriteFile } from './file-utils.mjs';
import {
  findProtectedRegions,
  getExcerpt,
  getLocation,
  isProtectedIndex,
} from './text-regions.mjs';

const ASCII_TO_FULL = new Map([
  [',', '，'],
  ['.', '。'],
  [':', '：'],
  [';', '；'],
  ['!', '！'],
  ['?', '？'],
]);
const FULL_TO_ASCII = new Map([...ASCII_TO_FULL].map(([ascii, full]) => [full, ascii]));
const TERMINAL_PUNCTUATION = new Set(['。', '！', '？', '.', '!', '?']);
const FULL_PUNCTUATION = new Set(FULL_TO_ASCII.keys());
const HAN = /\p{Script=Han}/u;

const RULES = {
  'zh-fullwidth-punctuation': '中文句子使用全形標點',
  'en-halfwidth-punctuation': '英文句子保留半形標點',
  'cjk-latin-spacing': '中英文之間使用一個半形空白',
  'fullwidth-punctuation-spacing': '全形標點旁不留多餘空白',
};

function parseArgs(argv) {
  const options = { file: null, stdin: false, json: false, dryRun: false, fix: false };
  for (const arg of argv) {
    if (arg === '--check') continue;
    if (arg === '--json') options.json = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--fix') options.fix = true;
    else if (arg === '-') options.stdin = true;
    else if (!arg.startsWith('--') && !options.file) options.file = arg;
    else throw new Error(`未知或重複的參數：${arg}`);
  }
  if (options.fix && options.dryRun) throw new Error('--fix 與 --dry-run 不能同時使用');
  if (options.fix && (!options.file || options.stdin)) throw new Error('--fix 需要檔案路徑，不支援 stdin 寫回');
  if (!options.file && !options.stdin && process.stdin.isTTY) throw new Error('缺少輸入檔案或 stdin（-）');
  return options;
}

function sentenceContainsHan(text, index, regions) {
  let start = index - 1;
  while (start >= 0) {
    if (!isProtectedIndex(regions, start) && (text[start] === '\n' || text[start] === '\r' || TERMINAL_PUNCTUATION.has(text[start]))) break;
    start -= 1;
  }

  const currentIsTerminal = TERMINAL_PUNCTUATION.has(text[index]);
  let end = index + 1;
  if (!currentIsTerminal) {
    while (end < text.length) {
      if (!isProtectedIndex(regions, end) && (text[end] === '\n' || text[end] === '\r' || TERMINAL_PUNCTUATION.has(text[end]))) break;
      end += 1;
    }
  }

  for (let cursor = start + 1; cursor < end; cursor += 1) {
    if (!isProtectedIndex(regions, cursor) && HAN.test(text[cursor])) return true;
  }
  return false;
}

function addEdit(edits, start, end, replacement, ruleId, originalText) {
  if (originalText.slice(start, end) === replacement) return;
  if (edits.some((edit) => start < edit.end && end > edit.start)) return;
  edits.push({ start, end, replacement, ruleId });
}

function collectPunctuationEdits(text, regions, edits) {
  for (let index = 0; index < text.length; index += 1) {
    if (isProtectedIndex(regions, index)) continue;
    const char = text[index];
    if (!ASCII_TO_FULL.has(char) && !FULL_TO_ASCII.has(char)) continue;
    const chinese = sentenceContainsHan(text, index, regions);
    if (chinese && ASCII_TO_FULL.has(char)) {
      addEdit(edits, index, index + 1, ASCII_TO_FULL.get(char), 'zh-fullwidth-punctuation', text);
    } else if (!chinese && FULL_TO_ASCII.has(char)) {
      addEdit(edits, index, index + 1, FULL_TO_ASCII.get(char), 'en-halfwidth-punctuation', text);
    }
  }
}

function collectMixedSpacingEdits(text, regions, edits) {
  const patterns = [
    /(\p{Script=Han})([ \t]*)(?=[A-Za-z])/gu,
    /([A-Za-z])([ \t]*)(?=\p{Script=Han})/gu,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const whitespaceStart = match.index + match[1].length;
      const whitespaceEnd = whitespaceStart + match[2].length;
      const rightIndex = whitespaceEnd;
      if (isProtectedIndex(regions, match.index) || isProtectedIndex(regions, rightIndex)) continue;
      addEdit(edits, whitespaceStart, whitespaceEnd, ' ', 'cjk-latin-spacing', text);
    }
  }
}

function finalPunctuationAt(text, index, regions) {
  const char = text[index];
  if (FULL_PUNCTUATION.has(char)) return sentenceContainsHan(text, index, regions) ? char : null;
  if (ASCII_TO_FULL.has(char) && sentenceContainsHan(text, index, regions)) return ASCII_TO_FULL.get(char);
  return null;
}

function collectFullwidthSpacingEdits(text, regions, edits) {
  for (let index = 0; index < text.length; index += 1) {
    if (isProtectedIndex(regions, index) || !finalPunctuationAt(text, index, regions)) continue;
    let before = index;
    while (before > 0 && /[ \t]/.test(text[before - 1]) && !isProtectedIndex(regions, before - 1)) before -= 1;
    if (before < index) addEdit(edits, before, index, '', 'fullwidth-punctuation-spacing', text);

    let after = index + 1;
    while (after < text.length && /[ \t]/.test(text[after]) && !isProtectedIndex(regions, after)) after += 1;
    // Markdown 表格以空白分隔儲存格內容與 `|`；該空白屬於結構排版，不是中文標點內側空白。
    if (after > index + 1 && text[after] !== '|') {
      addEdit(edits, index + 1, after, '', 'fullwidth-punctuation-spacing', text);
    }
  }
}

function applyEdits(text, edits) {
  let output = text;
  for (const edit of [...edits].sort((a, b) => b.start - a.start || b.end - a.end)) {
    output = output.slice(0, edit.start) + edit.replacement + output.slice(edit.end);
  }
  return output;
}

export function formatTypography(text) {
  const protectedRegions = findProtectedRegions(text);
  const edits = [];
  collectPunctuationEdits(text, protectedRegions, edits);
  collectMixedSpacingEdits(text, protectedRegions, edits);
  collectFullwidthSpacingEdits(text, protectedRegions, edits);
  edits.sort((a, b) => a.start - b.start || a.end - b.end);

  const issues = edits.map((edit) => ({
    ruleId: edit.ruleId,
    message: RULES[edit.ruleId],
    index: edit.start,
    ...getLocation(text, edit.start),
    original: text.slice(edit.start, edit.end),
    replacement: edit.replacement,
    excerpt: getExcerpt(text, edit.start, Math.max(1, edit.end - edit.start)),
    protected: false,
  }));

  return {
    output: applyEdits(text, edits),
    issues,
    protectedRegions,
  };
}

function printable(value) {
  return value === '' ? '∅' : JSON.stringify(value);
}

function reportHuman(target, result, mode) {
  if (!result.issues.length) {
    console.log(`✓ 排版符合規則：${target}`);
    return;
  }
  console.log(`台灣中文排版${mode === 'dry-run' ? '預覽' : '檢查'}：${target}`);
  for (const issue of result.issues) {
    console.log(`${target}:${issue.line}:${issue.column} [${issue.ruleId}] ${printable(issue.original)} → ${printable(issue.replacement)}`);
  }
  console.log(`合計：${result.issues.length} 處`);
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error('用法：node scripts/zh-tw-typography.mjs [--check|--json|--dry-run|--fix] <檔案>｜-');
    process.exit(2);
  }

  const target = options.file || '(stdin)';
  let text;
  try {
    text = options.stdin || (!options.file && !process.stdin.isTTY)
      ? readFileSync(0, 'utf8')
      : readFileSync(options.file, 'utf8');
  } catch (error) {
    console.error(`無法讀取 ${target}：${error.message}`);
    process.exit(2);
  }

  const result = formatTypography(text);
  if (options.json) {
    console.log(JSON.stringify({
      file: target,
      changed: result.issues.length > 0,
      issues: result.issues,
      protectedRegions: result.protectedRegions,
    }, null, 2));
  } else {
    reportHuman(target, result, options.dryRun ? 'dry-run' : 'check');
  }

  if (options.fix && result.output !== text) {
    try {
      atomicWriteFile(resolve(options.file), result.output);
      if (!options.json) console.log(`已安全寫回 ${result.issues.length} 處 → ${options.file}`);
    } catch (error) {
      console.error(`寫回失敗，原始檔案未變更：${error.message}`);
      process.exit(2);
    }
  }

  if (!options.fix && !options.dryRun && !options.json && result.issues.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
