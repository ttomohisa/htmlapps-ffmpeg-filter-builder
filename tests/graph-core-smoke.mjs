import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const start = source.indexOf('      const PORT_TYPES = Object.freeze');
const end = source.indexOf('      function nodeSummary', start);
assert.ok(start >= 0 && end > start, 'Graph Core source block was not found.');
const coreSource = source.slice(start, end);

const factory = new Function(`
  const state = { graph:null, file:{name:'input.mp4'}, inputMeta:{width:160,height:90,duration:1}, selectedNodeId:'input-1', nextNodeSeq:3, history:{past:[],future:[]}, rendering:false, pendingConnection:null };
  const translations = {};
  const t = key => key;
  const clone = value => JSON.parse(JSON.stringify(value));
  const shellQuote = value => "'" + String(value).replace(/'/g, "'\\\\''") + "'";
  ${coreSource}
  return { state, PORT_TYPES, NODE_DEFS, defaultGraph, topologicalOrder, validateGraph, filterForNode, compileGraph };
`);

const core = factory();
assert.equal(core.PORT_TYPES.VIDEO, 'video');
assert.equal(core.PORT_TYPES.AUDIO, 'audio');
assert.equal(core.validateGraph().valid, true, 'Default Input → Scale → Output graph must be valid.');
let compiled = core.compileGraph();
assert.equal(compiled.videoFilter, 'scale=640:-2');
assert.match(compiled.command, /-filter_complex/);
assert.match(compiled.command, /\[0:v\]scale=640:-2\[n1v\]/);
assert.equal(compiled.graphIR.output.videoLabel, 'n1v');

core.state.graph = {
  schemaVersion:1,
  nodes:[
    {id:'input-1',type:'input',params:{}},
    {id:'crop-2',type:'crop',params:{width:144,height:80,x:8,y:5}},
    {id:'scale-3',type:'scale',params:{width:640}},
    {id:'output-1',type:'output',params:{}}
  ],
  edges:[
    {id:'e1',from:'input-1',to:'crop-2',type:'video'},
    {id:'e2',from:'crop-2',to:'scale-3',type:'video'},
    {id:'e3',from:'scale-3',to:'output-1',type:'video'}
  ]
};
assert.equal(core.validateGraph().valid, true, 'Crop + Scale gate graph must be valid.');
compiled = core.compileGraph();
assert.equal(compiled.videoFilter, 'crop=144:80:8:5[n1v];[n1v]scale=640:-2');
assert.match(compiled.command, /\[0:v\]crop=144:80:8:5\[n1v\];\[n1v\]scale=640:-2\[n2v\]/);
assert.equal(compiled.graphIR.output.videoLabel, 'n2v');

core.state.graph.edges.push({id:'cycle',from:'scale-3',to:'crop-2',type:'video'});
assert.equal(core.validateGraph().valid, false, 'Cycle / multiple-input graph must be invalid.');
assert.equal(core.topologicalOrder().hasCycle, true, 'Cycle must be detected by topological sort.');

core.state.graph = {
  schemaVersion:1,
  nodes:[
    {id:'input-1',type:'input',params:{}},
    {id:'rotate-2',type:'rotate',params:{mode:'180'}},
    {id:'output-1',type:'output',params:{}}
  ],
  edges:[
    {id:'e1',from:'input-1',to:'rotate-2',type:'video'},
    {id:'e2',from:'rotate-2',to:'output-1',type:'video'}
  ]
};
assert.equal(core.validateGraph().valid, true);
compiled = core.compileGraph();
assert.equal(compiled.videoFilter, 'hflip,vflip');

core.state.graph.edges = [];
assert.equal(core.validateGraph().valid, false, 'Disconnected graph must be invalid.');

console.log('[OK] Graph Core / Compiler smoke tests passed.');
