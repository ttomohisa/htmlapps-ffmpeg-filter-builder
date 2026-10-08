import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const app = JSON.parse(fs.readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));
const repositoryCheck = fs.readFileSync(new URL('../scripts/check-repository.ps1', import.meta.url), 'utf8');
assert.equal(app.version, '1.2.1', 'Multiple Input UI milestone version mismatch.');
assert.ok(repositoryCheck.includes("'function addInputWithFile(kind,file,'"), 'Repository preflight must track the current addInputWithFile signature prefix.');
assert.ok(!repositoryCheck.includes("'function addInputWithFile(kind,file)'"), 'Repository preflight must not require the obsolete addInputWithFile signature.');

for (const marker of [
  'data-add-input="video"',
  'data-add-input="audio"',
  'data-add-input="image"',
  'id="inputAssetPicker"',
  'function addInputWithFile(kind,file,',
  'function bindInputFile(nodeId,file',
  'function removeInputFile(nodeId)',
  'function setMainInput(nodeId)',
  'data-action="replace-input"',
  'data-action="set-main-input"',
  'data-action="delete-node"',
  'node-main-badge',
  'inputBindings:new Map()',
  'inputBindings:cloneInputBindings()',
  'state.inputBindings=cloneInputBindings(snap.inputBindings)',
]) {
  assert.ok(source.includes(marker), `Missing Multiple Input UI marker: ${marker}`);
}

const start = source.indexOf('      const GRAPH_SCHEMA_VERSION=4;');
const end = source.indexOf('      function projectEnvelope', start);
assert.ok(start >= 0 && end > start, 'Graph schema source block was not found.');
const schemaSource = source.slice(start, end);
const factory = new Function(`
  const clone = value => JSON.parse(JSON.stringify(value));
  const state = { graph:null, inputBindings:new Map() };
  const t = key => key;
  const $ = () => ({ textContent:'' });
  const formatDuration = value => String(value);
  const formatBytes = value => String(value);
  const revoke = () => {};
  ${schemaSource}
  return { makeInputNode, inputOutputPorts, inputExpectedKind, inputSourceKind, sanitizeInputSourceMetadata };
`);
const api = factory();
const video = api.makeInputNode('video', {kind:'video', name:'main.mp4'});
const audio = api.makeInputNode('audio', {kind:'audio', name:'music.mp3'});
const image = api.makeInputNode('image', {kind:'image', name:'logo.png'});
assert.deepEqual(api.inputOutputPorts(video), ['out','audio'], 'Video Input must expose Video and Audio ports for the current media model.');
assert.deepEqual(api.inputOutputPorts(audio), ['audio'], 'Audio Input must expose only an Audio port.');
assert.deepEqual(api.inputOutputPorts(image), ['out'], 'Image Input must expose only a Video port.');
assert.equal(api.inputExpectedKind(audio), 'audio');
assert.equal(api.inputExpectedKind(image), 'image');

assert.ok(source.includes("node.source=sanitizeInputSourceMetadata({kind});"), 'Removing a file must preserve the Input media kind.');
assert.ok(source.includes("kind==='video'&&inputs.length===1"), 'Only the initial empty Video Input may be reused; Audio/Image additions must create their own Input nodes.');
assert.ok(source.includes("for(const port of nodeOutputPorts(node))"), 'Validation must use dynamic Input output ports.');
assert.ok(source.includes("{inputKind:inputSourceKind(node)}"), 'Input media kind must participate in Graph semantics/hash while file metadata stays out of it.');
assert.ok(source.includes("if(node.type==='input'&&inputNodesForGraph(state.graph).length<=1)"), 'The final Input node must be protected from deletion.');
assert.ok(source.includes("state.graph.mainInputId=inputNodesForGraph(state.graph)[0]?.id||null"), 'Deleting the main Input must promote another Input.');

console.log('[OK] v1.2.0 Multiple Input Node UI smoke tests passed.');
