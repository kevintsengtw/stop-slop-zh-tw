#!/usr/bin/env node
// validate-skill.mjs — 公開 CI 可執行的零依賴 skill 結構檢查

import { readFileSync } from 'node:fs';

const SKILL_URL = new URL('../SKILL.md', import.meta.url);
const OPENAI_YAML_URL = new URL('../agents/openai.yaml', import.meta.url);

function fail(message) {
  console.error(`Skill 驗證失敗：${message}`);
  process.exit(1);
}

const skill = readFileSync(SKILL_URL, 'utf8');
const frontmatter = /^(?:\uFEFF)?---\n([\s\S]*?)\n---(?:\n|$)/.exec(skill);
if (!frontmatter) fail('SKILL.md 缺少置頂 YAML frontmatter');

const fields = new Map();
for (const line of frontmatter[1].split('\n')) {
  const match = /^([A-Za-z0-9_-]+):\s*(.+)$/.exec(line);
  if (!match) fail(`無法解析 frontmatter：${line}`);
  fields.set(match[1], match[2].trim());
}

const allowed = new Set(['name', 'description']);
for (const key of fields.keys()) {
  if (!allowed.has(key)) fail(`frontmatter 不支援欄位 ${key}`);
}
if (fields.size !== 2 || !fields.has('name') || !fields.has('description')) {
  fail('frontmatter 必須且只能包含 name 與 description');
}

const name = fields.get('name');
if (!/^[a-z0-9-]{1,63}$/.test(name)) fail('name 必須是 1–63 個小寫英數字或連字號');
if (fields.get('description').length < 20) fail('description 過短，無法清楚判斷觸發範圍');

const openaiYaml = readFileSync(OPENAI_YAML_URL, 'utf8');
for (const key of ['display_name:', 'short_description:', 'default_prompt:']) {
  if (!openaiYaml.includes(key)) fail(`agents/openai.yaml 缺少 ${key}`);
}
if (!openaiYaml.includes(`$${name}`)) fail(`default_prompt 必須明確提及 $${name}`);

console.log(`✓ Skill 結構有效：${name}`);
