import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read = relative => fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
const html = read('../src/index.template.html');
const lock = JSON.parse(read('../runtime.lock.json'));
const manifests = Object.fromEntries(['single-thread', 'multi-thread'].map(variant => [variant, JSON.parse(read(`./fixtures/runtime-1.10.2/${variant}.json`))]));
const loadSource = html.split('\n').find(line => line.includes('async function loadRuntime()'));
assert.ok(loadSource, 'real runtime loader exists');
const expected = {
  'single-thread': '32ae9873bd198a94ac7d4b762d49fae8b971a7eda1e01c0f3b1b6abd3a13bf15',
  'multi-thread': '8183cd0e5e07fa5fcaeb93bb3eb3dac758d7a040710b243d97c27c10fd004f81'
};

test('default runtime pins the verified public 1.10.2 ST and MT archives', () => {
  assert.equal(JSON.parse(read('../app.config.json')).version, '1.2.1');
  assert.equal(lock.builderVersion, '1.10.2');
  assert.equal(lock.builderRepository, 'ttomohisa/htmlapps-ffmpeg-wasm-builder');
  assert.equal(lock.profile, 'ffmpeg-filter-builder');
  for (const variant of Object.keys(expected)) {
    const asset = `ffmpeg-wasm-ffmpeg-filter-builder-${variant}-v1.10.2.zip`;
    assert.equal(lock.variants[variant].asset, asset);
    assert.equal(lock.variants[variant].url, `https://github.com/ttomohisa/htmlapps-ffmpeg-wasm-builder/releases/download/v1.10.2/${asset}`);
    assert.equal(lock.variants[variant].sha256, expected[variant]);
  }
});

function harness(variant, mutate = () => {}, fontPresent = true) {
  const manifest = structuredClone(manifests[variant]); mutate(manifest);
  const runner = { marker: 'synthetic-loader-boundary' }, loads = [];
  const context = {
    state: {}, runtimeAllowed: () => true, setStatus() {}, t: key => key,
    performance: { now: () => 12 }, RUNTIME_ASSET_ID: 'runtime', TEXT_FONT_ASSET_ID: 'font', RUNTIME_VARIANT: variant,
    StandaloneAssets: { loadClassicScript: async () => {}, textAsync: async (_, key) => key === 'manifest' ? JSON.stringify(manifest) : 'synthetic-core-js', bytesAsync: async () => new Uint8Array([0, 97, 115, 109]), has: () => fontPresent },
    BrowserFFmpeg: { loadEmbedded: async options => { loads.push(options); return runner; } },
    $: () => ({}), formatMs: String, applyRuntimeManifest() {}
  };
  vm.createContext(context); vm.runInContext(`${loadSource}\nglobalThis.load = loadRuntime;`, context);
  return { context, loads, runner };
}
for (const variant of Object.keys(expected)) {
  test(`actual loader accepts verified ${variant} 1.10.2 metadata and reuses its runner`, async () => {
    const h = harness(variant);
    assert.equal(await h.context.load(), h.runner);
    assert.equal(await h.context.load(), h.runner);
    assert.equal(h.loads.length, 1);
    assert.equal(h.loads[0].threading, variant);
    assert.equal(h.context.state.runtimeManifest.builderVersion, '1.10.2');
  });
}
for (const [label, mutate, pattern] of [
  ['unreviewed version', m => { m.builderVersion = '1.10.1'; }, /Unexpected FFmpeg runtime/],
  ['wrong profile', m => { m.profile = 'unrelated'; }, /Unexpected FFmpeg runtime/],
  ['wrong threading', m => { m.runtime.threading = 'multi-thread'; }, /threading mismatch/],
  ['missing bounded-range capability', m => { m.capabilities.timeRangeRender = false; }, /timeRangeRender/],
  ['missing text capability', m => { m.capabilities.drawText = false; }, /drawText/],
  ['missing complex-graph capability', m => { m.capabilities.complexGraph = false; }, /complexGraph/],
  ['missing null pass-through', m => { m.catalog.filters = m.catalog.filters.filter(x => x !== 'null'); }, /filter missing: null/],
  ['missing required filter', m => { m.catalog.filters = m.catalog.filters.filter(x => x !== 'scale'); }, /filter missing: scale/],
  ['missing required encoder', m => { m.catalog.encoders = ['aac']; }, /encoder missing: libx264/],
  ['missing MP4 muxer', m => { m.catalog.muxers = []; }, /muxer missing: mp4/]
]) test(`runtime guard rejects ${label} before loading code`, async () => {
  const h = harness('single-thread', mutate);
  await assert.rejects(h.context.load(), pattern);
  assert.equal(h.loads.length, 0);
});
test('runtime guard rejects a missing embedded font', async () => {
  const h = harness('single-thread', () => {}, false);
  await assert.rejects(h.context.load(), /font is missing/);
  assert.equal(h.loads.length, 0);
});

test('local multi-input capability guards cover 1.10.2 as well as legacy 1.9.9', () => {
  const build = read('../build-standalone.ps1');
  assert.ok(build.includes('$SupportedLocalBuilderVersions = @("1.9.8", "1.9.9", "1.10.2")'));
  for (const variable of ['$builderVersion', '[string]$localManifest.builderVersion', '[string]$stagedManifest.builderVersion', '$stBuilderVersion']) {
    assert.ok(build.includes(`${variable} -in @("1.9.9", "1.10.2")`), `${variable} retains its multi-input guards`);
  }
  for (const marker of ['runtime must advertise multipleInputs', 'runtime must advertise complexGraph', 'options.mode === "multi-input"', 'ST/MT runtime Builder version mismatch', 'Local ffmpeg.wasm does not match']) assert.ok(build.includes(marker), marker);
});

test('normal PowerShell build remains Node-free while all CI entrypoints run the new guards', () => {
  assert.doesNotMatch(read('../scripts/check-repository.ps1'), /^\s*&\s+node\b/m);
  for (const workflow of ['build-standalone', 'deploy-pages', 'preview']) {
    const yaml = read(`../.github/workflows/${workflow}.yml`);
    assert.ok(yaml.includes('node ./tests/header-normalization.test.mjs'), `${workflow}: header regression`);
    assert.ok(yaml.includes('node ./tests/runtime-1.10.2.test.mjs'), `${workflow}: released runtime regression`);
  }
});
