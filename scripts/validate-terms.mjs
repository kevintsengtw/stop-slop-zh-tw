#!/usr/bin/env node
// validate-terms.mjs — 驗證台灣用語詞庫的結構與比對安全性

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DEFAULT_TERMS_URL = new URL('../data/terms.json', import.meta.url);
const MODES = new Set(['auto', 'flag']);
const MATCH_TYPES = new Set(['substring', 'word', 'phrase', 'regex']);
const MULTI_SUGGESTION = /[、，/]/;
const ASCII_WORD = /^[A-Za-z0-9_-]+$/;
const SINGLE_HAN = /^\p{Script=Han}$/u;

function compileRegex(term) {
  const flags = [...new Set(`uy${term.flags || ''}`)].join('');
  return new RegExp(term.pattern, flags);
}

export function validateTerms(terms, options = {}) {
  const { requireSource = false } = options;
  const errors = [];
  if (!Array.isArray(terms)) return ['詞庫根節點必須是陣列'];

  const seen = new Map();
  terms.forEach((term, index) => {
    const at = `第 ${index + 1} 筆`;
    if (!term || typeof term !== 'object' || Array.isArray(term)) {
      errors.push(`${at}：必須是物件`);
      return;
    }

    if (typeof term.from !== 'string' || !term.from.trim()) errors.push(`${at}：缺少 from`);
    if (typeof term.to !== 'string' || !term.to.trim()) errors.push(`${at}：缺少 to`);
    if (!MODES.has(term.mode)) errors.push(`${at} ${term.from || '(unknown)'}：mode 必須是 auto 或 flag`);
    if (requireSource && (typeof term.source !== 'string' || !term.source.trim())) {
      errors.push(`${at} ${term.from || '(unknown)'}：正式詞條必須提供 source`);
    } else if (term.source !== undefined && (typeof term.source !== 'string' || !term.source.trim())) {
      errors.push(`${at} ${term.from || '(unknown)'}：source 必須是非空字串`);
    }

    if (typeof term.from !== 'string' || !term.from) return;
    const previous = seen.get(term.from);
    if (previous) errors.push(`${at} ${term.from}：from 與第 ${previous} 筆重複`);
    else seen.set(term.from, index + 1);

    const match = term.match || 'substring';
    if (!MATCH_TYPES.has(match)) errors.push(`${at} ${term.from}：未知 match=${match}`);

    if (SINGLE_HAN.test(term.from) && match !== 'regex') {
      errors.push(`${at} ${term.from}：單一中文字不能做全域字串比對，請改收完整詞組或使用 regex`);
    }
    if (ASCII_WORD.test(term.from) && match !== 'word' && match !== 'regex') {
      errors.push(`${at} ${term.from}：英數詞必須使用 match=word 或 regex`);
    }
    if (match === 'word' && !ASCII_WORD.test(term.from)) {
      errors.push(`${at} ${term.from}：match=word 只用於英數字、底線與連字號`);
    }
    if (match === 'phrase' && [...term.from].length < 2) {
      errors.push(`${at} ${term.from}：match=phrase 至少需要兩個字元`);
    }
    if (match === 'regex') {
      if (typeof term.pattern !== 'string' || !term.pattern) {
        errors.push(`${at} ${term.from}：match=regex 必須提供 pattern`);
      } else {
        try {
          const regex = compileRegex(term);
          regex.lastIndex = 0;
          const empty = regex.exec('');
          if (empty?.[0] === '') errors.push(`${at} ${term.from}：regex 不得匹配空字串`);
        } catch (error) {
          errors.push(`${at} ${term.from}：regex 無法編譯（${error.message}）`);
        }
      }
    } else if (term.pattern !== undefined || term.flags !== undefined) {
      errors.push(`${at} ${term.from}：pattern/flags 只能搭配 match=regex`);
    }

    if (term.mode === 'auto' && MULTI_SUGGESTION.test(term.to || '')) {
      errors.push(`${at} ${term.from}：auto 只能有一個替代詞；多候選請改為 flag`);
    }
  });

  return errors;
}

export function assertValidTerms(terms, label = '詞庫', options = { requireSource: true }) {
  const errors = validateTerms(terms, options);
  if (errors.length) throw new Error(`${label}驗證失敗：\n- ${errors.join('\n- ')}`);
}

function main() {
  const file = process.argv[2];
  const source = file ? readFileSync(file, 'utf8') : readFileSync(DEFAULT_TERMS_URL, 'utf8');
  let terms;
  try {
    terms = JSON.parse(source);
  } catch (error) {
    console.error(`JSON 解析失敗：${error.message}`);
    process.exit(1);
  }

  const errors = validateTerms(terms, { requireSource: true });
  if (errors.length) {
    console.error(`詞庫驗證失敗（${errors.length} 項）：`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`✓ 詞庫有效：${file || DEFAULT_TERMS_URL.pathname}（${terms.length} 筆）`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
