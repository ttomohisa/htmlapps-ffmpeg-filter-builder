'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const argument = process.argv.indexOf('--html');
const root = path.join(__dirname, '..');
const files = argument >= 0 ? [process.argv[argument + 1]] : [
  'src/index.template.html', 'ffmpeg-filter-builder.html', 'ffmpeg-filter-builder.mt.html',
  'dist/index.html', 'dist/index.mt.html',
  ...['dist/index.self-extract.html', 'dist/index.mt.self-extract.html'].filter(file => fs.existsSync(path.join(root, file)))
].map(file => path.join(root, file));
const excluded = [
  "helpDialogs",
  "「完了」で閉じ、表示中の選択ノードへフォーカスを戻します。一覧を閉じると「追加」へ戻ります。",
  "then Done to close and return focus to the visible selected node. Closing the Palette returns focus to Add."
];
for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const payload = html.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\s]+)<\/script>/);
  if (payload) html = gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8');
  assert.match(html, /id="helpDialog"/, 'Inspect the decoded application, not its loader');
  for (const text of excluded) {
    assert.equal(html.includes(text), false, `User-facing help must exclude obsolete audit/implementation copy: ${text}`);
  }
}
console.log(`User-facing help copy regression passed for ${files.length} artifacts.`);
