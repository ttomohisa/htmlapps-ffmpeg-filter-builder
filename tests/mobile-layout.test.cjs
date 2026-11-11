const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('src/index.template.html', 'utf8');
const helpStart = html.lastIndexOf('<dialog', html.indexOf('id="helpDialog"'));
const help = html.slice(helpStart, html.indexOf('</dialog>', helpStart));
test('only the informational page footer hides at the existing phone breakpoint', () => {
  assert.ok(html.includes('@media (max-width: 700px) { body > footer { display: none; } .local-badge { display: none; } }'));
  assert.match(html, /\.palette-panel \.palette-group \{ margin:0 0 10px; \}/, 'Palette spacing must work even with the hidden input picker between disclosures');
});
test('all existing metadata stays unique and belongs to the quiet final Help disclosure', () => {
  for (const id of ['buildVersion', 'builderVersion', 'builtAt']) {
    assert.equal(html.split('id="' + id + '"').length - 1, 1, id + ' unique');
    assert.ok(help.includes('id="' + id + '"'), id + ' in Help');
  }
  assert.match(help, /class="[^"]*help-build[^"]*"[\s\S]*<\/details>\s*(?:<\/section>\s*)?<\/div>\s*(?:<\/div>\s*)?$/);
});
test('keyboard activation inside Help cannot trigger backdrop dismissal', () => {
  assert.match(html, /helpDialog\.addEventListener\('click',\s*event\s*=>\s*\{\s*if\s*\(event\.target\s*!==\s*helpDialog\)\s*return;/);
});
test('the existing Japanese and English privacy badge remains canonical', () => {
  assert.match(html, /localBadge:\s*'完全ローカル処理'/);
  assert.match(html, /localBadge:\s*'Fully local processing'/);
});
test('Preview and Compiler grid shrink at narrow widths without hiding contents', () => {
  assert.match(html, /\.preview-grid \{ grid-template-columns:minmax\(0,1fr\); \}/, 'Use a zero-minimum grid track for stacked panels');
  assert.match(html, /\.preview-grid > \* \{ min-width:0; max-width:100%; \}/, 'Allow both Preview and Compiler columns to shrink');
  assert.match(html, /\.preview-duration-row \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html, /\.command-head \{ flex-wrap:wrap; \}/, 'Compiler title and shell controls must wrap on phones');
  assert.match(html, /\.page-intro h2 \{ font-size:20px; line-height:1\.35; \}/, 'Both hero title locales must use the same phone font size');
  assert.ok(html.includes("introTitle:'動画フィルターを組み立てる'"));
  assert.ok(html.includes("introTitle:'Build video filters'"));
  assert.ok(html.includes("previewTitle:'プレビューとコマンド'"));
});
test('runtime diagnostics and complete font license move into Help without losing their IDs', () => {
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  for (const id of ['threadMode', 'isolationValue', 'filterCount', 'encoderList', 'workerCount']) {
    assert.equal(html.split('id="' + id + '"').length - 1, 1);
    assert.ok(!main.includes('id="' + id + '"'), id + ' absent from main');
    assert.ok(help.includes('id="' + id + '"'), id + ' retained in Help');
  }
  assert.ok(html.includes("runtimeDetails:'Runtime情報'"));
  assert.ok(html.includes("runtimeDetails:'Runtime information'"));
  assert.equal(html.split('id="licenseDetails"').length - 1, 1, 'License disclosure remains unique');
  assert.equal(html.split('id="textFontLicense"').length - 1, 1, 'Full embedded font license ID remains unique');
  assert.ok(help.includes('id="licenseDetails"'));
  assert.ok(help.includes('id="textFontLicense"'));
  assert.ok(help.includes('id="runtimeDetailsSection"'));
  assert.ok(help.indexOf('id="licenseDetails"') < help.indexOf('class="help-build"'), 'License appears above build info');
});
