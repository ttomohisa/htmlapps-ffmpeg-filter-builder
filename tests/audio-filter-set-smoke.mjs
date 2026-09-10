import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const start = source.indexOf('      const PORT_TYPES = Object.freeze');
const end = source.indexOf('      function nodeSummary', start);
assert.ok(start >= 0 && end > start, 'Audio Filter Set source block was not found.');
const coreSource = source.slice(start, end);

const runtimeFilters = [
  'scale','crop','pad','fps','transpose','hflip','vflip','setdar','setsar','trim','setpts','eq','hue','gblur','unsharp','fade','split','overlay',
  'atrim','asetpts','volume','afade','atempo','highpass','lowpass','loudnorm','amix','asplit','aresample'
];
const factory = new Function(`
  const state = { graph:null, file:{name:'input.mp4'}, inputMeta:{width:1920,height:1080,duration:30}, selectedNodeId:'input-1', nextNodeSeq:3, history:{past:[],future:[]}, rendering:false, pendingConnection:null, validation:null, compiled:null, previewStart:0, previewDuration:5 };
  const translations = {};
  const t = key => key;
  const clone = value => JSON.parse(JSON.stringify(value));
  const shellQuote = value => "'" + String(value).replace(/'/g, "'\\\\''") + "'";
  const RUNTIME_FILTER_SET = new Set(${JSON.stringify(runtimeFilters)});
  const clampPreviewStart = value => Math.max(0, Number(value) || 0);
  ${coreSource}
  return { state, PORT_TYPES, NODE_DEFS, defaultParams, validateGraph, filterForNode, compileGraph, runtimeSupportsNodeType, atempoChain, inferSyncedVideoSpeedRate, previewSourceHorizon };
`);
const core = factory();

for (const type of ['audioTrim','volume','audioFade','audioSpeed','highpass','lowpass','normalize','audioSplit','audioMix']) {
  assert.ok(core.NODE_DEFS[type], `Missing audio node definition: ${type}`);
  assert.equal(core.runtimeSupportsNodeType(type), true, `${type} must be available in Builder v1.9.8`);
}
assert.equal(core.atempoChain(0.25), 'atempo=0.5,atempo=0.5');
assert.equal(core.atempoChain(4), 'atempo=2,atempo=2');
assert.equal(core.filterForNode({type:'volume',params:{db:-6}}), 'volume=-6dB');
assert.equal(core.filterForNode({type:'audioFade',params:{mode:'out',start:4,duration:1}}), 'afade=t=out:st=4:d=1');
assert.equal(core.filterForNode({type:'highpass',params:{frequency:120}}), 'highpass=f=120');
assert.equal(core.filterForNode({type:'lowpass',params:{frequency:12000}}), 'lowpass=f=12000');
assert.equal(core.filterForNode({type:'normalize',params:{targetI:-16,lra:11,tp:-1.5}}), 'loudnorm=I=-16:LRA=11:TP=-1.5');

core.state.graph = {
  schemaVersion:3,
  nodes:[
    {id:'input-1',type:'input',params:{}},
    {id:'scale-1',type:'scale',params:{width:640}},
    {id:'audioSplit-3',type:'audioSplit',params:{}},
    {id:'volume-4',type:'volume',params:{db:-6}},
    {id:'highpass-5',type:'highpass',params:{frequency:120}},
    {id:'audioMix-6',type:'audioMix',params:{volumeA:-3,volumeB:0,normalize:false}},
    {id:'output-1',type:'output',params:{}}
  ],
  edges:[
    {id:'v1',from:'input-1',fromPort:'out',to:'scale-1',toPort:'in',type:'video'},
    {id:'v2',from:'scale-1',fromPort:'out',to:'output-1',toPort:'in',type:'video'},
    {id:'a1',from:'input-1',fromPort:'audio',to:'audioSplit-3',toPort:'in',type:'audio'},
    {id:'a2',from:'audioSplit-3',fromPort:'a',to:'volume-4',toPort:'in',type:'audio'},
    {id:'a3',from:'audioSplit-3',fromPort:'b',to:'highpass-5',toPort:'in',type:'audio'},
    {id:'a4',from:'volume-4',fromPort:'out',to:'audioMix-6',toPort:'a',type:'audio'},
    {id:'a5',from:'highpass-5',fromPort:'out',to:'audioMix-6',toPort:'b',type:'audio'},
    {id:'a6',from:'audioMix-6',fromPort:'out',to:'output-1',toPort:'audio',type:'audio'}
  ]
};
assert.equal(core.validateGraph().valid, true, 'Typed Video + Audio graph must validate.');
let compiled = core.compileGraph();
assert.match(compiled.videoFilter, /scale=640:-2/);
assert.match(compiled.audioFilter, /asplit=2/);
assert.match(compiled.audioFilter, /volume=-6dB/);
assert.match(compiled.audioFilter, /highpass=f=120/);
assert.match(compiled.audioFilter, /volume=-3dB/);
assert.match(compiled.audioFilter, /amix=inputs=2:duration=longest:normalize=0$/);
assert.match(compiled.command, /\[0:a\]asplit=2/);
assert.equal(compiled.graphIR.schemaVersion, 3);
assert.equal(compiled.graphIR.streamType, 'av');

const mismatched = structuredClone(core.state.graph);
mismatched.edges[2] = {id:'bad',from:'input-1',fromPort:'out',to:'audioSplit-3',toPort:'in',type:'video'};
assert.equal(core.validateGraph(mismatched).valid, false, 'Video must not connect to an Audio port.');

core.state.graph = {
  schemaVersion:3,
  nodes:[
    {id:'input-1',type:'input',params:{}},
    {id:'speed-2',type:'speed',params:{rate:1.5,syncAudio:true}},
    {id:'scale-3',type:'scale',params:{width:640}},
    {id:'output-1',type:'output',params:{}}
  ],
  edges:[
    {id:'v1',from:'input-1',fromPort:'out',to:'speed-2',toPort:'in',type:'video'},
    {id:'v2',from:'speed-2',fromPort:'out',to:'scale-3',toPort:'in',type:'video'},
    {id:'v3',from:'scale-3',fromPort:'out',to:'output-1',toPort:'in',type:'video'},
    {id:'a1',from:'input-1',fromPort:'audio',to:'output-1',toPort:'audio',type:'audio'}
  ]
};
assert.equal(core.validateGraph().valid, true);
assert.equal(core.inferSyncedVideoSpeedRate(), 1.5);
compiled = core.compileGraph();
assert.equal(compiled.audioFilter, 'atempo=1.5', 'Video Speed must synchronize Audio by default.');
assert.match(compiled.command, /\[0:a\]atempo=1\.5\[/);

core.state.graph.nodes.find(n=>n.type==='speed').params.syncAudio=false;
compiled = core.compileGraph();
assert.equal(compiled.audioFilter, '', 'Audio sync must be disable-able.');

console.log('[OK] Audio Filter Set smoke tests passed.');
