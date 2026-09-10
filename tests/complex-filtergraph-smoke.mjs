import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const start = source.indexOf('      const PORT_TYPES = Object.freeze');
const end = source.indexOf('      function nodeSummary', start);
assert.ok(start >= 0 && end > start, 'Complex Filtergraph source block was not found.');
const coreSource = source.slice(start, end);

const factory = new Function(`
  const state = { graph:null, file:{name:'input.mp4'}, inputMeta:{width:1920,height:1080,duration:30}, selectedNodeId:'input-1', nextNodeSeq:7, history:{past:[],future:[]}, rendering:false, pendingConnection:null, validation:null, compiled:null, previewStart:0, previewDuration:5 };
  const translations = {};
  const t = key => key;
  const clone = value => JSON.parse(JSON.stringify(value));
  const shellQuote = value => "'" + String(value).replace(/'/g, "'\\\\''") + "'";
  const RUNTIME_FILTER_SET = new Set(['scale','crop','pad','fps','transpose','hflip','vflip','setdar','setsar','trim','setpts','eq','hue','gblur','unsharp','fade','split','overlay']);
  const clampPreviewStart = value => Math.max(0, Number(value) || 0);
  ${coreSource}
  return { state, NODE_DEFS, validateGraph, compileGraph, runtimeSupportsNodeType, previewSourceHorizon, filterForNode };
`);

const core = factory();
core.state.graph = {
  schemaVersion:2,
  nodes:[
    {id:'input-1',type:'input',params:{}},
    {id:'split-3',type:'split',params:{}},
    {id:'blur-4',type:'blur',params:{sigma:5}},
    {id:'scale-5',type:'scale',params:{width:320}},
    {id:'overlay-6',type:'overlay',params:{x:20,y:20,shortest:true}},
    {id:'output-1',type:'output',params:{}}
  ],
  edges:[
    {id:'e1',from:'input-1',fromPort:'out',to:'split-3',toPort:'in',type:'video'},
    {id:'e2',from:'split-3',fromPort:'a',to:'blur-4',toPort:'in',type:'video'},
    {id:'e3',from:'split-3',fromPort:'b',to:'scale-5',toPort:'in',type:'video'},
    {id:'e4',from:'blur-4',fromPort:'out',to:'overlay-6',toPort:'main',type:'video'},
    {id:'e5',from:'scale-5',fromPort:'out',to:'overlay-6',toPort:'overlay',type:'video'},
    {id:'e6',from:'overlay-6',fromPort:'out',to:'output-1',toPort:'in',type:'video'}
  ]
};

assert.equal(core.validateGraph().valid, true, 'Split / Overlay regression graph must validate.');
const compiled = core.compileGraph();
assert.ok(compiled, 'Complex graph must compile.');
assert.match(compiled.videoFilter, /split=2\[n\dv\]\[n\dv\]/);
assert.match(compiled.videoFilter, /gblur=sigma=5/);
assert.match(compiled.videoFilter, /scale=320:-2/);
assert.match(compiled.videoFilter, /overlay=x=20:y=20:shortest=1$/);
assert.match(compiled.command, /-filter_complex/);
assert.match(compiled.command, /split=2/);
assert.match(compiled.command, /overlay=x=20:y=20:shortest=1/);
assert.equal(compiled.graphIR.schemaVersion, 3);
assert.equal(core.runtimeSupportsNodeType('split'), true);
assert.equal(core.runtimeSupportsNodeType('overlay'), true);

const centeredOverlay = {id:'overlay-center',type:'overlay',params:{position:'center',x:20,y:20,shortest:true}};
assert.equal(core.filterForNode(centeredOverlay), 'overlay=x=(main_w-overlay_w)/2:y=(main_h-overlay_h)/2:shortest=1', 'Center preset must use FFmpeg frame variables rather than guessed pixel dimensions.');
const bottomRightOverlay = {id:'overlay-br',type:'overlay',params:{position:'bottom-right',x:20,y:20,shortest:true}};
assert.equal(core.filterForNode(bottomRightOverlay), 'overlay=x=main_w-overlay_w-20:y=main_h-overlay_h-20:shortest=1', 'Bottom-right preset must account for the overlay branch dimensions.');

const bad = structuredClone(core.state.graph);
bad.edges = bad.edges.filter(edge => !(edge.from === 'split-3' && edge.fromPort === 'b'));
assert.equal(core.validateGraph(bad).valid, false, 'Every Split output port must be connected.');

const badOverlay = structuredClone(core.state.graph);
badOverlay.edges.find(edge => edge.to === 'overlay-6' && edge.toPort === 'overlay').toPort = 'main';
assert.equal(core.validateGraph(badOverlay).valid, false, 'Overlay MAIN / OVER ports must each have exactly one input.');

console.log('[OK] Complex Filtergraph smoke tests passed.');
