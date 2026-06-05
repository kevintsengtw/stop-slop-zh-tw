#!/usr/bin/env node
// build-terms.mjs — 從授權相容來源產生「候選詞」清單，供人工審後併入 terms.json
//
// 重要：本工具 **不直接覆蓋** data/terms.json。手工精選的 terms.json 為權威，
// 因為來源資料含錯譯（實例：進程→程序、鼠標→游標、適配器→變壓器）。
// 自動覆蓋會把錯誤灌回去。產生器只做機械部分（抓取、正規化、去重、過濾），
// 把「既有詞庫沒有的新候選」輸出到 data/terms.candidates.json，預設 mode=flag，
// 由人工確認、修正、選擇後再手動併入 terms.json。
//
// 用法：
//   node scripts/build-terms.mjs                 從 aronhack(CC0) 線上抓，產生候選
//   node scripts/build-terms.mjs --src <檔案>    改讀本地 JSON（離線／測試）
//   node scripts/build-terms.mjs --out <檔案>    自訂輸出路徑
//
// 來源授權（只納入相容者）：
//   aronhack Chinese-Vocabulary-Radar — 資料 CC0，繁體 key，最貼合繁中輸入場景 → 已實作。
//   OpenCC(Apache 2.0)：簡體 key，需先簡轉繁且小心分詞，列為 TODO。
//   taiwan.md(CC BY-SA)：資料綁在前端 JS，需另寫 parser，列為 TODO。

import { readFileSync, writeFileSync } from 'node:fs';

const TERMS_URL = new URL('../data/terms.json', import.meta.url);
const DEFAULT_OUT = new URL('../data/terms.candidates.json', import.meta.url);
const ARONHACK_URL =
  'https://raw.githubusercontent.com/aronhack/Chinese-Vocabulary-Radar/refs/heads/main/chrome-extension/taiwan_china_vocabs.json';

// 已知錯譯／非台灣慣用，永不納入候選（額外保險，去重通常也會擋掉）
const BLOCKLIST = new Set(['進程', '鼠標', '打印機', '適配器', '壁紙', '光標']);

function parseArgs(argv) {
  const opts = { src: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--src') opts.src = argv[++i];
    else if (argv[i] === '--out') opts.out = argv[++i];
  }
  return opts;
}

async function loadSource(src) {
  if (src) {
    return JSON.parse(readFileSync(src, 'utf8'));
  }
  const res = await fetch(ARONHACK_URL);
  if (!res.ok) throw new Error(`抓取失敗 HTTP ${res.status}`);
  return res.json();
}

// 把 aronhack 條目正規化成 {from, to, en}
function normalizeAronhack(rows) {
  const out = [];
  for (const r of rows) {
    const from = (r.chinese || '').trim();
    const to = (r.taiwanese || '').trim().replace(/\//g, '、');
    if (!from || !to) continue;
    if (from === to) continue;
    out.push({ from, to, en: (r.english || '').trim() });
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  const existing = JSON.parse(readFileSync(TERMS_URL, 'utf8'));
  const existingFrom = new Set(existing.map((t) => t.from));

  loadSource(opts.src)
    .then((rows) => {
      const normalized = normalizeAronhack(rows);

      const seen = new Set();
      const candidates = [];
      let skippedExisting = 0;
      let skippedBlocked = 0;
      let skippedDup = 0;

      for (const c of normalized) {
        if (existingFrom.has(c.from)) { skippedExisting++; continue; }
        if (BLOCKLIST.has(c.from)) { skippedBlocked++; continue; }
        if (seen.has(c.from)) { skippedDup++; continue; }
        seen.add(c.from);
        candidates.push({
          from: c.from,
          to: c.to,
          mode: 'flag',
          source: 'aronhack(CC0)',
          note: '需人工審：確認譯法、決定 auto/flag、剔除生活詞',
          ...(c.en ? { en: c.en } : {}),
        });
      }

      candidates.sort((a, b) => a.from.localeCompare(b.from, 'zh-Hant'));

      const outUrl = opts.out ? new URL(`file://${opts.out}`) : DEFAULT_OUT;
      writeFileSync(outUrl, JSON.stringify(candidates, null, 2) + '\n', 'utf8');

      console.log(`來源條目：${rows.length}`);
      console.log(`既有詞庫：${existing.length}`);
      console.log(`新候選　：${candidates.length}（→ ${opts.out || DEFAULT_OUT.pathname}）`);
      console.log(`已跳過　：既有 ${skippedExisting}、封鎖 ${skippedBlocked}、重複 ${skippedDup}`);
      console.log('\n下一步：人工檢視候選檔，修正譯法、把安全的改成 mode=auto、剔除無關生活詞，再併入 terms.json。');
    })
    .catch((e) => {
      console.error(`產生失敗：${e.message}`);
      if (!opts.src) console.error('（離線環境可用 --src <本地JSON> 測試）');
      process.exit(1);
    });
}

main();
