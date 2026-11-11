import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/index.template.html',import.meta.url),'utf8');
const line=(prefix)=>{const match=source.split('\n').find(l=>l.trimStart().startsWith(prefix));assert.ok(match,'Missing function: '+prefix);return match;};
const helpers=source.slice(source.indexOf('      const INPUT_SOURCE_KINDS='),source.indexOf('      function migrateGraphToV4('));
assert.ok(helpers.includes('function currentInputRead('),'Missing async ownership guard');
const makeHarness=new Function([
"const state={graph:{schemaVersion:4,mainInputId:'input-1',nodes:[{id:'input-1',type:'input',params:{},source:null}],edges:[]},inputBindings:new Map(),inputMeta:{},rendering:false,file:null,fileToken:0,resetCount:0,selectedNodeId:'input-1',selectedNodeIds:new Set(['input-1']),selectedEdgeId:'',nextNodeSeq:3,workspace:{positions:{}},outputFilenameTouched:true};",
"const requests=new Map();",
"const inputNodesForGraph=g=>(g?.nodes||[]).filter(n=>n?.type==='input');",
"const graphMainInputId=(g=state.graph)=>g.mainInputId;",
"const nodeById=id=>state.graph.nodes.find(n=>n.id===id);",
"const t=key=>key;",
"const clone=value=>JSON.parse(JSON.stringify(value));",
"const readInputMeta=file=>new Promise(resolve=>requests.set(file.name,resolve));",
"const pushHistory=()=>{};",
"const sanitizeInputEdges=()=>{};",
"const resetMediaOutputs=()=>{state.fileToken++;state.resetCount++;};",
"const syncLegacyMainInputState=()=>{state.file=state.inputBindings.get(graphMainInputId())?.file||null;};",
"const deriveOutputFilename=name=>name+'.mp4';",
"const markPreviewStale=()=>{};",
"const refreshGraph=()=>{};",
"const scheduleAutosave=()=>{};",
"const setStatus=()=>{};",
"const showToast=()=>{};",
"const migrateGraphToV4=g=>JSON.parse(JSON.stringify(g));",
helpers,
line('async function bindInputFile('),
line('async function autoRelinkMissingFiles('),
line('function restoreSnapshot('),
line('function sanitizeOutputFilename('),
'return {state,requests,bindInputFile,autoRelinkMissingFiles,restoreSnapshot,sanitizeOutputFilename};'
].join('\n'));
const api=makeHarness(),{state,requests}=api;
const mk=(name)=>({name,size:123,lastModified:11,type:'video/mp4'});
const slow=mk('slow.mp4'),fast=mk('fast.mp4');
const pendingSlow=api.bindInputFile('input-1',slow);
const pendingFast=api.bindInputFile('input-1',fast);
requests.get('fast.mp4')({duration:2,width:640,height:480});
assert.equal(await pendingFast,true);
requests.get('slow.mp4')({duration:2,width:640,height:480});
assert.equal(await pendingSlow,false,'Late A metadata must not replace newer B');
assert.equal(state.inputBindings.get('input-1').file,fast);
assert.equal(state.resetCount,1,'Only one source should commit');
const stale=api.bindInputFile('input-1',mk('stale.mp4'));
state.graph=JSON.parse(JSON.stringify(state.graph));
requests.get('stale.mp4')({duration:1});
assert.equal(await stale,false,'Old graph reader must not mutate replacement graph');
assert.equal(state.inputBindings.get('input-1').file,fast);
const before=state.fileToken;
api.restoreSnapshot({graph:JSON.parse(JSON.stringify(state.graph)),inputBindings:new Map([['input-1',{file:slow,meta:{duration:5}}]]),selectedNodeId:'input-1',selectedNodeIds:['input-1'],selectedEdgeId:'',nextNodeSeq:3,positions:{}});
assert.equal(state.fileToken,before+1,'Undo to different source invalidates cache');
assert.equal(state.file,slow);
const stableToken=state.fileToken;
const editedGraph=JSON.parse(JSON.stringify(state.graph));
editedGraph.nodes[0].params.note='graph-only edit';
api.restoreSnapshot({graph:editedGraph,inputBindings:new Map([['input-1',{file:slow,meta:{duration:5}}]]),selectedNodeId:'input-1',selectedNodeIds:['input-1'],selectedEdgeId:'',nextNodeSeq:3,positions:{}});
assert.equal(state.fileToken,stableToken,'Graph-only Undo retains source token');
const duplicate=mk('same.mp4');
state.graph={schemaVersion:4,mainInputId:'input-1',nodes:[{id:'input-1',type:'input',params:{},source:{kind:'video',name:'same.mp4',size:123}},{id:'input-2',type:'input',params:{},source:{kind:'video',name:'same.mp4',size:123}}],edges:[]};
state.inputBindings=new Map();
const pendingRelink=api.autoRelinkMissingFiles([duplicate]);
requests.get('same.mp4')({duration:4});
const result=await pendingRelink;
assert.equal(result.relinked,1,'One selected file cannot auto-relink two inputs');
assert.equal(result.remaining,1);
const filename=api.sanitizeOutputFilename('a'.repeat(119)+'.mp4');
assert.equal(filename.length,120);
assert.ok(filename.endsWith('.mp4'));
console.log('[OK] Source ownership, Undo cache, relink uniqueness, and filenames');
