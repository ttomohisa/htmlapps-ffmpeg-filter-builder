import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const start = source.indexOf('      const PORT_TYPES = Object.freeze');
const end = source.indexOf('      function nodeSummary', start);
assert.ok(start >= 0 && end > start, 'Recipe/Graph source block was not found.');
const coreSource = source.slice(start, end);

const runtimeFilters = [
  'scale','crop','pad','fps','transpose','hflip','vflip','setdar','setsar','trim','setpts','eq','hue','gblur','unsharp','fade','drawtext','split','overlay',
  'atrim','asetpts','volume','afade','atempo','highpass','lowpass','loudnorm','amix','asplit','aresample'
];
const factory = new Function(`
  const state = { graph:null, file:{name:'input.mp4'}, inputMeta:{width:1920,height:1080,duration:30}, selectedNodeId:'input-1', nextNodeSeq:4, history:{past:[],future:[]}, rendering:false, pendingConnection:null, validation:null, compiled:null, previewStart:0, previewDuration:5 };
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
  return { state, RECIPE_DEFS, makeRecipeGraph, validateGraph, compileGraph };
`);
const core = factory();

assert.equal(Object.keys(core.RECIPE_DEFS).length, 10, 'v0.8.0 must expose ten recipes.');
assert.equal(core.RECIPE_DEFS.resize720.requiresInput, true, 'Resize 720p must inspect input dimensions so smaller videos are not upscaled.');
assert.equal(core.RECIPE_DEFS.pip.requiresInput, true, 'Picture in Picture must inspect input dimensions before choosing the foreground width.');
const recipeIds = ['resize720','squareCrop','vertical','rotate','fade','watermark','pip','blurBackground','speed2x','normalize'];
for (const id of recipeIds) {
  const graph = core.makeRecipeGraph(id, {width:1920,height:1080,duration:30});
  core.state.graph = graph;
  const validation = core.validateGraph();
  assert.equal(validation.valid, true, `${id} recipe graph must validate: ${JSON.stringify(validation.errors)}`);
  core.state.validation = validation;
  const compiled = core.compileGraph();
  assert.ok(compiled, `${id} recipe must compile.`);
}

core.state.graph = core.makeRecipeGraph('resize720', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
assert.match(core.compileGraph().videoFilter, /scale=1280:-2/);

core.state.graph = core.makeRecipeGraph('squareCrop', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
assert.match(core.compileGraph().videoFilter, /crop=1080:1080:420:0/);

core.state.graph = core.makeRecipeGraph('vertical', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
const vertical = core.compileGraph();
assert.match(vertical.videoFilter, /scale=1080:-2/);
assert.match(vertical.videoFilter, /pad=1080:1920:/);

core.state.graph = core.makeRecipeGraph('fade', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
const fade = core.compileGraph();
assert.match(fade.videoFilter, /fade=t=in/);
assert.match(fade.videoFilter, /fade=t=out/);
assert.match(fade.audioFilter, /afade=t=in/);
assert.match(fade.audioFilter, /afade=t=out/);

core.state.graph = core.makeRecipeGraph('watermark', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
assert.match(core.compileGraph().videoFilter, /drawtext=fontfile=\/fonts\/MPLUS1p-Regular\.ttf/);

core.state.graph = core.makeRecipeGraph('pip', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
const pip = core.compileGraph();
assert.match(pip.videoFilter, /split=2/);
assert.match(pip.videoFilter, /overlay=x=main_w-overlay_w-20:y=main_h-overlay_h-20/);

core.state.graph = core.makeRecipeGraph('blurBackground', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
const blurBg = core.compileGraph();
assert.match(blurBg.videoFilter, /gblur=sigma=18/);
assert.match(blurBg.videoFilter, /overlay=x=\(main_w-overlay_w\)\/2:y=\(main_h-overlay_h\)\/2/);

core.state.graph = core.makeRecipeGraph('speed2x', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
const speed = core.compileGraph();
assert.match(speed.videoFilter, /setpts=PTS\/2/);
assert.match(speed.audioFilter, /atempo=2/);

core.state.graph = core.makeRecipeGraph('normalize', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
assert.match(core.compileGraph().audioFilter, /loudnorm=/);

for (const marker of [
  'id="recipeSelect"','id="applyRecipeButton"','id="saveGraphButton"','id="loadGraphButton"','id="recoveryBanner"',
  'PROJECT_STORAGE_KEY','ffmpeg-filter-builder-project-v1','function projectEnvelope','function applyProjectEnvelope',
  'id="fullRenderButton"','id="saveOutputButton"','id="outputFilenameInput"','function renderFullVideo','function saveFullRenderOutput',
  "const req={...state.compiled.request}", 'BrowserFFmpeg.ffmpegFilterBuilderArgs(req)', 'showSaveFilePicker', 'fullRenderBlob', 'Full Render', 'outputFilename' 
]) assert.ok(source.includes(marker), `Missing v0.8.0 marker: ${marker}`);

assert.match(source, /recipeLimitNote:'Watermarkはv0\.8\.0ではDraw Text/);
assert.match(source, /Multiple Input/);

console.log('[OK] Recipes / Full Render smoke tests passed.');

// Full Render starts from the compiled request without injecting Preview range arguments.
const fullRenderStart = source.indexOf('async function renderFullVideo');
const fullRenderEnd = source.indexOf('async function saveFullRenderOutput', fullRenderStart);
assert.ok(fullRenderStart >= 0 && fullRenderEnd > fullRenderStart, 'Full Render function block was not found.');
const fullRenderSource = source.slice(fullRenderStart, fullRenderEnd);
assert.ok(fullRenderSource.includes('const req={...state.compiled.request}'), 'Full Render must clone the compiled request.');
assert.ok(!fullRenderSource.includes('startTimeSeconds:'), 'Full Render must not add preview startTimeSeconds.');
assert.ok(!fullRenderSource.includes('durationSeconds:'), 'Full Render must not add preview durationSeconds.');

console.log('[OK] Recipes / Full Render full-range contract passed.');
