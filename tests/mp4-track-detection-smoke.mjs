import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const start = source.indexOf("      const MP4_CONTAINER_BOXES=new Set(['moov','trak','mdia']);");
const end = source.indexOf('      async function readVideoMeta(file)', start);
assert.ok(start >= 0 && end > start, 'MP4 track detection source block was not found.');
const parserSource = source.slice(start, end);
const factory = new Function(`${parserSource}\nreturn {inspectMp4MoovBytes,inspectMp4Tracks};`);
const {inspectMp4MoovBytes,inspectMp4Tracks} = factory();

const u32 = value => Buffer.from([(value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255]);
const box = (type, payload=Buffer.alloc(0)) => Buffer.concat([u32(8+payload.length),Buffer.from(type,'ascii'),payload]);
const hdlr = type => box('hdlr', Buffer.concat([Buffer.alloc(8),Buffer.from(type,'ascii'),Buffer.alloc(12)]));
const track = type => box('trak', box('mdia', hdlr(type)));
const avMoov = box('moov', Buffer.concat([track('vide'),track('soun')]));
const videoOnlyMoov = box('moov', track('vide'));

assert.deepEqual(inspectMp4MoovBytes(avMoov.buffer.slice(avMoov.byteOffset,avMoov.byteOffset+avMoov.byteLength)), {hasVideo:true,hasAudio:true});
assert.deepEqual(inspectMp4MoovBytes(videoOnlyMoov.buffer.slice(videoOnlyMoov.byteOffset,videoOnlyMoov.byteOffset+videoOnlyMoov.byteLength)), {hasVideo:true,hasAudio:false});

const fakeFile = blob => ({
  name:'silent.mp4', type:'video/mp4', size:blob.length,
  slice(start,end){ const part=blob.subarray(start,end); return {arrayBuffer:async()=>part.buffer.slice(part.byteOffset,part.byteOffset+part.byteLength)}; }
});
assert.deepEqual(await inspectMp4Tracks(fakeFile(videoOnlyMoov)), {hasVideo:true,hasAudio:false});
assert.deepEqual(await inspectMp4Tracks(fakeFile(avMoov)), {hasVideo:true,hasAudio:true});

assert.ok(source.includes("for(const key of ['hasVideo','hasAudio'])"), 'Source metadata must persist detected track flags.');
assert.ok(source.includes("source?.hasAudio===false"), 'Video Input ports must omit Audio when the MP4 has no audio track.');
console.log('[OK] MP4 audio/video track detection smoke test passed.');
