import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const start = source.indexOf('      const PORT_TYPES = Object.freeze');
const end = source.indexOf('      function nodeSummary', start);
assert.ok(start >= 0 && end > start, 'Video Filter Set source block was not found.');
const coreSource = source.slice(start, end);

const factory = new Function(`
  const state = { graph:null, file:{name:'input.mp4'}, inputMeta:{width:1920,height:1080,duration:20}, selectedNodeId:'input-1', nextNodeSeq:3, history:{past:[],future:[]}, rendering:false, pendingConnection:null };
  const translations = {};
  const t = key => key;
  const clone = value => JSON.parse(JSON.stringify(value));
  const shellQuote = value => "'" + String(value).replace(/'/g, "'\\\\''") + "'";
  const RUNTIME_FILTER_SET = new Set(['scale','crop','pad','fps','transpose','hflip','vflip','setdar','setsar','trim','setpts','eq','hue','boxblur','gblur','unsharp','fade']);
  ${coreSource}
  return { state, NODE_DEFS, defaultParams, validateGraph, filterForNode, compileGraph, runtimeSupportsNodeType };
`);

const core = factory();
const cases = [
  ['speed',{rate:2},'setpts=PTS/2'],
  ['fps',{fps:30},'fps=30'],
  ['scale',{width:1280},'scale=1280:-2'],
  ['crop',{width:1280,height:720,x:20,y:10},'crop=1280:720:20:10'],
  ['pad',{width:1920,height:1080,x:40,y:20,color:'#000000'},'pad=1920:1080:40:20:color=0x000000'],
  ['rotate',{mode:'clock'},'transpose=clock'],
  ['flip',{mode:'horizontal'},'hflip'],
  ['aspect',{num:16,den:9},'setdar=16/9'],
  ['colorAdjust',{brightness:0.1,contrast:1.2,saturation:1.1,gamma:1},'eq=brightness=0.1:contrast=1.2:saturation=1.1:gamma=1'],
  ['hue',{degrees:30,saturation:1.2},'hue=h=30:s=1.2'],
  ['blur',{sigma:2.5},'gblur=sigma=2.5'],
  ['sharpen',{amount:1.2},'unsharp=5:5:1.2:5:5:0'],
  ['fade',{mode:'out',start:4,duration:1.5},'fade=t=out:st=4:d=1.5'],
  ['trim',{start:2,duration:5},'trim=start=2:duration=5,setpts=PTS-STARTPTS']
];

for (const [type, params, expected] of cases) {
  assert.ok(core.NODE_DEFS[type], `Missing node definition: ${type}`);
  assert.equal(core.filterForNode({type,params}), expected, `${type} must compile to the expected filter expression`);
  core.state.graph = {
    schemaVersion:1,
    nodes:[{id:'input-1',type:'input',params:{}},{id:`${type}-1`,type,params},{id:'output-1',type:'output',params:{}}],
    edges:[{id:'e1',from:'input-1',to:`${type}-1`,type:'video'},{id:'e2',from:`${type}-1`,to:'output-1',type:'video'}]
  };
  assert.equal(core.validateGraph().valid, true, `${type} graph must validate`);
  assert.equal(core.compileGraph().videoFilter, expected, `${type} graph must compile`);
}

for (const type of cases.map(item=>item[0])) {
  assert.equal(core.runtimeSupportsNodeType(type), true, `${type} must be supported by Builder v1.9.8 runtime catalog`);
}

assert.equal(core.validateGraph({schemaVersion:1,nodes:[{id:'input-1',type:'input',params:{}},{id:'speed-1',type:'speed',params:{rate:0}},{id:'output-1',type:'output',params:{}}],edges:[{id:'e1',from:'input-1',to:'speed-1',type:'video'},{id:'e2',from:'speed-1',to:'output-1',type:'video'}]}).valid,false);
assert.equal(core.validateGraph({schemaVersion:1,nodes:[{id:'input-1',type:'input',params:{}},{id:'color-1',type:'colorAdjust',params:{brightness:2,contrast:1,saturation:1,gamma:1}},{id:'output-1',type:'output',params:{}}],edges:[{id:'e1',from:'input-1',to:'color-1',type:'video'},{id:'e2',from:'color-1',to:'output-1',type:'video'}]}).valid,false);

console.log('[OK] Video Filter Set smoke tests passed.');
