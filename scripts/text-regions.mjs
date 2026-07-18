// text-regions.mjs — 共用的 Markdown 與技術文字保護區解析器

function overlaps(regions, start, end) {
  return regions.some((region) => start < region.end && end > region.start);
}

function addRegion(regions, start, end, type) {
  if (start >= end || overlaps(regions, start, end)) return false;
  regions.push({ start, end, type });
  return true;
}

function addRegexRegions(text, regions, regex, type, select = (match) => [match.index, match.index + match[0].length]) {
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const [start, end] = select(match);
    addRegion(regions, start, end, type);
    if (match[0].length === 0) regex.lastIndex += 1;
  }
}

function addFencedCodeRegions(text, regions) {
  const lineRegex = /.*(?:\r\n|\n|\r|$)/g;
  let fence = null;
  let line;
  while ((line = lineRegex.exec(text)) !== null) {
    if (!line[0]) break;
    const content = line[0].replace(/[\r\n]+$/, '');
    if (!fence) {
      const opening = /^ {0,3}(`{3,}|~{3,})/.exec(content);
      if (opening) {
        fence = {
          start: line.index,
          marker: opening[1][0],
          length: opening[1].length,
        };
      }
    } else {
      const closing = new RegExp(`^ {0,3}${fence.marker}{${fence.length},}\\s*$`).exec(content);
      if (closing) {
        addRegion(regions, fence.start, line.index + line[0].length, 'fenced-code');
        fence = null;
      }
    }
  }
  if (fence) addRegion(regions, fence.start, text.length, 'fenced-code');
}

function addYamlFrontmatterRegion(text, regions) {
  const opening = /^(?:\uFEFF)?---[ \t]*(?:\r\n|\n|\r)/.exec(text);
  if (!opening) return;
  const closing = /^---[ \t]*(?:\r\n|\n|\r|$)/gm;
  closing.lastIndex = opening[0].length;
  const match = closing.exec(text);
  if (match) addRegion(regions, 0, match.index + match[0].length, 'yaml-frontmatter');
}

function addInlineCodeRegions(text, regions) {
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '`' || isProtectedIndex(regions, index)) continue;
    let length = 1;
    while (text[index + length] === '`') length += 1;
    const marker = '`'.repeat(length);
    let closing = index + length;
    while ((closing = text.indexOf(marker, closing)) !== -1) {
      if (text[closing - 1] !== '`' && text[closing + length] !== '`') break;
      closing += length;
    }
    if (closing !== -1 && !overlaps(regions, index, closing + length)) {
      addRegion(regions, index, closing + length, 'inline-code');
      index = closing + length - 1;
    } else {
      index += length - 1;
    }
  }
}

function addMarkdownLinkTargets(text, regions) {
  for (let index = 0; index < text.length - 1; index += 1) {
    if (text[index] !== ']' || text[index + 1] !== '(' || isProtectedIndex(regions, index)) continue;
    const start = index + 2;
    let depth = 1;
    let escaped = false;
    for (let cursor = start; cursor < text.length; cursor += 1) {
      if (isProtectedIndex(regions, cursor)) break;
      const char = text[cursor];
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '(') {
        depth += 1;
      } else if (char === ')') {
        depth -= 1;
        if (depth === 0) {
          addRegion(regions, start, cursor, 'markdown-link-target');
          index = cursor;
          break;
        }
      } else if (char === '\n' || char === '\r') {
        break;
      }
    }
  }
}

function trimUrlEnd(value) {
  let end = value.length;
  while (end > 0 && /[.,;!，。；！：]/.test(value[end - 1])) end -= 1;
  const body = value.slice(0, end);
  const open = (body.match(/\(/g) || []).length;
  const close = (body.match(/\)/g) || []).length;
  if (close > open && body.endsWith(')')) end -= 1;
  return end;
}

export function findProtectedRegions(text, options = {}) {
  const { protectNumeric = true } = options;
  const regions = [];

  addYamlFrontmatterRegion(text, regions);
  addFencedCodeRegions(text, regions);
  addInlineCodeRegions(text, regions);

  addRegexRegions(text, regions, /<(?:https?:\/\/|ftp:\/\/|mailto:)[^>\r\n]+>/giu, 'autolink');
  addRegexRegions(text, regions, /<[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}>/giu, 'autolink');
  addRegexRegions(text, regions, /<!--[\s\S]*?-->|<\/?[A-Za-z][^>\r\n]*?>/g, 'html-tag');
  addMarkdownLinkTargets(text, regions);

  addRegexRegions(
    text,
    regions,
    /\b(?:https?|ftp):\/\/[^\s<>\u3000]+/giu,
    'url',
    (match) => [match.index, match.index + trimUrlEnd(match[0])],
  );
  addRegexRegions(text, regions, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, 'email');
  addRegexRegions(text, regions, /\b[A-Za-z]:[\\/][^\s<>:"|?*\r\n，。；！、（）「」『』]+/g, 'file-path');
  addRegexRegions(text, regions, /(?:^|[\s("'])((?:\.{1,2}|~)?\/[A-Za-z0-9._~/-]+)/gm, 'file-path', (match) => {
    const offset = match[0].indexOf(match[1]);
    return [match.index + offset, match.index + offset + match[1].length];
  });
  addRegexRegions(
    text,
    regions,
    /\b(?:[A-Za-z0-9_-]+\.)+(?:md|markdown|txt|json|ya?ml|toml|ini|cfg|conf|m?js|cjs|ts|tsx|jsx|py|cs|fs|java|go|rs|rb|php|html?|css|scss|xml|sh|ps1|sql)\b/giu,
    'file-name',
  );

  if (protectNumeric) {
    // 排版時保護數字型技術 token；用語掃描可停用，以保留自訂 regex 的辨識能力。
    addRegexRegions(text, regions, /\b\d{1,3}(?:,\d{3})+\b/g, 'grouped-number');
    addRegexRegions(text, regions, /\bv?\d+(?:\.\d+){1,}\b/giu, 'version-or-decimal');
    addRegexRegions(text, regions, /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g, 'date');
    addRegexRegions(text, regions, /\b\d{1,2}:\d{2}(?::\d{2})?\b/g, 'time');
  }

  return regions.sort((a, b) => a.start - b.start || a.end - b.end);
}

export function isProtectedIndex(regions, index) {
  return regions.some((region) => index >= region.start && index < region.end);
}

export function protectedRegionAt(regions, index) {
  return regions.find((region) => index >= region.start && index < region.end) || null;
}

export function getLocation(text, index) {
  const before = text.slice(0, index);
  const lines = before.split(/\r\n|\n|\r/);
  return { line: lines.length, column: [...lines.at(-1)].length + 1 };
}

export function getExcerpt(text, index, length = 1, radius = 24) {
  const lineStart = Math.max(text.lastIndexOf('\n', index - 1) + 1, index - radius);
  const nextNewline = text.indexOf('\n', index + length);
  const lineEnd = Math.min(nextNewline === -1 ? text.length : nextNewline, index + length + radius);
  return text.slice(lineStart, lineEnd).replace(/\r/g, '');
}
