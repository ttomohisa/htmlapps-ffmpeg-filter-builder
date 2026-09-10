import assert from 'node:assert/strict';

const clone = value => JSON.parse(JSON.stringify(value));
function stableGraphPayload(graph){
  const nodes=graph.nodes.map(node=>({id:node.id,type:node.type,params:clone(node.params)})).sort((a,b)=>a.id.localeCompare(b.id));
  const edges=graph.edges.map(edge=>({from:edge.from,to:edge.to,type:edge.type})).sort((a,b)=>`${a.from}>${a.to}:${a.type}`.localeCompare(`${b.from}>${b.to}:${b.type}`));
  return JSON.stringify({schemaVersion:graph.schemaVersion,nodes,edges});
}
function fnv1a32(text){ let hash=0x811c9dc5; for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193);} return (hash>>>0).toString(16).padStart(8,'0'); }
const graphHash = graph => `g-${fnv1a32(stableGraphPayload(graph))}`;
const key = (fileToken,variant,hash,start,duration) => `${fileToken}:${variant}:${hash}:${Number(start).toFixed(3)}:${Number(duration).toFixed(3)}`;
const clampStart = (value,duration) => Math.max(0,Math.min(Number.isFinite(duration)?Math.max(0,duration-.05):86400,Number.isFinite(Number(value))?Number(value):0));

const graph={schemaVersion:1,nodes:[{id:'input-1',type:'input',params:{}},{id:'scale-1',type:'scale',params:{width:640}},{id:'output-1',type:'output',params:{}}],edges:[{from:'input-1',to:'scale-1',type:'video'},{from:'scale-1',to:'output-1',type:'video'}]};
const reordered={schemaVersion:1,nodes:[graph.nodes[2],graph.nodes[0],graph.nodes[1]],edges:[graph.edges[1],graph.edges[0]]};
assert.equal(graphHash(graph),graphHash(reordered),'Hash must be stable across array ordering');
const changed=clone(graph); changed.nodes[1].params.width=1280;
assert.notEqual(graphHash(graph),graphHash(changed),'Hash must change when node parameters change');
assert.notEqual(key(1,'single-thread',graphHash(graph),0,5),key(1,'multi-thread',graphHash(graph),0,5),'Runtime variant must be part of cache key');
assert.notEqual(key(1,'single-thread',graphHash(graph),0,5),key(2,'single-thread',graphHash(graph),0,5),'Input session token must be part of cache key');
assert.notEqual(key(1,'single-thread',graphHash(graph),0,5),key(1,'single-thread',graphHash(graph),2,5),'Preview start must be part of cache key');
assert.notEqual(key(1,'single-thread',graphHash(graph),0,5),key(1,'single-thread',graphHash(graph),0,10),'Preview duration must be part of cache key');
assert.equal(clampStart(-4,20),0);
assert.equal(clampStart(4.5,20),4.5);
assert.equal(clampStart(30,20),19.95);
assert.equal(Math.min(20,4.5+10),14.5);

function sourceHorizon(outputEnd, filters, inputDuration=Infinity){
  let needed=Math.max(0,Number(outputEnd)||0);
  for(let i=filters.length-1;i>=0;i--){ const node=filters[i],p=node.params||{}; if(node.type==='speed') needed*=Math.max(.0001,Number(p.rate)||1); else if(node.type==='trim') needed=Math.max(0,Number(p.start)||0)+Math.min(Math.max(0,Number(p.duration)||0),needed); }
  if(Number.isFinite(inputDuration)) needed=Math.min(inputDuration,needed);
  return Math.max(.05,needed);
}
assert.equal(sourceHorizon(5,[{type:'speed',params:{rate:2}}],30),10,'2x speed needs 10 source seconds for 5 output seconds');
assert.equal(sourceHorizon(5,[{type:'trim',params:{start:4,duration:8}}],30),9,'Trim preview horizon must include the trim start');
assert.equal(sourceHorizon(10,[{type:'trim',params:{start:4,duration:3}}],30),7,'Trim horizon is capped by the trim duration');

function executionPlan({start,duration,inputDuration=Infinity,filters=[]}){
  const timelineSensitive=filters.some(node=>['trim','speed','fade'].includes(node.type));
  if(!timelineSensitive){
    const safeStart=clampStart(start,inputDuration);
    const available=Number.isFinite(inputDuration)?Math.max(.05,inputDuration-safeStart):duration;
    return {startTimeSeconds:safeStart,durationSeconds:Math.max(.05,Math.min(duration,available)),playbackStart:0,mode:'direct-range'};
  }
  return {startTimeSeconds:0,durationSeconds:sourceHorizon(start+duration,filters,inputDuration),playbackStart:start,mode:'timeline-safe'};
}
assert.deepEqual(executionPlan({start:12,duration:5,inputDuration:40,filters:[{type:'scale',params:{width:640}}]}),{startTimeSeconds:12,durationSeconds:5,playbackStart:0,mode:'direct-range'},'Time-invariant graphs should use direct bounded range rendering');
assert.deepEqual(executionPlan({start:38,duration:5,inputDuration:40,filters:[{type:'crop',params:{}}]}),{startTimeSeconds:38,durationSeconds:2,playbackStart:0,mode:'direct-range'},'Direct range should clamp duration at source end');
assert.deepEqual(executionPlan({start:2,duration:5,inputDuration:30,filters:[{type:'trim',params:{start:4,duration:8}}]}),{startTimeSeconds:0,durationSeconds:11,playbackStart:2,mode:'timeline-safe'},'Trim preview should preserve timeline semantics by rendering only the required source horizon');
assert.deepEqual(executionPlan({start:3,duration:5,inputDuration:30,filters:[{type:'speed',params:{rate:2}}]}),{startTimeSeconds:0,durationSeconds:16,playbackStart:3,mode:'timeline-safe'},'Speed preview should account for source/output time mapping');

const cache=new Map(); let bytes=0; const maxEntries=2, maxBytes=128*1024*1024;
function put(k,size){
  const blob=new Blob([new Uint8Array(size)]);
  if(cache.has(k)){bytes-=cache.get(k).blob.size;cache.delete(k);}
  cache.set(k,{blob});bytes+=blob.size;
  while(cache.size>maxEntries||bytes>maxBytes){const first=cache.keys().next().value;const item=cache.get(first);cache.delete(first);bytes-=item.blob.size;}
}
put('a',1024); put('b',1024); put('c',1024);
assert.deepEqual([...cache.keys()],['b','c'],'Cache must evict the oldest entry');
assert.equal(cache.size,2);
console.log('[OK] Preview Engine smoke test passed.');
