import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const workflow=read('.github/workflows/deploy-pages.yml');
const build=read('.github/workflows/build-standalone.yml');
const preview=read('.github/workflows/preview.yml');
const app=JSON.parse(read('app.config.json'));
assert.equal(app.version,'1.2.4','This PR must prepare the reviewed v1.2.4 release');
assert.match(workflow,/push:\s*\n\s+branches: \[main\]/);
assert.match(workflow,/\n  release:\s*\n\s+name: Tag and publish verified standalone release/);
assert.match(workflow,/needs: \[build, deploy\]/);
assert.match(workflow,/always\(\).*github\.event_name == 'push'.*github\.ref == 'refs\/heads\/main'/);
assert.match(workflow,/needs\.build\.result == 'success'/);
assert.match(workflow,/needs\.deploy\.result == 'success'.*needs\.deploy\.result == 'skipped'/);
const release=workflow.slice(workflow.indexOf('\n  release:'));
assert.match(release,/permissions:\s*\n\s+contents: write/);
assert.match(release,/gh release view "\$tag"/,'Skip an already published release');
assert.match(release,/gh api "repos\/\$GITHUB_REPOSITORY\/git\/ref\/tags\/\$tag"/,'Check conflicting existing tags');
assert.match(release,/tag_sha.*GITHUB_SHA/,'Do not move an existing tag');
assert.match(release,/if: steps\.version\.outputs\.publish == 'true'/);
assert.match(release,/actions\/download-artifact@v7/);
assert.match(release,/name: ffmpeg-filter-builder-\$\{\{ github\.sha \}\}/,'Consume the exact tested build');
for(const file of ['ffmpeg-filter-builder.html','ffmpeg-filter-builder.mt.html','dist/index.self-extract.html','dist/index.mt.self-extract.html','dist/runtime-manifest.json','dist/runtime-manifest.mt.json']) {
  assert.ok(release.includes('release-input/'+file),'Missing a verified build artifact: '+file);
}
assert.match(release,/sha256sum .\/\*\.html .\/\*\.zip > SHA256SUMS\.txt/);
assert.match(release,/gh release create "\$TAG" release-assets\/\*/);
assert.match(release,/--notes-file release-notes\.md/);
assert.match(release,/--target "\$GITHUB_SHA"/,'Tag must identify the tested merge commit');
assert.match(release,/CHANGELOG\.md > release-notes\.md/);
assert.ok(!build.includes('gh release create'),'PR checks must not create a release');
assert.ok(!preview.includes('gh release create'),'PR preview must not create a release');
const versionSection=read('CHANGELOG.md').split(/^## /m).find(s=>s.startsWith(app.version+' '));
assert.ok(versionSection?.length>400,'Release version needs substantive changelog notes');
console.log('[OK] Merge-only, tested-asset, idempotent SemVer tag + GitHub Release workflow');
