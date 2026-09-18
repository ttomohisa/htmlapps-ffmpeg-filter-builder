import fs from 'node:fs';

const fail = (message) => { throw new Error(message); };
const read = (path) => fs.readFileSync(path, 'utf8');

const prepare = read('scripts/prepare-ffmpeg-runtime.ps1');
for (const token of [
  'Get-MissingRuntimeFiles',
  'Cached extraction is incomplete',
  'Remove-Item -Recurse -Force $extractRoot',
  'Expand-VerifiedRuntimeArchive $archivePath $extractRoot $Variant',
  'Pinned runtime archive is missing required file(s)',
  'BUILDINFO.txt'
]) {
  if (!prepare.includes(token)) fail(`prepare-ffmpeg-runtime.ps1 is missing cache-repair marker: ${token}`);
}

const hashCheck = prepare.indexOf('$actualArchiveHash = Get-Sha256FileHex $archivePath');
const cacheCheck = prepare.indexOf('$missingCachedFiles = @(Get-MissingRuntimeFiles $extractRoot)');
const reextract = prepare.indexOf('Expand-VerifiedRuntimeArchive $archivePath $extractRoot $Variant');
const finalCheck = prepare.indexOf('$missingRuntimeFiles = @(Get-MissingRuntimeFiles $extractRoot)');
if (hashCheck < 0 || cacheCheck < 0 || reextract < 0 || finalCheck < 0) fail('Cache-repair flow is incomplete');
if (!(hashCheck < cacheCheck && cacheCheck < reextract && reextract < finalCheck)) {
  fail('Runtime cache repair must verify the archive before rebuilding and validate the rebuilt extraction afterward');
}

console.log('[OK] FFmpeg runtime cache repair smoke test passed.');
