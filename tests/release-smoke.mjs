import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const app = JSON.parse(fs.readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));

assert.equal(app.version, '1.0.0', 'Release build must report v1.0.0.');

assert.ok(source.includes('<span class="version-badge" id="versionBadge">v1.0.0</span>'), 'Source version badge must be v1.0.0.');
assert.ok(!source.includes('v0.9.0'), 'Release source must not contain the previous v0.9.0 version label.');
assert.ok(!/release candidate/i.test(source), 'Release source must not expose release-candidate copy.');
assert.ok(source.includes('.palette-group + .palette-group { margin-top:10px; }'), 'Palette groups must use compact external spacing.');
assert.ok(!source.includes('.palette-group + .palette-group { margin-top:15px; padding-top:15px;'), 'Old palette top-padding gap must not return.');

const groups = ['videoFilters', 'textFilters', 'complexFilters', 'audioFilters', 'historyTitle'];
for (const key of groups) {
  assert.ok(
    source.includes(`<summary class="palette-label" data-i18n="${key}">`),
    `Palette group ${key} must use a collapsible summary.`
  );
}

assert.equal(
  (source.match(/<details class="palette-group palette-disclosure">/g) || []).length,
  5,
  'Exactly five palette groups should be collapsible.'
);
assert.equal(
  (source.match(/<details class="palette-group palette-disclosure"[^>]*\sopen(?:\s|>|=)/g) || []).length,
  0,
  'Palette groups should start collapsed to keep the left column compact.'
);
assert.ok(source.includes("historyTitle:'Graph操作'"), 'Japanese Graph tools label is missing.');
assert.ok(source.includes("historyTitle:'Graph tools'"), 'English Graph tools label is missing.');
assert.ok(source.includes('.palette-disclosure > summary.palette-label:focus-visible'), 'Collapsible palette must retain a visible keyboard focus state.');
assert.ok(source.includes('.palette-disclosure > summary.palette-label::-webkit-details-marker'), 'Native marker normalization is missing.');

console.log('[OK] v1.0.0 release palette / UI smoke tests passed.');
