import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const start = source.indexOf('      const GRAPH_SCHEMA_VERSION=4;');
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

assert.equal(Object.keys(core.RECIPE_DEFS).length, 24, 'v1.2.0 must expose twenty-four recipes.');
assert.equal(core.RECIPE_DEFS.resize720.requiresInput, true, 'Resize 720p must inspect input dimensions so smaller videos are not upscaled.');
assert.equal(core.RECIPE_DEFS.pip.requiresInput, true, 'Picture in Picture must inspect input dimensions before choosing the foreground width.');
const recipeIds = ['resize720','resize1080','squareCrop','vertical','blurBackground','horizontal','squareBlur','rotate','mirror','fps30','fade','watermark','logo','pip','titleCenter','grayscale','sharpen','trim10','speedHalf','speed1_5','speed2x','normalize','bgm','replaceAudio'];
for (const id of recipeIds) {
  const graph = core.makeRecipeGraph(id, {width:1920,height:1080,duration:30});
  core.state.graph = graph;
  const validation = core.validateGraph();
  assert.equal(validation.valid, true, `${id} recipe graph must validate: ${JSON.stringify(validation.errors)}`);
  core.state.validation = validation;
  const compiled = core.compileGraph();
  assert.ok(compiled, `${id} recipe must compile.`);
}

core.state.inputMeta = {width:1280,height:720,duration:30,hasAudio:false};
for (const id of recipeIds) {
  core.state.graph = core.makeRecipeGraph(id, core.state.inputMeta);
  const validation = core.validateGraph();
  assert.equal(validation.valid, true, `${id} silent-video recipe graph must validate: ${JSON.stringify(validation.errors)}`);
  core.state.validation = validation;
  const compiled = core.compileGraph();
  assert.ok(compiled, `${id} silent-video recipe must compile.`);
  assert.doesNotMatch(compiled.filterComplex, /\[0:a\]/, `${id} silent-video recipe must not reference Main audio.`);
}
core.state.inputMeta = {width:1920,height:1080,duration:30,hasAudio:true};

