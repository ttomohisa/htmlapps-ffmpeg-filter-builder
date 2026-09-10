import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const start = source.indexOf('      const PORT_TYPES = Object.freeze');
const end = source.indexOf('      function nodeSummary', start);
assert.ok(start >= 0 && end > start, 'Text Filter Set source block was not found.');
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
  return { state, NODE_DEFS, TIMELINE_SENSITIVE_NODE_TYPES, defaultParams, validateGraph, compileGraph, runtimeSupportsNodeType, filterForNode, drawTextFilter, drawTextTextFilePath, previewExecutionPlan };
`);
const core = factory();

assert.ok(core.NODE_DEFS.drawText, 'Draw Text node definition is required.');
assert.equal(core.runtimeSupportsNodeType('drawText'), true, 'Draw Text must be supported by the pinned runtime catalog.');
assert.equal(core.TIMELINE_SENSITIVE_NODE_TYPES.has('drawText'), true, 'Draw Text must use timeline-safe preview planning.');

const params = core.defaultParams('drawText');
assert.equal(params.text, 'Browser Kitty');
assert.equal(params.position, 'bottom-center');
assert.equal(params.background, true);

const node = { id:'drawText-3', type:'drawText', params:{...params, text:'Browser Kitty 日本語', startTime:1.25, endTime:4.5} };
const browserFilter = core.filterForNode(node, 'browser');
assert.match(browserFilter, /^drawtext=fontfile=\/fonts\/MPLUS1p-Regular\.ttf:/);
assert.match(browserFilter, /textfile=\/text\/drawText-3\.txt/);
assert.match(browserFilter, /expansion=none/);
assert.match(browserFilter, /fontsize=48/);
assert.match(browserFilter, /fontcolor=0xFFFFFF/);
assert.match(browserFilter, /x=\(w-text_w\)\/2:y=h-text_h-20/);
assert.match(browserFilter, /box=1:boxcolor=0x000000@0\.55:boxborderw=12/);
assert.match(browserFilter, /enable=between\(t\\,1\.25\\,4\.5\)$/);
assert.equal(core.drawTextTextFilePath(node), '/text/drawText-3.txt');

const desktopFilter = core.filterForNode(node, 'desktop');
assert.match(desktopFilter, /text=Browser Kitty 日本語/);
assert.doesNotMatch(desktopFilter, /textfile=/);

const specialNode = { id:'drawText-special', type:'drawText', params:{...params, text:"Kid's: 100% \\ Browser, [x]; 日本語", startTime:0, endTime:1} };
const specialDesktop = core.filterForNode(specialNode, 'desktop');
assert.ok(specialDesktop.includes(String.raw`text=Kid\\\'s\\: 100% \\\\ Browser\, \[x\]\; 日本語`));

core.state.graph = {
  schemaVersion:3,
  nodes:[
    {id:'input-1',type:'input',params:{}},
    node,
    {id:'output-1',type:'output',params:{}}
  ],
  edges:[
    {id:'v1',from:'input-1',fromPort:'out',to:'drawText-3',toPort:'in',type:'video'},
    {id:'v2',from:'drawText-3',fromPort:'out',to:'output-1',toPort:'in',type:'video'},
    {id:'a1',from:'input-1',fromPort:'audio',to:'output-1',toPort:'audio',type:'audio'}
  ]
};
assert.equal(core.validateGraph().valid, true, 'Draw Text graph must validate.');
core.state.validation = core.validateGraph();
const compiled = core.compileGraph();
core.state.compiled = compiled;
assert.match(compiled.videoFilter, /drawtext=fontfile=\/fonts\/MPLUS1p-Regular\.ttf/);
assert.match(compiled.command, /drawtext=fontfile=\/fonts\/MPLUS1p-Regular\.ttf/);
assert.match(compiled.command, /text=.*Browser Kitty 日本語/);
assert.equal(compiled.request.runtimeFiles.length, 1);
assert.deepEqual(compiled.request.runtimeFiles[0], {name:'/text/drawText-3.txt', text:'Browser Kitty 日本語'});

core.state.previewStart = 2;
core.state.previewDuration = 5;
const plan = core.previewExecutionPlan();
assert.equal(plan.mode, 'timeline-safe');
assert.equal(plan.startTimeSeconds, 0);
assert.equal(plan.playbackStart, 2);

const invalid = structuredClone(node);
invalid.params.text = 'line 1\nline 2';
core.state.graph.nodes[1] = invalid;
assert.equal(core.validateGraph().valid, false, 'v0.7.0 Draw Text must reject line breaks/control characters.');

assert.match(source, /manifest\.capabilities\?\.drawText!==true/);
assert.match(source, /manifest\.builderVersion!=='1\.9\.8'/);
assert.match(source, /StandaloneAssets\.bytesAsync\(TEXT_FONT_ASSET_ID,'regular'\)/);
assert.match(source, /font\/ttf/);
assert.match(source, /TEXT_FONT_LICENSE_ASSET_KEY = 'license'/);
assert.match(source, /id="textFontLicense"/);
assert.match(source, /thirdPartyLicenses/);
assert.match(source, /StandaloneAssets\.text\(TEXT_FONT_ASSET_ID,TEXT_FONT_LICENSE_ASSET_KEY\)/);

console.log('[OK] Text / Draw Text smoke tests passed.');
