import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const marker = 'const translations =';
const start = source.indexOf(marker);
assert.ok(start >= 0, 'translations object was not found');
const open = source.indexOf('{', start + marker.length);
assert.ok(open >= 0, 'translations object opening brace was not found');
let depth = 0, quote = '', escaped = false, end = -1;
for (let i = open; i < source.length; i++) {
  const ch = source[i];
  if (quote) {
    if (escaped) escaped = false;
    else if (ch === '\\') escaped = true;
    else if (ch === quote) quote = '';
    continue;
  }
  if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) { end = i + 1; break; }
  }
}
assert.ok(end > open, 'translations object closing brace was not found');
const translations = new Function(`return (${source.slice(open, end)});`)();
assert.ok(translations.ja && translations.en, 'JA and EN translations are required');
const ja = Object.keys(translations.ja).sort();
const en = Object.keys(translations.en).sort();
assert.deepEqual(en, ja, 'JA/EN translation key sets must match');

const used = new Set();
for (const re of [/data-i18n="([^"]+)"/g, /data-i18n-title="([^"]+)"/g, /data-i18n-aria-label="([^"]+)"/g]) {
  for (const match of source.matchAll(re)) used.add(match[1]);
}
for (const key of used) {
  assert.ok(Object.hasOwn(translations.ja, key), `Missing JA translation for ${key}`);
  assert.ok(Object.hasOwn(translations.en, key), `Missing EN translation for ${key}`);
}
for (const key of ['recipeTitle','recipeLimitNote','fullRenderTitle','fullRenderButton','saveOutputButton','recoveryTitle','saveGraph','loadGraph']) {
  assert.ok(translations.ja[key], `Missing v0.8.0 JA key: ${key}`);
  assert.ok(translations.en[key], `Missing v0.8.0 EN key: ${key}`);
}
console.log(`[OK] i18n parity passed (${ja.length} keys, ${used.size} DOM keys).`);
