const test=require('node:test');
const assert=require('node:assert/strict');

test('battle sound cues play once and cannot trigger before their scene time',async()=>{
 const {MoriaAudio}=await import('../moria-audio.js');
 const audio=new MoriaAudio(),heard=[];audio.enabled=true;audio.effect=type=>heard.push(type);
 audio.tick(1,true);assert.deepEqual(heard,[]);
 audio.tick(1.21,true);audio.tick(1.25,true);assert.deepEqual(heard,['crackle']);
 audio.tick(4.02,false);assert.deepEqual(heard,['crackle']);
 audio.tick(4.04,true);assert.deepEqual(heard,['crackle','roar']);
 audio.tick(17.03,true);assert.equal(heard.at(-1),'strike');
});
test('seeking skips past effects and replay makes them available again',async()=>{
 const {MoriaAudio}=await import('../moria-audio.js');
 const audio=new MoriaAudio(),heard=[];audio.enabled=true;audio.effect=type=>heard.push(type);
 audio.seek(18);audio.tick(18.01,true);assert.deepEqual(heard,[]);
 audio.tick(21.52,true);assert.deepEqual(heard,['crackle']);
 audio.seek(0);audio.tick(1.22,true);assert.deepEqual(heard,['crackle','crackle']);
 audio.enabled=false;audio.tick(4.01,true);assert.equal(heard.length,2);
});

test('dialogue and weapon effects have separate scene cues and past dialogue is skipped after seeking',async()=>{
 const {MoriaAudio,MORIA_CUES}=await import('../moria-audio.js');
 const audio=new MoriaAudio(),heard=[];audio.enabled=true;audio.effect=type=>heard.push(type);
 assert.equal(new Set(MORIA_CUES.map(([at])=>at)).size,MORIA_CUES.length);
 for(const type of ['voice-pass','voice-shadow','roar','whip','clash','strike','rumble'])assert.ok(MORIA_CUES.some(cue=>cue[1]===type),type);
 audio.tick(9.72,true);assert.deepEqual(heard,['voice-shadow']);
 audio.seek(22.5);audio.tick(22.51,true);assert.deepEqual(heard,['voice-shadow']);
 audio.seek(21);audio.tick(22.32,true);assert.deepEqual(heard,['voice-shadow','voice-pass']);
});

test('pause and seek stop in-progress speech and effects',async()=>{
 const {MoriaAudio}=await import('../moria-audio.js');
 const audio=new MoriaAudio();let stops=0;audio.stopTransients=()=>stops++;
 audio.setPlaying(true);audio.setPlaying(false);assert.equal(stops,1);
 audio.setPlaying(false);assert.equal(stops,1,'repeated paused state does not repeatedly stop nodes');
 audio.seek(14);assert.equal(stops,2);
 await audio.setEnabled(false);assert.equal(stops,3);
});

test('bundled dialogue files contain real mono PCM recordings with nonzero speech samples',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const file of ['gandalf-pass.wav','gandalf-shadow.wav']){
  const buffer=fs.readFileSync(path.join(__dirname,'../assets/moria/audio',file));
  assert.equal(buffer.toString('ascii',0,4),'RIFF');assert.equal(buffer.toString('ascii',8,12),'WAVE');
  let position=12,format=null,data=null;
  while(position+8<=buffer.length){const id=buffer.toString('ascii',position,position+4),length=buffer.readUInt32LE(position+4);if(id==='fmt ')format=buffer.subarray(position+8,position+8+length);if(id==='data')data=buffer.subarray(position+8,position+8+length);position+=8+length+(length%2);}
  assert.ok(format&&data,file);assert.equal(format.readUInt16LE(0),1,'uncompressed PCM');assert.equal(format.readUInt16LE(2),1,'mono');assert.equal(format.readUInt32LE(4),44100);assert.equal(format.readUInt16LE(14),16);
  assert.ok(data.length>44100*2,file+' duration exceeds one second');let peak=0;for(let i=0;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)));assert.ok(peak>1000,file+' contains speech rather than silence');
 }
});
