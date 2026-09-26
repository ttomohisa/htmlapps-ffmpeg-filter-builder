import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');

test('inline application scripts are syntactically valid',()=>{
  const scripts=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
  assert.ok(scripts.length>=1,'expected at least one inline script');
  scripts.forEach((script,index)=>{
    assert.doesNotThrow(()=>new vm.Script(script,{filename:`index.template.inline-${index}.js`}));
  });
});

console.log('[OK] Inline template script syntax is valid.');
