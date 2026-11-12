import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/index.template.html',import.meta.url),'utf8');
const start=source.indexOf('      // Generate only a small still frame;');
const end=source.indexOf('      function nodeCategoryLabel(',start);
assert.ok(start>=0&&end>start,'Production thumbnail helpers must exist');
const thumbnailSource=source.slice(start,end);
assert.match(source,/\\.node-body\\.has-video-thumbnail/);
assert.match(source,/\\.file-thumb\\.video-thumbnail/);
assert.match(source,/videoThumbs:new WeakMap\(\)/);
assert.match(source,/scheduleInputVideoThumbnails\(\); \}/,'Every Graph refresh must discover bound videos');
assert.doesNotMatch(source.slice(source.indexOf('function projectEnvelope('),source.indexOf('function applyProjectEnvelope(')),/videoThumbs|videoThumbPending/,'Thumbnails must not be serialized into project JSON');

const factory=new Function('assert',[
  "const a={name:'A.mp4'},b={name:'B.mp4'},bad={name:'bad.mp4'};",
  "const input={id:'input-1',type:'input'};",
  "const state={graph:{nodes:[input]},selectedNodeId:'input-1',inputBindings:new Map([['input-1',{file:a}]]),rendering:false,videoThumbs:new WeakMap(),videoThumbPending:new WeakSet(),videoThumbFailed:new WeakSet()};",
  "const videos=[],revoked=[];let created=0;",
  "const nodeSlot={children:[],replaceChildren(img){this.children=[img];}};",
  "const inspectorSlot={children:[],replaceChildren(img){this.children=[img];}};",
  "const card={dataset:{nodeId:'input-1'},querySelector:()=>nodeSlot};",
  "const document={createElement(tag){if(tag==='video'){const video={readyState:2,videoWidth:96,videoHeight:64,duration:1,currentTime:0,seeking:false,removeAttribute(){},load(){}};videos.push(video);return video;}if(tag==='canvas')return {width:0,height:0,getContext(){return {fillRect(){},drawImage(){},set fillStyle(_) {}};},toDataURL(){return 'data:image/jpeg;base64,QUJDREVGRw==';}};if(tag==='img')return {alt:'',src:'',decoding:''};throw Error(tag);},querySelectorAll(){return [card]}};",
  "const URL={createObjectURL(){return 'blob:mock-'+(++created);},revokeObjectURL(url){revoked.push(url);}};",
  "const $=()=>inspectorSlot;",
  "const inputNodesForGraph=graph=>graph.nodes;",
  "const inputExpectedKind=()=> 'video';",
  "const inputFileBinding=id=>state.inputBindings.get(id);",
  "const setTimeout=()=>1,clearTimeout=()=>{};",
  thumbnailSource,
  'return {a,b,bad,state,videos,revoked,nodeSlot,inspectorSlot,requestVideoThumbnail,scheduleInputVideoThumbnails,videoThumbnailContent};'
].join('\n'));
const {a,b,bad,state,videos,revoked,nodeSlot,inspectorSlot,requestVideoThumbnail,scheduleInputVideoThumbnails,videoThumbnailContent}=factory(assert);
requestVideoThumbnail(a);
assert.equal(videos.length,1);
assert.equal(state.videoThumbPending.has(a),true);
state.inputBindings.set('input-1',{file:b});
videos[0].onloadedmetadata();
videos[0].onseeked();
assert.equal(state.videoThumbs.has(a),true);
assert.equal(nodeSlot.children.length,0,'Late A must not overwrite the current B thumbnail');
assert.equal(inspectorSlot.children.length,0,'Late A must not overwrite the current B Inspector');
assert.equal(revoked.length,1,'A temporary local Blob URL must be revoked');
scheduleInputVideoThumbnails();
assert.equal(videos.length,2);
videos[1].onloadedmetadata();videos[1].onseeked();
assert.equal(nodeSlot.children[0]?.src,inspectorSlot.children[0]?.src);
assert.match(videoThumbnailContent(b),/data:image\/jpeg;base64/);
assert.equal(revoked.length,2);
scheduleInputVideoThumbnails();
assert.equal(videos.length,2,'Already generated file should not decode again');
state.inputBindings.set('input-1',{file:bad});
requestVideoThumbnail(bad);
assert.equal(videos.length,3);
videos[2].onerror();
assert.equal(state.videoThumbFailed.has(bad),true);
assert.equal(revoked.length,3,'Failed decode must clean up Blob URL');
requestVideoThumbnail(bad);
assert.equal(videos.length,3,'Unsupported video should retain the fallback icon without retry loop');
assert.doesNotMatch(videoThumbnailContent(bad),/<img/,'Unsupported videos show the existing icon');
state.rendering=true;
state.inputBindings.set('input-1',{file:{name:'not-yet.mp4'}});
scheduleInputVideoThumbnails();
assert.equal(videos.length,3,'Do not start new decoding during a render');
console.log('[OK] Thumbnail identity, late completion, inspector/graph sync, local Blob cleanup, failure fallback');
