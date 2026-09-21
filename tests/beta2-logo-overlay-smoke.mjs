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
assert.equal(runtime.builderVersion,'1.9.9','beta.2 must use the published Builder v1.9.9 runtime');
assert.equal(runtime.variants['single-thread'].sha256,'c3c42b584f3932dfd69dd185fa879ea8222091817af8a2aa58addac0e69defa0');
assert.equal(runtime.variants['multi-thread'].sha256,'04f853629c1e2eae5dac60f6a5b92a0f1aea3119566b6e11a5bc2171554ead6e');
console.log('[OK] beta.2 Image Input / Logo Overlay smoke test passed.');
