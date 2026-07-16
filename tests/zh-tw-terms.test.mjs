import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { applyFix, scan } from '../scripts/zh-tw-terms.mjs';
import { validateTerms } from '../scripts/validate-terms.mjs';

const terms = JSON.parse(
  readFileSync(new URL('../data/terms.json', import.meta.url), 'utf8'),
);

test('正式詞庫通過結構與安全性驗證', () => {
  assert.deepEqual(validateTerms(terms), []);
});

test('不在正常複合詞與 emoji 內誤報單字', () => {
  const hits = scan(
    '人類 reviewer 使用 support-api 儲存庫，README 有 emoji，也談宏觀經濟和一堆資料。',
    terms,
  );
  assert.deepEqual(hits, []);
});

test('英文流行語只在獨立單字時命中', () => {
  const hits = scan('最近很 emo，但 emoji、someemo 不算；YYDS真的很常見，XYYDS 不算。', terms);
  assert.deepEqual(
    hits.map(({ from, matched }) => ({ from, matched })),
    [
      { from: 'emo', matched: 'emo' },
      { from: 'YYDS', matched: 'YYDS' },
    ],
  );
});

test('完整技術詞組可以命中並自動校正', () => {
  const input = '第三方庫、依賴庫、類方法、類實例、調用棧、技術棧、宏定義、宏展開';
  const expected = '第三方函式庫、相依套件、類別方法、類別實例、呼叫堆疊、技術堆疊、巨集定義、巨集展開';
  assert.equal(applyFix(input, terms), expected);
});

test('最長詞優先，數據庫不會拆成數據', () => {
  const hits = scan('數據庫', terms);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].from, '數據庫');
  assert.equal(applyFix('數據庫', terms), '資料庫');
});

test('--fix 邏輯不會替多候選 flag 任選第一個答案', () => {
  assert.equal(applyFix('模板、創建、數據庫', terms), '模板、創建、資料庫');
});

test('regex 策略回報實際命中的文字', () => {
  const regexTerms = [
    {
      from: '版本編號',
      to: '版本號',
      mode: 'flag',
      match: 'regex',
      pattern: 'v\\d+(?:\\.\\d+)+',
    },
  ];
  assert.deepEqual(validateTerms(regexTerms), []);
  const hits = scan('目前使用 v1.2.3。', regexTerms);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].matched, 'v1.2.3');
});

test('驗證器拒絕危險詞條', () => {
  const invalid = [
    { from: '類', to: '類別', mode: 'flag' },
    { from: 'emo', to: '低落', mode: 'flag' },
    { from: '模板', to: '範本、樣板', mode: 'auto' },
    { from: '代碼', to: '程式碼', mode: 'unknown' },
    { from: '代碼', to: '程式碼', mode: 'flag' },
  ];
  const errors = validateTerms(invalid).join('\n');
  assert.match(errors, /單一中文字/);
  assert.match(errors, /英數詞必須使用 match=word/);
  assert.match(errors, /auto 只能有一個替代詞/);
  assert.match(errors, /mode 必須是 auto 或 flag/);
  assert.match(errors, /from 與第 4 筆重複/);
});

test('候選詞建置會跳過單字並替英數詞加上 word 邊界', () => {
  const temp = mkdtempSync(join(tmpdir(), 'stop-slop-terms-'));
  const out = join(temp, 'candidates.json');
  const script = fileURLToPath(new URL('../scripts/build-terms.mjs', import.meta.url));
  const fixture = fileURLToPath(new URL('./fixtures/source-terms.json', import.meta.url));
  try {
    execFileSync(process.execPath, [script, '--src', fixture, '--out', out]);
    const candidates = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(candidates.some((term) => term.from === '類'), false);
    assert.equal(candidates.find((term) => term.from === 'ABC')?.match, 'word');
    assert.deepEqual(validateTerms(candidates), []);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