core.state.graph = core.makeRecipeGraph('resize720', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
assert.match(core.compileGraph().videoFilter, /scale=1280:-2/);


core.state.graph = core.makeRecipeGraph('resize1080', {width:2560,height:1440,duration:30});
core.state.validation = core.validateGraph();
assert.match(core.compileGraph().videoFilter, /scale=1920:-2/);

core.state.graph = core.makeRecipeGraph('horizontal', {width:1080,height:1920,duration:30});
core.state.validation = core.validateGraph();
const horizontal = core.compileGraph();
assert.match(horizontal.videoFilter, /scale=606:-2|scale=608:-2/);
assert.match(horizontal.videoFilter, /pad=1920:1080:/);

core.state.graph = core.makeRecipeGraph('squareBlur', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
const squareBlur = core.compileGraph();
assert.match(squareBlur.videoFilter, /gblur=sigma=18/);
assert.match(squareBlur.videoFilter, /crop=1080:1080:/);

core.state.graph = core.makeRecipeGraph('mirror', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
assert.match(core.compileGraph().videoFilter, /hflip/);

core.state.graph = core.makeRecipeGraph('fps30', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
assert.match(core.compileGraph().videoFilter, /fps=30/);

core.state.graph = core.makeRecipeGraph('titleCenter', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
assert.match(core.compileGraph().videoFilter, /drawtext=/);

core.state.graph = core.makeRecipeGraph('grayscale', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
assert.match(core.compileGraph().videoFilter, /hue=h=0:s=0/);

core.state.graph = core.makeRecipeGraph('sharpen', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
assert.match(core.compileGraph().videoFilter, /unsharp=/);

core.state.graph = core.makeRecipeGraph('trim10', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
const trim10 = core.compileGraph();
assert.match(trim10.videoFilter, /trim=start=0:duration=10/);
assert.match(trim10.audioFilter, /atrim=start=0:duration=10/);

core.state.graph = core.makeRecipeGraph('speedHalf', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
const speedHalf = core.compileGraph();
assert.match(speedHalf.videoFilter, /setpts=PTS\/0\.5/);
assert.match(speedHalf.audioFilter, /atempo=0\.5/);

core.state.graph = core.makeRecipeGraph('speed1_5', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
const speed15 = core.compileGraph();
assert.match(speed15.videoFilter, /setpts=PTS\/1\.5/);
assert.match(speed15.audioFilter, /atempo=1\.5/);

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

core.state.graph = core.makeRecipeGraph('logo', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
const logo = core.compileGraph();
assert.equal(logo.request.mode, 'multi-input');
assert.match(logo.videoFilter, /\[1:v\]scale=344:-2|\[1:v\]scale=346:-2/);
assert.match(logo.videoFilter, /eof_action=repeat:repeatlast=1/);

core.state.graph = core.makeRecipeGraph('pip', {width:1920,height:1080,duration:30});
core.state.validation = core.validateGraph();
const pip = core.compileGraph();
assert.equal(pip.request.mode, 'multi-input');
assert.match(pip.videoFilter, /\[1:v\]scale=576:-2/);
assert.match(pip.videoFilter, /\[0:v\].*overlay=x=main_w-overlay_w-20:y=main_h-overlay_h-20:shortest=0:eof_action=pass:repeatlast=0/);
assert.match(pip.filterComplex, /\[0:a\]anull\[/);

core.state.graph = core.makeRecipeGraph('pip', {width:1280,height:720,duration:30,hasAudio:false});
core.state.validation = core.validateGraph();
assert.equal(core.state.validation.valid, true, `Silent PiP recipe graph must validate: ${JSON.stringify(core.state.validation.errors)}`);
const silentPip = core.compileGraph();
assert.equal(silentPip.request.mode, 'multi-input');
assert.doesNotMatch(silentPip.filterComplex, /\[0:a\]/, 'Silent PiP must not reference a missing Main audio stream.');
assert.equal(silentPip.request.audioMap, '', 'Silent PiP must omit the audio map.');
assert.match(silentPip.videoFilter, /\[1:v\]scale=384:-2/, '1280x720 PiP foreground must scale to 384px wide.');

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

core.state.graph = core.makeRecipeGraph('bgm', {width:1920,height:1080,duration:30,hasAudio:true});
core.state.validation = core.validateGraph();
assert.equal(core.state.validation.valid, true, `BGM recipe must validate: ${JSON.stringify(core.state.validation.errors)}`);
const bgm = core.compileGraph();
assert.equal(bgm.request.mode, 'multi-input');
assert.match(bgm.filterComplex, /\[0:a\]aresample=48000,asetpts=PTS-STARTPTS\[/);
assert.match(bgm.filterComplex, /\[1:a\]aresample=48000,asetpts=PTS-STARTPTS\[/);
assert.match(bgm.filterComplex, /volume=-12dB/);
assert.match(bgm.filterComplex, /amix=inputs=2:duration=longest:normalize=0/);
assert.match(bgm.filterComplex, /atrim=start=0:duration=30,asetpts=PTS-STARTPTS/);

core.state.graph = core.makeRecipeGraph('bgm', {width:1920,height:1080,duration:30,hasAudio:false});
core.state.validation = core.validateGraph();
const silentBgm = core.compileGraph();
assert.equal(silentBgm.request.mode, 'multi-input');
assert.doesNotMatch(silentBgm.filterComplex, /\[0:a\]/, 'Silent Main video must not reference a missing audio stream in the BGM recipe.');
assert.match(silentBgm.filterComplex, /\[1:a\]volume=-12dB/);
assert.match(silentBgm.filterComplex, /atrim=start=0:duration=30,asetpts=PTS-STARTPTS/);

core.state.graph = core.makeRecipeGraph('replaceAudio', {width:1920,height:1080,duration:30,hasAudio:true});
core.state.validation = core.validateGraph();
const replaceAudio = core.compileGraph();
assert.equal(replaceAudio.request.mode, 'multi-input');
assert.doesNotMatch(replaceAudio.filterComplex, /\[0:a\]/, 'Replace Audio must ignore the Main video audio stream.');
assert.match(replaceAudio.filterComplex, /\[1:a\]volume=0dB/);
assert.match(replaceAudio.filterComplex, /atrim=start=0:duration=30,asetpts=PTS-STARTPTS/);

for (const marker of [
  'id="recipeSelect"','id="applyRecipeButton"','id="saveGraphButton"','id="loadGraphButton"','id="recoveryBanner"',
  'PROJECT_STORAGE_KEY','ffmpeg-filter-builder-project-v1','function projectEnvelope','function applyProjectEnvelope',
  'id="fullRenderButton"','id="saveOutputButton"','id="outputFilenameInput"','function renderFullVideo','function saveFullRenderOutput',
  "const req={...state.compiled.request}", 'BrowserFFmpeg.ffmpegFilterBuilderArgs(req)', 'showSaveFilePicker', 'fullRenderBlob', 'Full Render', 'outputFilename' 
]) assert.ok(source.includes(marker), `Missing v0.8.0 marker: ${marker}`);

assert.match(source, /recipeLimitNote:'動画サイズや長さが必要なRecipeも、先に読み込む必要はありません/);
assert.match(source, /applyRecipeWithVideo:'動画を選んでGraphへ展開'/);
assert.match(source, /function requestRecipeApply/);
assert.match(source, /pendingInputPick=\{kind:'video',mode:'recipe',recipeId\}/);
assert.ok(!source.includes("showToast(t('recipeNeedsInput'))"), 'Source-aware recipes must not dead-end on a pre-load toast.');
assert.match(source, /def\?\.requiresInput&&!recipeCurrentVideoBinding\(\)\?'applyRecipeWithVideo':'applyRecipe'/);
for (const id of recipeIds) assert.ok(source.includes(`value="${id}"`), `Recipe selector is missing ${id}.`);

assert.match(source, /multi-input/i);

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
