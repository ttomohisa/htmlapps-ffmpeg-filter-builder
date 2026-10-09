import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const app = JSON.parse(fs.readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));
assert.equal(app.version, '1.2.2', 'Auto Relink milestone version mismatch.');

const start = source.indexOf('      function sanitizeInputSourceMetadata(source)');
const end = source.indexOf('      function migrateGraphToV4(graph)', start);
assert.ok(start >= 0 && end > start, 'Input source / relink helper block was not found.');
const helperSource = source.slice(start, end);

const factory = new Function(`
  const INPUT_SOURCE_KINDS=new Set(['video','audio','image','media']);
  const state={graph:{nodes:[]},inputBindings:new Map()};
  const inputNodesForGraph=graph=>(graph?.nodes||[]).filter(node=>node?.type==='input');
  const t=key=>key;
  const clone=value=>JSON.parse(JSON.stringify(value));
  ${helperSource}
  return {sanitizeInputSourceMetadata,inputRelinkScore,bestRelinkFile,inputKindMatches};
`);
const api = factory();

const node = {
  id:'input-1', type:'input', params:{},
  source:{kind:'video',name:'main.mp4',size:12345,lastModified:1000,mimeType:'video/mp4'}
};
const exact={name:'main.mp4',size:12345,lastModified:1000,type:'video/mp4'};
const copied={name:'main.mp4',size:12345,lastModified:2000,type:'video/mp4'};
const wrongSize={name:'main.mp4',size:12346,lastModified:1000,type:'video/mp4'};
const wrongName={name:'other.mp4',size:12345,lastModified:1000,type:'video/mp4'};
const wrongKind={name:'main.mp4',size:12345,lastModified:1000,type:'audio/mp4'};

assert.equal(api.inputRelinkScore(node,exact),30, 'Exact metadata match should receive the strongest score.');
assert.equal(api.inputRelinkScore(node,copied),26, 'A copied file with the same name and size may relink even if lastModified changed.');
assert.equal(api.inputRelinkScore(node,wrongSize),-1, 'Different file size must not auto-relink.');
assert.equal(api.inputRelinkScore(node,wrongName),-1, 'Different filename must not auto-relink.');
assert.equal(api.inputRelinkScore(node,wrongKind),-1, 'Different media kind must not auto-relink.');
assert.equal(api.bestRelinkFile(node,[copied,exact]),exact, 'The strongest matching file should win.');

const sanitized=api.sanitizeInputSourceMetadata({kind:'video',name:'main.mp4',size:12345,lastModified:1000,mimeType:'video/mp4',path:'C:/secret/main.mp4',webkitRelativePath:'secret/main.mp4'});
assert.equal('path' in sanitized,false,'Absolute paths must never survive source metadata sanitization.');
assert.equal('webkitRelativePath' in sanitized,false,'Relative local paths must never survive source metadata sanitization.');

for (const marker of [
  'id="relinkInputsButton"',
  'id="relinkFilesInput"',
  'multiple hidden',
  'function inputRelinkScore(node,file)',
  'function bestRelinkFile(node,files)',
  'async function autoRelinkMissingFiles(files',
  'async function relinkFilesFromPicker(files)',
  'previousBindings=[...state.inputBindings.values()]',
  "t('graphLoadedAutoRelinked')",
  "t('inputRelinkBatchDone')",
  "data-action=\"relink-missing-all\"",
  'const relink=await autoRelinkMissingFiles(files',
  'relink.matchedFiles.has(file)',
  'filename and size',
  'ファイル名とサイズ'
]) assert.ok(source.includes(marker), `Missing beta.4 Auto Relink marker: ${marker}`);

console.log('[OK] v1.2.0 Graph Restore / Auto Relink smoke tests passed.');
