#!/usr/bin/env node
// zh-tw-terms.mjs — stop-slop-zh-tw 的台灣用語掃描器
//
// 讀 data/terms.json，掃描輸入文字，只輸出「命中」的中國用語與建議，
// 讓 context 成本與詞庫大小脫鉤（詞庫不進 context，只有命中項進）。
//
// 用法：
//   node scripts/zh-tw-terms.mjs <檔案>        報告命中（auto 與 flag 分開列）
//   node scripts/zh-tw-terms.mjs -             從 stdin 讀文字
//   node scripts/zh-tw-terms.mjs --json <檔案> 機器可讀輸出（給 Agent 解析）
//   node scripts/zh-tw-terms.mjs --fix <檔案>  就地套用 auto 類，flag 類僅列出待人工判斷
//
// 規則：
//   mode=auto  安全直換（視頻→影片）。--fix 會自動套用。
//   mode=flag  同形詞／台灣也用的詞，只標記不自動換，交給判斷。
//   match=substring|phrase|word|regex  控制字串、完整詞組、英數邊界或正規表示式比對。

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { assertValidTerms } from './validate-terms.mjs';

const TERMS_URL = new URL('../data/terms.json', import.meta.url);

function parseArgs(argv) {
  const opts = { fix: false, json: false, file: null, stdin: false };
  for (const a of argv) {
    if (a === '--fix') opts.fix = true;
    else if (a === '--json') opts.json = true;
    else if (a === '-') opts.stdin = true;
    else if (!a.startsWith('--')) opts.file = a;
  }
  return opts;
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// 取建議的第一個選項（以、，/ 分隔）供 --fix 使用
function firstSuggestion(to) {
  return to.split(/[、，/]/)[0].trim();
}

const ASCII_WORD_CHAR = /[A-Za-z0-9_]/;

function compileTerm(term) {
  if ((term.match || 'substring') !== 'regex') return term;
  const flags = [...new Set(`uy${term.flags || ''}`)].join('');
  return { ...term, _regex: new RegExp(term.pattern, flags) };
}

function prepareTerms(terms, autoOnly = false) {
  return terms
    .filter((term) => !autoOnly || term.mode === 'auto')
    .map(compileTerm)
    .sort((a, b) => (b.priority || b.from.length) - (a.priority || a.from.length));
}

function matchAt(text, index, term) {
  const match = term.match || 'substring';
  if (match === 'regex') {
    term._regex.lastIndex = index;
    const result = term._regex.exec(text);
    return result?.index === index && result[0].length ? result[0] : null;
  }
  if (!text.startsWith(term.from, index)) return null;
  if (match === 'word') {
    const before = index > 0 ? text[index - 1] : '';
    const after = text[index + term.from.length] || '';
    if (ASCII_WORD_CHAR.test(before) || ASCII_WORD_CHAR.test(after)) return null;
  }
  // phrase 是明確列入詞庫的多字詞；比對方式與 literal substring 相同，
  // 差別在驗證器會拒絕單字 phrase，避免靠不可靠的中文單字邊界判斷。
  return term.from;
}

// 非重疊、最長優先掃描：在每個位置取最長能對上的詞，命中後跳過該詞長度
export function scan(text, terms) {
  const sorted = prepareTerms(terms);
  const hits = [];
  for (let i = 0; i < text.length; ) {
    let matched = null;
    for (const t of sorted) {
      const value = matchAt(text, i, t);
      if (value) { matched = { term: t, value }; break; }
    }
    if (matched) {
      const { _regex, ...term } = matched.term;
      hits.push({ ...term, matched: matched.value, index: i });
      i += matched.value.length;
    } else {
      i += 1;
    }
  }
  return hits;
}

// 依 from 聚合次數
function aggregate(hits) {
  const map = new Map();
  for (const h of hits) {
    const cur = map.get(h.from);
    if (cur) cur.count += 1;
    else map.set(h.from, { from: h.from, to: h.to, mode: h.mode, note: h.note || '', count: 1 });
  }
  return [...map.values()];
}

export function applyFix(text, terms) {
  const sorted = prepareTerms(terms, true);
  let out = '';
  for (let i = 0; i < text.length; ) {
    let matched = null;
    for (const t of sorted) {
      const value = matchAt(text, i, t);
      if (value) { matched = { term: t, value }; break; }
    }
    if (matched) {
      out += firstSuggestion(matched.term.to);
      i += matched.value.length;
    } else {
      out += text[i];
      i += 1;
    }
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  let terms;
  try {
    terms = JSON.parse(readFileSync(TERMS_URL, 'utf8'));
    assertValidTerms(terms);
  } catch (e) {
    console.error(`無法讀取詞庫 ${TERMS_URL.pathname}：${e.message}`);
    process.exit(2);
  }

  let text;
  if (opts.stdin || (!opts.file && !process.stdin.isTTY)) {
    text = readStdin();
  } else if (opts.file) {
    try {
      text = readFileSync(opts.file, 'utf8');
    } catch (e) {
      console.error(`無法讀取檔案 ${opts.file}：${e.message}`);
      process.exit(2);
    }
  } else {
    console.error('用法：node scripts/zh-tw-terms.mjs [--json|--fix] <檔案>｜-（stdin）');
    process.exit(2);
  }

  const hits = scan(text, terms);
  const agg = aggregate(hits);
  const auto = agg.filter((h) => h.mode === 'auto').sort((a, b) => b.count - a.count);
  const flag = agg.filter((h) => h.mode === 'flag').sort((a, b) => b.count - a.count);

  if (opts.fix) {
    if (!opts.file) {
      console.error('--fix 需要檔案路徑（不支援 stdin 就地修改）');
      process.exit(2);
    }
    const fixed = applyFix(text, terms);
    writeFileSync(opts.file, fixed, 'utf8');
    console.log(`已套用 ${auto.reduce((n, h) => n + h.count, 0)} 處 auto 校正 → ${opts.file}`);
    if (flag.length) {
      console.log('\n以下為同形詞／需人工判斷（未自動更動）：');
      for (const h of flag) console.log(`  ⚠ ${h.from}→${h.to}  ×${h.count}${h.note ? `  （${h.note}）` : ''}`);
    }
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify({ file: opts.file || '(stdin)', auto, flag }, null, 2));
    return;
  }

  // 人類可讀報告
  const target = opts.file || '(stdin)';
  if (!auto.length && !flag.length) {
    console.log(`✓ 未偵測到中國用語：${target}`);
    return;
  }
  console.log(`台灣用語掃描：${target}`);
  if (auto.length) {
    console.log('\n可自動校正（auto）：');
    for (const h of auto) console.log(`  ${h.from}→${firstSuggestion(h.to)}  ×${h.count}`);
  }
  if (flag.length) {
    console.log('\n需人工判斷（flag）⚠：');
    for (const h of flag) console.log(`  ${h.from}→${h.to}  ×${h.count}${h.note ? `  （${h.note}）` : ''}`);
  }
  console.log(`\n合計：auto ${auto.reduce((n, h) => n + h.count, 0)} 處、flag ${flag.reduce((n, h) => n + h.count, 0)} 處`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
