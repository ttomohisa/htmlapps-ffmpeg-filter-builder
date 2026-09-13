import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const app = JSON.parse(fs.readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));
const repositoryCheck = fs.readFileSync(new URL('../scripts/check-repository.ps1', import.meta.url), 'utf8');

assert.equal(app.version, '1.1.0', 'Palette / Inspector build must report v1.1.0.');
assert.ok(source.includes('id="recipeToolbarButton"'), 'Recipe toolbar button missing.');
assert.ok(source.includes('id="recipePopover"'), 'Recipe toolbar popover missing.');
assert.ok(!source.includes('<section class="recipe-panel"'), 'Standalone Recipe page panel must be removed.');
assert.ok(source.includes('id="graphActionsButton"'), 'Graph tools toolbar button missing.');
assert.ok(source.includes('id="graphActionsPopover"'), 'Graph tools popover missing.');

assert.ok(repositoryCheck.includes('id="graphActionsButton"'), 'Repository check must validate the Graph tools toolbar marker.');
assert.ok(repositoryCheck.includes('id="graphActionsPopover"'), 'Repository check must validate the Graph tools popover marker.');
assert.ok(repositoryCheck.includes('id="paletteSearchInput"'), 'Repository check must validate the Palette search marker.');
assert.ok(!repositoryCheck.includes('<summary class="palette-label" data-i18n="historyTitle">'), 'Repository check must not require the removed Graph tools palette summary.');
for (const id of ['saveGraphButton','loadGraphButton','resetGraphButton']) {
  assert.ok(source.includes(`id="${id}"`), `${id} must remain accessible from Graph tools.`);
}
assert.ok(!source.includes('id="sampleGraphButton"'), 'Legacy Split + Overlay sample shortcut should not remain in Graph tools.');
assert.ok(!source.includes('id="sampleAudioButton"'), 'Legacy Audio Mix sample shortcut should not remain in Graph tools.');
assert.ok(source.includes('id="paletteSearchInput"'), 'Palette search input missing.');
assert.ok(source.includes('const PALETTE_SEARCH_ALIASES'), 'Japanese/English search aliases missing.');
assert.ok(source.includes('function applyPaletteSearch()'), 'Palette filtering function missing.');
assert.ok(source.includes("aliases.ja||'',aliases.en||''"), 'Palette search must cover both Japanese and English aliases.');
assert.ok(source.includes('id="paletteSearchEmpty"'), 'Palette empty search state missing.');
assert.ok(source.includes('id="inspectorContext"'), 'Inspector selection context missing.');
assert.ok(source.includes('.palette-button.audio .palette-icon { background:var(--audio-soft); color:var(--audio); }'), 'Audio palette icons must match the Canvas audio color system.');
assert.ok(source.includes('graph-canvas-inspector-toggle'), 'Inspector reopen control must live on the Canvas edge.');
assert.ok(source.includes('function syncWorkspaceSidebarToggleVisibility()'), 'Sidebar reopen-button visibility synchronization missing.');
assert.ok(source.includes('paletteToggle.hidden=paletteOpen'), 'Palette reopen button must only show while the Palette is closed.');
assert.ok(source.includes('inspectorToggle.hidden=inspectorOpen'), 'Inspector reopen button must only show while the Inspector is closed.');
assert.ok(source.includes("lastPlainNodeClickId"), 'Node double-click tracking is missing.');
assert.ok(source.includes("doubleActivation=plain&&lastPlainNodeClickId===id"), 'Node double-click must survive node DOM re-rendering.');
assert.ok(source.includes("doubleActivation&&$('.editor-grid')?.classList.contains('inspector-collapsed')"), 'Node double-click must open the Inspector only while it is hidden.');
assert.ok(source.includes("setWorkspaceSidebar('inspector',true)"), 'Node double-click must be able to open the Inspector.');
assert.ok(source.includes('function ensureSelectedNodeVisible()'), 'Inspector viewport compensation missing.');
assert.ok(source.includes("if(side==='inspector'&&open&&!mobile)ensureSelectedNodeVisible()"), 'Reopening Inspector must keep selected node visible.');
assert.ok(source.includes("document.querySelectorAll('[data-i18n-placeholder]')"), 'Translated search placeholder support missing.');
assert.ok(source.includes('schemaVersion=3') || source.includes('schemaVersion:3'), 'Graph schemaVersion 3 must remain in use.');
console.log('[OK] v1.1.0 Palette / Inspector smoke tests passed.');
