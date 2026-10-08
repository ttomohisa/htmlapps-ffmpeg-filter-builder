import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const app = JSON.parse(fs.readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));
assert.equal(app.version, '1.2.1', 'Multi-input compiler milestone version mismatch.');

const start = source.indexOf('      const GRAPH_SCHEMA_VERSION=4;');
const end = source.indexOf('      function nodeSummary', start);
assert.ok(start >= 0 && end > start, 'Compiler source block was not found.');
const coreSource = source.slice(start, end);

const factory = new Function(`
  const state = { graph:null, file:null, inputMeta:{width:1920,height:1080,duration:30}, inputBindings:new Map(), selectedNodeId:'', nextNodeSeq:10, history:{past:[],future:[]}, rendering:false, pendingConnection:null };
  const translations = {};
  const t = key => key;
  const clone = value => JSON.parse(JSON.stringify(value));
  const shellQuote = value => "'" + String(value).replace(/'/g, "'\\\\''") + "'";
  const formatDuration = value => String(value);
  const formatBytes = value => String(value);
  const revoke = () => {};
  const $ = () => ({ textContent:'' });
  ${coreSource}
  return { state, makeInputNode, validateGraph, compileGraph, resolveInputs };
`);
const core = factory();

core.state.graph = {
  schemaVersion:4,
  mainInputId:'input-main',
  nodes:[
    core.makeInputNode('input-main',{kind:'video',name:'main.mp4',mimeType:'video/mp4'}),
    core.makeInputNode('input-logo',{kind:'image',name:'logo.png',mimeType:'image/png'}),
    {id:'overlay-1',type:'overlay',params:{position:'bottom-right',x:20,y:20,shortest:true}},
    {id:'output-1',type:'output',params:{}}
  ],
  edges:[
    {id:'e1',from:'input-main',fromPort:'out',to:'overlay-1',toPort:'main',type:'video'},
    {id:'e2',from:'input-logo',fromPort:'out',to:'overlay-1',toPort:'overlay',type:'video'},
    {id:'e3',from:'overlay-1',fromPort:'out',to:'output-1',toPort:'in',type:'video'},
    {id:'e4',from:'input-main',fromPort:'audio',to:'output-1',toPort:'audio',type:'audio'}
  ]
};
assert.equal(core.validateGraph().valid, true, 'Video + image Overlay graph must validate with multiple Inputs.');
let resolved = core.resolveInputs();
assert.deepEqual(resolved.map(x => [x.nodeId,x.index,x.videoStream,x.audioStream]), [
  ['input-main',0,'0:v','0:a'],
  ['input-logo',1,'1:v',null]
], 'Input indexes must be stable in Graph node order.');
let compiled = core.compileGraph();
assert.equal(compiled.request.mode, 'multi-input');
assert.equal(compiled.request.inputs.length, 2);
assert.deepEqual(compiled.request.inputs[1].inputOptions, ['-loop','1'], 'Image Input must carry loop input options for the compiler/runtime contract.');
assert.match(compiled.command, /-i 'main\.mp4'/);
assert.match(compiled.command, /-loop 1 -i 'logo\.png'/);
assert.match(compiled.filterComplex, /\[0:v\]\[1:v\]overlay=/);
assert.match(compiled.command, /-map '\[n\d+v\]'/);
assert.match(compiled.filterComplex, /\[0:a\]anull\[n\d+a\]/);
assert.match(compiled.command, /-map '\[n\d+a\]'/);
assert.deepEqual(compiled.graphIR.inputs.map(x => [x.nodeId,x.index]), [['input-main',0],['input-logo',1]]);

// Changing Main Input must not renumber compiler Inputs.
core.state.graph.mainInputId='input-logo';
resolved = core.resolveInputs();
assert.deepEqual(resolved.map(x => [x.nodeId,x.index]), [['input-main',0],['input-logo',1]], 'mainInputId must not change FFmpeg input indexes.');
compiled = core.compileGraph();
assert.equal(compiled.graphIR.mainInputId, 'input-logo');

