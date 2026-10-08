import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('../src/index.template.html');
const app = JSON.parse(read('../app.config.json'));

assert.equal(app.version, '1.2.1', 'Canvas Drop milestone version mismatch.');

for (const marker of [
  'id="graphDropOverlay"',
  'canvasDropTitle',
  'canvasDropSub',
  'function droppedInputKind(file)',
  'function inputNeedsBinding(node)',
  'function missingInputNodes()',
  'function graphDropPosition(',
  'function graphDragHasFiles(event)',
  'function setGraphDropOverlay(',
  'async function handleGraphFileDrop(event)',
  "graphScroll.addEventListener('dragenter'",
  "graphScroll.addEventListener('dragover'",
  "graphScroll.addEventListener('dragleave'",
  "graphScroll.addEventListener('drop',event=>{if(graphDragHasPaletteNode(event))",
  'handleGraphFileDrop(event);',
  'input-missing',
  'node-missing-badge',
  'input-missing-callout',
  "t('graphLoadedMissing')",
  "t('recoveryRestoredMissing')"
]) assert.ok(source.includes(marker), `Missing Canvas Drop / Missing Input marker: ${marker}`);

assert.ok(source.includes("const files=[...(event.dataTransfer?.files||[])]"), 'Multi-file drop collection is missing.');
assert.ok(source.includes("for(const file of files)"), 'Dropped files are not processed as a batch.');
assert.ok(source.includes("const relink=await autoRelinkMissingFiles(files"), 'Canvas drop must auto-relink matching Missing Inputs before adding new nodes.');
assert.ok(source.includes("droppedInputKind(file)"), 'Dropped file media-kind detection is missing.');
assert.ok(source.includes("position:graphDropPosition(event.clientX,event.clientY,added)"), 'Drop position is not propagated into Input placement.');
assert.ok(source.includes("files.length===1&&targetNode?.type==='input'&&!inputFileBinding(targetNode.id)"), 'Single-file relink by dropping onto an unbound Input is missing.');
assert.ok(source.includes("const missing=missingInputNodes().length"), 'Graph restore does not count missing media bindings.');
assert.ok(source.includes("sanitizeInputSourceMetadata(node.source)?.name&&!inputFileBinding(node.id)?.file"), 'Missing Input must require saved source metadata but no runtime File binding.');
assert.ok(!source.includes('dataTransfer.files[0]'), 'Canvas Drop must not be limited to only the first dropped file.');

console.log('[OK] v1.2.0 Canvas Drop / Missing Input smoke tests passed.');
