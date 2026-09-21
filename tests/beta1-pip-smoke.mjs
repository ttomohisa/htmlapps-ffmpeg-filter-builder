import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/index.template.html', import.meta.url),'utf8');
assert.ok(source.includes("makeInputNode('input-2',secondarySource)"),'PiP recipe must create a second Video Input');
assert.ok(source.includes("from:'input-2',fromPort:'out',to:'scale-3'"),'PiP foreground must come from input-2');
assert.ok(source.includes("from:'input-1',fromPort:'audio',to:'output-1',toPort:'audio'"),'PiP output audio must stay on Main Input');
assert.ok(source.includes("shortest:false"),'PiP recipe must keep Main Input duration');
assert.ok(source.includes('shortest=0:eof_action=pass:repeatlast=0'),'Overlay must let MAIN continue when OVER ends first');
assert.ok(source.includes("recipePipNeedsSecondVideo"),'PiP recipe must explain an unbound second input');
assert.ok(source.includes("bindings.set('input-2'"),'Applying PiP must preserve an existing second-video File binding');
assert.ok(source.includes("data-param=\"shortest\""),'Overlay Inspector must expose the end-at-shorter-input option');
console.log('[OK] beta.1 two-video Picture in Picture smoke test passed.');