core.state.graph = {
  schemaVersion:4,
  mainInputId:'input-silent',
  nodes:[
    core.makeInputNode('input-silent',{kind:'video',name:'silent.mp4',mimeType:'video/mp4',hasVideo:true,hasAudio:false}),
    core.makeInputNode('input-pip',{kind:'video',name:'pip.mp4',mimeType:'video/mp4',hasVideo:true,hasAudio:false}),
    {id:'scale-silent',type:'scale',params:{width:384}},
    {id:'overlay-silent',type:'overlay',params:{position:'bottom-right',x:20,y:20,shortest:false,keepVisible:false}},
    {id:'output-silent',type:'output',params:{}}
  ],
  edges:[
    {id:'sv1',from:'input-silent',fromPort:'out',to:'overlay-silent',toPort:'main',type:'video'},
    {id:'sv2',from:'input-pip',fromPort:'out',to:'scale-silent',toPort:'in',type:'video'},
    {id:'sv3',from:'scale-silent',fromPort:'out',to:'overlay-silent',toPort:'overlay',type:'video'},
    {id:'sv4',from:'overlay-silent',fromPort:'out',to:'output-silent',toPort:'in',type:'video'}
  ]
};
assert.equal(core.validateGraph().valid, true, 'Silent two-video PiP graph must validate without an Audio edge.');
resolved = core.resolveInputs();
assert.deepEqual(resolved.map(x => [x.nodeId,x.videoStream,x.audioStream]), [
  ['input-silent','0:v',null],
  ['input-pip','1:v',null]
], 'Silent Video Inputs must not advertise Audio streams to the runtime.');
compiled = core.compileGraph();
assert.doesNotMatch(compiled.filterComplex, /\[0:a\]|\[1:a\]/, 'Silent multi-input filter_complex must not reference missing Audio streams.');
assert.equal(compiled.request.audioMap, '', 'Silent multi-input request must omit audioMap.');

// Three-input graph: main video + two external audio sources mixed together.
core.state.graph = {
  schemaVersion:4,
  mainInputId:'input-video',
  nodes:[
    core.makeInputNode('input-video',{kind:'video',name:'main.mp4',mimeType:'video/mp4'}),
    core.makeInputNode('input-a',{kind:'audio',name:'voice.mp3',mimeType:'audio/mpeg'}),
    core.makeInputNode('input-b',{kind:'audio',name:'music.wav',mimeType:'audio/wav'}),
    {id:'mix-1',type:'audioMix',params:{volumeA:0,volumeB:-3,normalize:true}},
    {id:'output-1',type:'output',params:{}}
  ],
  edges:[
    {id:'v',from:'input-video',fromPort:'out',to:'output-1',toPort:'in',type:'video'},
    {id:'a1',from:'input-a',fromPort:'audio',to:'mix-1',toPort:'a',type:'audio'},
    {id:'a2',from:'input-b',fromPort:'audio',to:'mix-1',toPort:'b',type:'audio'},
    {id:'a3',from:'mix-1',fromPort:'out',to:'output-1',toPort:'audio',type:'audio'}
  ]
};
assert.equal(core.validateGraph().valid, true, 'Video + two Audio Inputs must validate.');
compiled = core.compileGraph();
assert.equal(compiled.request.inputs[1].audioStream, '1:a');
assert.equal(compiled.request.inputs[2].audioStream, '2:a');
assert.match(compiled.filterComplex, /\[2:a\]aresample=48000,asetpts=PTS-STARTPTS\[/);
assert.match(compiled.filterComplex, /\[n\d+a\]volume=-3dB\[/);
assert.match(compiled.filterComplex, /aresample=48000,asetpts=PTS-STARTPTS/);
assert.match(compiled.filterComplex, /amix=inputs=2:duration=longest:normalize=1/);
assert.match(compiled.command, /-i 'voice\.mp3'/);
assert.match(compiled.command, /-i 'music\.wav'/);

assert.ok(source.includes("function runtimeSupportsMultipleInputs()"), 'alpha.5 must gate multi-input execution by runtime capability.');
assert.ok(source.includes("graphHasAllInputBindings"), 'alpha.5 must require every Input File binding before execution.');
assert.ok(source.includes("request=isSingleInput?{mode:'single-input'"), 'Single-input Browser request compatibility path is missing.');
assert.ok(source.includes("{mode:'multi-input',inputs:requestInputs,mainInputIndex"), 'Multi-input runner request contract must include mainInputIndex.');

console.log('[OK] v1.2.0 Multi-input FFmpeg Compiler smoke tests passed.');
