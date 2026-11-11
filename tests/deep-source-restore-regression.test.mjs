import assert from 'node:assert/strict';
import fs from 'node:fs';

// Exercise the actual repository source functions with stubbed display, runtime and
// history services. The browser-facing import path was also reproduced in Chromium.
const source=fs.readFileSync(new URL('../src/index.template.html',import.meta.url),'utf8');
const line=prefix=>{const match=source.split('\n').find(item=>item.trimStart().startsWith(prefix));assert.ok(match,'Missing production function '+prefix);return match;};
const start=source.indexOf('      const INPUT_SOURCE_KINDS='),end=source.indexOf('      function migrateGraphToV4(',start);
assert.ok(start>=0&&end>start,'Source metadata helpers not found');
const helpers=source.slice(start,end);
const factory=new Function([
"const state={graph:{mainInputId:'input-1',nodes:[{id:'input-1',type:'input',params:{},source:{kind:'video',name:'A.mp4',size:123}}],edges:[]},inputBindings:new Map(),file:null,fileToken:0,previewCache:new Map(),rendering:false,inputMeta:{duration:2,width:200,height:100},history:{past:[],future:[]},workspace:{positions:{},viewport:{}},selectedNodeId:'input-1',selectedNodeIds:new Set(['input-1']),nextNodeSeq:3,outputFilenameTouched:true};",
"const clone=value=>JSON.parse(JSON.stringify(value)),t=x=>x;",
"const nodeById=id=>state.graph.nodes.find(n=>n.id===id);",
"const pushHistory=()=>{};const revoke=()=>{};",
"const resetMediaOutputs=()=>{state.fileToken++;state.previewCache.clear();};",
"const clearPreviewCache=()=>{state.previewCache.clear();};const clearFullRender=()=>{};const clearOutput=()=>{};",
"const sanitizeInputEdges=()=>{};const syncLegacyMainInputState=()=>{state.file=state.inputBindings.get(graphMainInputId())?.file||null;};",
"const markPreviewStale=()=>{};const refreshGraph=()=>{};const scheduleAutosave=()=>{};const syncFullRenderUi=()=>{};const showToast=()=>{};",
"const nextNodeSequence=()=>3;const normalizeGraphViewport=()=>({x:0,y:0,zoom:1});const hasStoredGraphViewport=()=>false;const deriveOutputFilename=name=>name+'.mp4';",
"const validateProjectGraph=()=>true;const migrateGraphToV4=g=>clone(g);",
"const defaultGraph=()=>({mainInputId:'input-1',nodes:[{id:'input-1',type:'input',source:null,params:{}},{id:'output-1',type:'output',params:{}}],edges:[]});",
"const syncMainInputSourceFromFile=()=>{};",
"const RECIPE_DEFS={mirror:{}};const makeRecipeGraph=(id,meta,{mainSource})=>({mainInputId:'input-1',nodes:[{id:'input-1',type:'input',source:mainSource,params:{}},{id:'output-1',type:'output',params:{}}],edges:[]});",
helpers,
line('function applyProjectEnvelope('),
line('function applyRecipe('),
line('function resetGraph('),
'return {state,applyProjectEnvelope,applyRecipe,resetGraph,sanitizeInputSourceMetadata,inputRelinkScore};'
].join('\n'));
const api=factory(),A={name:'A.mp4',size:123,lastModified:10,type:'video/mp4'},B={name:'B.mp4',size:123,lastModified:10,type:'video/mp4'};
const meta={duration:2,width:200,height:100};
api.state.inputBindings.set('input-1',{file:A,meta});
api.state.file=A;
api.state.previewCache.set('old-preview',{blob:{size:10}});
api.applyRecipe('mirror',{mainFile:B,mainMeta:meta});
assert.equal(api.state.fileToken,1,'Changing a recipe media file must invalidate source identity');
assert.equal(api.state.previewCache.size,0,'Old source preview must be removed');
assert.equal(api.state.file,B);
api.state.previewCache.set('same-source',{blob:{size:10}});
api.applyRecipe('mirror');
assert.equal(api.state.fileToken,1,'Reapplying a recipe with the SAME file should not discard source cache');
assert.equal(api.state.previewCache.size,1,'Recipe-only graph updates preserve cache entries until graph hash misses them');

api.state.inputBindings.set('input-2',{file:A,meta});
api.state.graph.nodes.push({id:'input-2',type:'input',params:{},source:{kind:'video',name:A.name,size:A.size}});
api.state.graph.mainInputId='input-2';
api.resetGraph();
assert.equal(api.state.fileToken,2,'Reset that remaps Input IDs to a different file must clear source cache');
assert.equal(api.state.file,A);

const savedSource={kind:'video',name:A.name,size:A.size,lastModified:A.lastModified,mimeType:A.type};
const graph={mainInputId:'input-1',nodes:[
 {id:'input-1',type:'input',params:{},source:savedSource},
 {id:'input-2',type:'input',params:{},source:savedSource}
],edges:[]};
api.state.inputBindings=new Map([['input-1',{file:A,meta}]]);
assert.equal(api.applyProjectEnvelope({graph}),1,'An imported graph must not match the same current File object twice');
assert.deepEqual([...api.state.inputBindings.keys()],['input-1'],'Second Input remains missing until the user relinks it');

const copy={...A}; // distinct File object with identical name/size
api.state.inputBindings=new Map([['input-1',{file:A,meta}],['input-2',{file:copy,meta}]]);
assert.equal(api.applyProjectEnvelope({graph}),2,'Two distinct File objects may restore two Inputs');
assert.notEqual(api.state.inputBindings.get('input-1').file,api.state.inputBindings.get('input-2').file);

const unknown=api.sanitizeInputSourceMetadata({kind:'video',name:A.name,size:null,lastModified:null});
assert.equal(unknown.size,null,'Unknown file size must remain unknown, not 0');
assert.equal(unknown.lastModified,null,'Unknown file timestamp must remain unknown, not 0');
assert.equal(api.inputRelinkScore({type:'input',source:unknown},A),16,'Missing optional metadata should not block filename-based relink');
assert.equal(api.inputRelinkScore({type:'input',source:{...savedSource,size:9}},A),-1,'Known incorrect sizes still prevent relink');
console.log('[OK] Recipe source identity, Graph reset/import identity and nullable relink metadata');
