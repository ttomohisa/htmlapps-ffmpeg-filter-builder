import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const start = source.indexOf('      const GRAPH_SCHEMA_VERSION=4;');
const end = source.indexOf('      function nodeSummary', start);
assert.ok(start >= 0 && end > start, 'beta.3 Graph/compiler source block was not found.');
const coreSource = source.slice(start, end);

const runtimeFilters = [
  'scale','crop','pad','fps','transpose','hflip','vflip','setdar','setsar','trim','setpts','eq','hue','gblur','unsharp','fade','drawtext','split','overlay',
  'atrim','asetpts','volume','afade','atempo','highpass','lowpass','loudnorm','amix','asplit','aresample'
];
const factory = new Function(`
  const state = { graph:null, file:{name:'main.mp4'}, inputMeta:{width:1280,height:720,duration:30,hasAudio:true}, selectedNodeId:'input-1', nextNodeSeq:4, history:{past:[],future:[]}, rendering:false, pendingConnection:null, validation:null, compiled:null, previewStart:0, previewDuration:5 };
  const translations = {};
  const t = key => key;
  const clone = value => JSON.parse(JSON.stringify(value));
  const shellQuote = value => "'" + String(value).replace(/'/g, "'\\\\''") + "'";
  const RUNTIME_FILTER_SET = new Set(${JSON.stringify(runtimeFilters)});
  const TEXT_FONT_ASSET_ID = 'text-font';
  const TEXT_FONT_LICENSE_ASSET_KEY = 'license';
  const TEXT_FONT_VIRTUAL_PATH = '/fonts/MPLUS1p-Regular.ttf';
  const clampPreviewStart = value => Math.max(0, Number(value) || 0);
  ${coreSource}
  return { state, NODE_DEFS, defaultParams, makeRecipeGraph, validateGraph, compileGraph, filterForNode };
`);
const core = factory();

assert.deepEqual(core.NODE_DEFS.audioMix.runtimeFilters, ['amix','volume','aresample','asetpts']);
assert.equal(core.defaultParams('audioMix').durationMode, 'longest');
assert.equal(core.filterForNode({type:'audioMix',params:{normalize:false,durationMode:'first'}}), 'amix=inputs=2:duration=first:normalize=0');
assert.equal(core.filterForNode({type:'audioMix',params:{normalize:true,durationMode:'shortest'}}), 'amix=inputs=2:duration=shortest:normalize=1');

core.state.graph = core.makeRecipeGraph('bgm', {width:1280,height:720,duration:30,hasAudio:true});
core.state.validation = core.validateGraph();
assert.equal(core.state.validation.valid, true, `BGM recipe must validate: ${JSON.stringify(core.state.validation.errors)}`);
let compiled = core.compileGraph();
assert.equal(compiled.request.mode, 'multi-input');
assert.match(compiled.filterComplex, /\[0:a\]aresample=48000,asetpts=PTS-STARTPTS\[/);
assert.match(compiled.filterComplex, /\[1:a\]aresample=48000,asetpts=PTS-STARTPTS\[/);
assert.match(compiled.filterComplex, /volume=-12dB/);
assert.match(compiled.filterComplex, /amix=inputs=2:duration=longest:normalize=0/);
assert.match(compiled.filterComplex, /atrim=start=0:duration=30,asetpts=PTS-STARTPTS/);
assert.equal(compiled.request.mainInputIndex, 0);

core.state.graph = core.makeRecipeGraph('bgm', {width:1280,height:720,duration:30,hasAudio:false});
core.state.validation = core.validateGraph();
assert.equal(core.state.validation.valid, true, `Silent-main BGM recipe must validate: ${JSON.stringify(core.state.validation.errors)}`);
compiled = core.compileGraph();
assert.doesNotMatch(compiled.filterComplex, /\[0:a\]/, 'Silent Main must not reference a missing audio stream.');
assert.match(compiled.filterComplex, /\[1:a\]volume=-12dB/);
assert.match(compiled.filterComplex, /atrim=start=0:duration=30,asetpts=PTS-STARTPTS/);

core.state.graph = core.makeRecipeGraph('replaceAudio', {width:1280,height:720,duration:30,hasAudio:true});
core.state.validation = core.validateGraph();
assert.equal(core.state.validation.valid, true, `Replace Audio recipe must validate: ${JSON.stringify(core.state.validation.errors)}`);
compiled = core.compileGraph();
assert.doesNotMatch(compiled.filterComplex, /\[0:a\]/, 'Replace Audio must ignore Main audio.');
assert.match(compiled.filterComplex, /\[1:a\]volume=0dB/);
assert.match(compiled.filterComplex, /atrim=start=0:duration=30,asetpts=PTS-STARTPTS/);

for (const marker of [
  'value="bgm" data-i18n="recipeBgm"',
  'value="replaceAudio" data-i18n="recipeReplaceAudio"',
  "recipeBgmNeedsAudio",
  "recipeReplaceAudioNeedsAudio",
  "mixDurationFirst",
  "mixDurationShortest",
  "mixDurationLongest",
  "'aresample'",
  "function isSupportedAudioFile(file)",
  "audio/mpeg,audio/wav,audio/x-wav,audio/mp4"
]) assert.ok(source.includes(marker), `Missing beta.3 Audio/BGM marker: ${marker}`);

console.log('[OK] v1.2.0-beta.3 Audio Input / BGM / Audio Mix smoke tests passed.');
