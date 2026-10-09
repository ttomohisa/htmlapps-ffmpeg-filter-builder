const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {gunzipSync} = require('node:zlib');
const root = path.resolve(__dirname, '..');
const asset = fs.readFileSync(path.join(root, 'assets/favicon.svg'));
assert.equal(require('node:crypto').createHash('sha256').update(asset).digest('hex'), 'fedcbbbe2f38a886dda572cfd4baf5c1dc1e48cded557639873fe7b19dd1c5f3', 'Preserve the normalized canonical artwork');
const svg = asset.toString();
const contour = "M273.835 0.17H821.165A273.665 273.665 0 0 1 1094.83 273.835V821.165A273.665 273.665 0 0 1 821.165 1094.83H273.835A273.665 273.665 0 0 1 0.17 821.165V273.835A273.665 273.665 0 0 1 273.835 0.17Z";
const firstPath = svg.match(/<path\b[^>]*d="([^"]*)"/)[1];
assert.ok(firstPath.startsWith(contour), 'Exact 25% rounded rectangle contour with preserved bounds');
assert.equal(require('node:crypto').createHash('sha256').update(firstPath.slice(contour.length)).digest('hex'), 'ec3667f5fa7d7513dc63b3f7f642326c668db9f5582cb871fff6e805d6eaa92d', 'Preserve every interior cutout byte');
assert.ok(svg.includes('fill="#16624f"'), 'Shared brand green');
assert.ok(!svg.includes('#0e6852'), 'Matching strokes and cutouts share brand green');
const decode = uri => uri.startsWith('data:image/svg+xml;base64,') ? Buffer.from(uri.split(',')[1], 'base64') : Buffer.from(decodeURIComponent(uri.slice(uri.indexOf(',')+1)));
const favicon = html => {
  const tag = html.match(/<link\b[^>]*rel=["']icon["'][^>]*>/)[0];
  assert.deepEqual(decode(tag.match(/href=(["'])(.*?)\1/s)[2]), asset, 'Canonical favicon byte parity');
};
const header = html => {
  const img = html.match(/<img\b[^>]*id="appBrandIcon"[^>]*>/);
  if (img) assert.deepEqual(decode(img[0].match(/src="([^"]*)"/)[1]), asset, 'Canonical header byte parity');
  else assert.ok(html.includes(svg.trim()), 'Inline header has canonical SVG');
};
const readable = fs.readFileSync(path.join(root, 'dist/index.html'));
for(const file of ['dist/index.html', 'ffmpeg-filter-builder.html']) {const html=fs.readFileSync(path.join(root,file),'utf8');favicon(html);header(html);}
const source = fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
if(!source.includes('__APP_ICON_DATA_URI__')) {favicon(source);header(source);}
const wrapper=fs.readFileSync(path.join(root,'dist/index.self-extract.html'),'utf8');
favicon(wrapper);
const payload=wrapper.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\s]+)<\/script>/);
assert.ok(payload,'Self-extract payload exists');
assert.deepEqual(gunzipSync(Buffer.from(payload[1],'base64')), readable, 'Self-extract restores exact readable bytes');
console.log('Icon color, exact quarter-radii, header/favicon/alias/loader parity passed.');

const mt = fs.readFileSync(path.join(root, 'dist/index.mt.html'));
for (const f of ['dist/index.mt.html','ffmpeg-filter-builder.mt.html']) {const h=fs.readFileSync(path.join(root,f),'utf8');favicon(h);header(h);}
const mtWrapper=fs.readFileSync(path.join(root,'dist/index.mt.self-extract.html'),'utf8');favicon(mtWrapper);
const mtPayload=mtWrapper.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\s]+)<\/script>/);
assert.deepEqual(gunzipSync(Buffer.from(mtPayload[1],'base64')),mt,'MT self-extract exact byte parity');
