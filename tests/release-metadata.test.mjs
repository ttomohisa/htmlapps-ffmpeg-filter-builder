import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const version = JSON.parse(read('app.config.json')).version;
const check = read('scripts/check-repository.ps1');

test('layout repair is one app patch while Builder stays pinned', () => {
  assert.equal(version, '1.2.3');
  assert.equal(JSON.parse(read('runtime.lock.json')).builderVersion, '1.10.2');
});

test('actual PowerShell version guards agree with config and their target scripts', () => {
  assert.equal(check.match(/\$app\.version -ne "([^"]+)"/)?.[1], version);
  const targets = {buildVariant:'scripts/build-variant.ps1',prepare:'scripts/prepare-ffmpeg-runtime.ps1',prepareFont:'scripts/prepare-text-font.ps1',buildStandalone:'build-standalone.ps1'};
  for (const [variable, file] of Object.entries(targets)) {
    const from=check.indexOf(`$${variable} = Get-Content`), to=check.indexOf(`if (-not $${variable}.Contains($token))`,from);
    assert.ok(from>=0&&to>from, `Find real ${variable} guard loop`);
    const tokens=[...check.slice(from,to).matchAll(/"((?:htmlapps-ffmpeg-filter-builder\/|v)\d+\.\d+\.\d+)"/g)].map(m=>m[1]);
    assert.equal(tokens.length,1, `${file} has one exact app-version guard`);
    assert.equal(tokens[0].match(/\d+\.\d+\.\d+$/)[0],version);
    assert.ok(read(file).includes(tokens[0]), `${file} satisfies its actual PowerShell guard`);
  }
  for (const file of ['build-standalone.bat','build-with-local-ffmpeg.bat']) assert.ok(read(file).includes(`v${version}`), file);
});

test('all publication workflows run the source dialog/focus and metadata regressions',()=>{
  for (const file of ['build-standalone.yml','deploy-pages.yml','preview.yml']) {
    const workflow=read('.github/workflows/'+file);
    assert.match(workflow,/node --test \.\/tests\/dialog-layout-focus\.test\.mjs \.\/tests\/release-metadata\.test\.mjs/);
  }
});
