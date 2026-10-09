import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const app = JSON.parse(fs.readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));
assert.equal(app.version, '1.2.2', 'Multi Input schema milestone version mismatch.');

const start = source.indexOf('      const GRAPH_SCHEMA_VERSION=4;');
const end = source.indexOf('      function projectEnvelope', start);
assert.ok(start >= 0 && end > start, 'Graph schema migration source block was not found.');
const schemaSource = source.slice(start, end);

const factory = new Function(`
  const clone = value => JSON.parse(JSON.stringify(value));
  const state = { graph:null };
  ${schemaSource}
  return { GRAPH_SCHEMA_VERSION, LEGACY_GRAPH_SCHEMA_VERSION, migrateGraphToV4, makeInputNode, makeGraphV4, sanitizeInputSourceMetadata, sourceMetadataFromFile, graphMainInputId };
`);
const api = factory();
assert.equal(api.GRAPH_SCHEMA_VERSION, 4);
assert.equal(api.LEGACY_GRAPH_SCHEMA_VERSION, 3);

const legacy = {
  schemaVersion:3,
  nodes:[
    {id:'input-1',type:'input',params:{}},
    {id:'scale-1',type:'scale',params:{width:640}},
    {id:'output-1',type:'output',params:{}}
  ],
  edges:[
    {id:'e1',from:'input-1',fromPort:'out',to:'scale-1',toPort:'in',type:'video'},
    {id:'e2',from:'scale-1',fromPort:'out',to:'output-1',toPort:'in',type:'video'}
  ]
};
const migrated = api.migrateGraphToV4(legacy);
assert.equal(migrated.schemaVersion, 4, 'schemaVersion 3 must migrate to 4.');
assert.equal(migrated.mainInputId, 'input-1', 'Legacy graph must promote its first Input to mainInputId.');
assert.equal(migrated.nodes[0].source, null, 'Legacy Input without source metadata must migrate with source:null.');
assert.equal(legacy.schemaVersion, 3, 'Migration must not mutate the original Graph JSON.');
assert.equal('mainInputId' in legacy, false, 'Migration must be non-destructive.');

const sourceMeta = api.sanitizeInputSourceMetadata({
  kind:'video', name:'sample.mp4', size:123456, lastModified:1700000000000,
  mimeType:'video/mp4', durationSeconds:12.5, width:1920, height:1080,
  path:'C:/secret/sample.mp4', arbitrary:'must-not-survive'
});
assert.deepEqual(sourceMeta, {
  kind:'video', name:'sample.mp4', size:123456, lastModified:1700000000000,
  mimeType:'video/mp4', durationSeconds:12.5, width:1920, height:1080
}, 'Persisted source metadata must not retain local paths or arbitrary fields.');

const twoInput = api.makeGraphV4([
  api.makeInputNode('input-a', {kind:'video',name:'a.mp4',size:10,lastModified:1,mimeType:'video/mp4'}),
  api.makeInputNode('input-b', {kind:'image',name:'logo.png',size:20,lastModified:2,mimeType:'image/png'}),
  {id:'output-1',type:'output',params:{}}
], [], 'input-b');
assert.equal(twoInput.schemaVersion, 4);
assert.equal(twoInput.mainInputId, 'input-b', 'v4 data model must preserve an explicit main input among multiple Input nodes.');
assert.equal(twoInput.nodes.filter(node => node.type === 'input').length, 2, 'v4 data model must represent multiple Input nodes.');
assert.equal(api.graphMainInputId(twoInput), 'input-b');

const fromFile = api.sourceMetadataFromFile({
  name:'clip.mp4', type:'video/mp4', size:99, lastModified:123
}, {duration:3.25,width:1280,height:720});
assert.equal(fromFile.kind, 'video');
assert.equal(fromFile.durationSeconds, 3.25);
assert.equal(fromFile.width, 1280);
assert.equal(fromFile.height, 720);

assert.ok(source.includes('inputBindings:new Map()'), 'Runtime input binding map is missing.');
assert.ok(source.includes('graph:clone(migrateGraphToV4(graph))'), 'Graph JSON export must normalize to schemaVersion 4.');
assert.ok(source.includes('state.inputBindings.clear()'), 'Graph import must detach runtime File objects.');
assert.ok(source.includes("function runtimeSupportsMultipleInputs()"), 'Multi-input execution must remain explicitly gated by runtime capabilities.');
assert.ok(source.includes("errorMissingGraphInputFiles"), 'Missing runtime File bindings must have a dedicated execution error.');

const stablePayload = source.match(/function stableGraphPayload\(graph=state\.graph\)\{([\s\S]*?)\n      \}/);
assert.ok(stablePayload, 'Stable Graph payload implementation missing.');
assert.ok(stablePayload[1].includes('mainInputId:graphMainInputId(graph)'), 'mainInputId must participate in Graph semantics/hash.');
assert.ok(stablePayload[1].includes('inputKind:inputSourceKind(node)'), 'Input media kind must participate in Graph semantics/hash once it controls available ports.');
assert.ok(!stablePayload[1].includes('source:'), 'Filename, size, timestamps, and other Input source metadata must not be folded into the Graph semantic hash.');

console.log('[OK] v1.2.0 Multi Input schema v4 / v3 migration smoke tests passed.');
