import assert from 'node:assert/strict';
import fs from 'node:fs';

const script=fs.readFileSync(new URL('../scripts/promote-builder-v1.9.9.ps1', import.meta.url),'utf8');
assert.match(script,/releases\/download\/v\$Version/,'promotion must use an exact GitHub Release tag');
assert.match(script,/ffmpeg-wasm-ffmpeg-filter-builder-\$variant-v\$Version\.zip/,'promotion must use profile-specific ST\/MT assets');
assert.match(script,/Get-Sha256FileHex/,'promotion must compute release ZIP SHA-256 locally');
assert.match(script,/runtime\.lock\.json/,'promotion must rewrite the runtime lock');
assert.match(script,/Source: GitHub Release v1\.9\.9/,'promotion must switch the default build source');
assert.doesNotMatch(script,/Get-FileHash/,'promotion must not depend on Get-FileHash');
assert.doesNotMatch(script,/::new\s*\(/,'promotion must stay compatible with Windows PowerShell 5.1');
console.log('[OK] Builder v1.9.9 runtime promotion smoke test passed.');
