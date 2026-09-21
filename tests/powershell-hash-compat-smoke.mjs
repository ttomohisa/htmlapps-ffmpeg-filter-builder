import assert from 'node:assert/strict';
import fs from 'node:fs';

const check=fs.readFileSync(new URL('../scripts/check-repository.ps1', import.meta.url),'utf8');
const pages=fs.readFileSync(new URL('../scripts/prepare-pages.ps1', import.meta.url),'utf8');

for (const [name,text] of [['check-repository.ps1',check],['prepare-pages.ps1',pages]]) {
  assert.ok(text.includes('function Get-Sha256FileHex([string]$Path)'), `${name} must use the .NET SHA-256 helper`);
  assert.ok(text.includes('[System.Security.Cryptography.SHA256]::Create()'), `${name} must use System.Security.Cryptography.SHA256`);
  assert.ok(!text.includes('(Get-FileHash -Algorithm SHA256'), `${name} must not invoke Get-FileHash`);
}
assert.ok(check.includes('$coiHash = Get-Sha256FileHex $coiWorkerPath'), 'repository check must hash the vendored COI worker through the compatibility helper');
assert.ok(pages.includes('$actualWorkerHash = Get-Sha256FileHex $WorkerSource'), 'Pages preparation must hash the vendored COI worker through the compatibility helper');
assert.ok(check.includes('"scripts\\prepare-pages.ps1"'), 'repository compatibility scan must cover prepare-pages.ps1');
console.log('[OK] PowerShell SHA-256 compatibility smoke test passed.');
