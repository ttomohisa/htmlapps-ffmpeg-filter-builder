import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/index.template.html', import.meta.url),'utf8');
const runtime=JSON.parse(fs.readFileSync(new URL('../runtime.lock.json', import.meta.url),'utf8'));
assert.ok(source.includes('value="logo" data-i18n="recipeLogo"'),'Logo Overlay recipe must be present');
assert.ok(source.includes("logo:{titleKey:'recipeLogo',descKey:'recipeLogoDesc',requiresInput:true}"),'Logo recipe definition missing');
assert.ok(source.includes("makeInputNode('input-2',imageSource||{kind:'image'})"),'Logo recipe must create an Image Input');
assert.ok(source.includes("from:'input-2',fromPort:'out',to:'scale-3'"),'Logo image must feed Scale before Overlay');
assert.ok(source.includes('shortest:false,keepVisible:true'),'Logo Overlay must keep Main duration and persist the still image');
assert.ok(source.includes('eof_action=repeat:repeatlast=1'),'Overlay compiler must support persistent foreground frames');
assert.ok(source.includes('data-param="keepVisible"'),'Overlay Inspector must expose foreground persistence');
assert.ok(source.includes("image/png,image/jpeg,.png,.jpg,.jpeg"),'Image Input must be limited to runtime-supported PNG/JPEG formats');
assert.ok(source.includes("recipeLogoNeedsImage"),'Logo recipe must explain a missing image binding');
assert.equal(runtime.builderVersion,'1.10.2','beta.2 must use the published Builder v1.10.2 runtime');
assert.equal(runtime.variants['single-thread'].sha256,'32ae9873bd198a94ac7d4b762d49fae8b971a7eda1e01c0f3b1b6abd3a13bf15');
assert.equal(runtime.variants['multi-thread'].sha256,'8183cd0e5e07fa5fcaeb93bb3eb3dac758d7a040710b243d97c27c10fd004f81');
console.log('[OK] beta.2 Image Input / Logo Overlay smoke test passed.');
