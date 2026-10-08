import assert from 'node:assert/strict';
import fs from 'node:fs';

const build=fs.readFileSync(new URL('../build-standalone.ps1', import.meta.url),'utf8');
const localBat=fs.readFileSync(new URL('../build-with-local-ffmpeg.bat', import.meta.url),'utf8');
const lock=JSON.parse(fs.readFileSync(new URL('../runtime.lock.json', import.meta.url),'utf8'));

assert.ok(build.includes('$SupportedLocalBuilderVersions = @("1.9.8", "1.9.9", "1.10.2")'), 'local Builder allowlist must include v1.9.9');
assert.ok(build.includes('Builder v1.9.9+ runtime must advertise multipleInputs'), 'local v1.9.9 capability guard missing');
assert.ok(build.includes('Builder v1.9.9+ runtime must advertise complexGraph'), 'local v1.9.9 complexGraph guard missing');
assert.ok(build.includes('@("null", "anull")'), 'local v1.9.9 null/anull filter guard missing');
assert.ok(build.includes("options.mode === \"multi-input\""), 'local v1.9.9 browser helper guard missing');
assert.ok(build.includes('ST/MT runtime Builder version mismatch'), 'ST/MT Builder parity guard missing');
assert.ok(localBat.includes('v1.9.8, v1.9.9 or v1.10.2'), 'local Builder launcher copy must describe v1.9.9 support');
assert.equal(lock.builderVersion,'1.10.2','default/release runtime pin must use the repaired v1.10.2 release');
console.log('[OK] Local Builder v1.9.9 integration smoke test passed.');
