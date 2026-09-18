import fs from 'node:fs';
import crypto from 'node:crypto';

const fail = (message) => { throw new Error(message); };
const read = (path) => fs.readFileSync(path, 'utf8');

const lock = JSON.parse(read('coi-serviceworker.lock.json'));
const worker = fs.readFileSync('vendor/coi-serviceworker/coi-serviceworker.js');
const workerHash = crypto.createHash('sha256').update(worker).digest('hex');
if (workerHash !== lock.sha256) fail('coi-serviceworker SHA-256 mismatch');
if (lock.version !== '0.1.7') fail('Unexpected coi-serviceworker version');
if (lock.commit !== '7b1d2a092d0d2dd2b7270b6f12f13605de26f214') fail('Unexpected coi-serviceworker commit');

const prepare = read('scripts/prepare-pages.ps1');
for (const token of [
  'pages-dist',
  'Join-Path $Dist "index.html"',
  'Join-Path $Dist "index.mt.html"',
  'coi-serviceworker.js',
  'window.coi',
  'coepCredentialless: () => false',
  'coepDegrade: () => false'
]) {
  if (!prepare.includes(token)) fail(`prepare-pages.ps1 is missing ${token}`);
}

const workflow = read('.github/workflows/deploy-pages.yml');
if (!workflow.includes('Prepare GitHub Pages site')) fail('Pages workflow does not prepare the staged site');
if (!workflow.includes('path: pages-dist')) fail('Pages workflow does not deploy pages-dist');
if (!workflow.includes('pages-deployment-smoke.mjs')) fail('Pages workflow does not verify the staged site');

if (fs.existsSync('pages-dist')) {
  const st = read('pages-dist/index.html');
  const mt = read('pages-dist/mt/index.html');
  const sw = read('pages-dist/mt/coi-serviceworker.js');
  if (!st.includes('const RUNTIME_VARIANT = "single-thread";')) fail('Pages root is not the ST build');
  if (st.includes('coi-serviceworker.js')) fail('Pages root must not load the COI service worker');
  if (!mt.includes('const RUNTIME_VARIANT = "multi-thread";')) fail('Pages /mt/ is not the MT build');
  if (!mt.includes('if (window.crossOriginIsolated === false)')) fail('Pages /mt/ does not conditionally load the COI fallback');
  if (!mt.includes('coiScript.src = "./coi-serviceworker.js"')) fail('Pages /mt/ does not reference the COI service worker fallback');
  if (!mt.includes('coepCredentialless: () => false')) fail('Pages /mt/ does not force require-corp mode');
  if (sw !== worker.toString('utf8')) fail('Staged COI service worker differs from vendored source');
}

console.log('[OK] GitHub Pages ST/MT deployment smoke test passed.');
