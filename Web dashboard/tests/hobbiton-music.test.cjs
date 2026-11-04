const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
test('original pastoral score is stereo 40-second PCM with audible dynamics and no clipping',()=>{
 const b=fs.readFileSync(path.join(root,'assets/hobbiton/hobbiton-pastoral.wav'));
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');
 assert.equal(b.readUInt16LE(22),2);assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(34),16);
 const samples=(b.length-44)/2;assert.equal(samples/(44100*2),40);
 let peak=0,sum=0,stereo=0;const energies=[];
 for(let second=0;second<40;second++){let power=0;for(let i=second*44100*2;i<(second+1)*44100*2;i++){const v=b.readInt16LE(44+i*2)/32768;peak=Math.max(peak,Math.abs(v));sum+=v*v;power+=v*v;if(i%2===0)stereo+=Math.abs(v-b.readInt16LE(46+i*2)/32768);}energies.push(power/88200);}
 assert.ok(peak>.5&&peak<.95);assert.ok(Math.sqrt(sum/samples)>.025);assert.ok(stereo>100);assert.ok(energies[39]<energies[10]*.1);assert.ok(Math.max(...energies)>Math.min(...energies.slice(2,30))*1.1);
});
test('music transport preserves paused position, clamps seek and supplies recording audio',async()=>{
 const code=fs.readFileSync(path.join(root,'hobbiton-music.js'),'utf8');const {HobbitonMusic}=await import('data:text/javascript;base64,'+Buffer.from(code.replace("new URL('./assets/hobbiton/hobbiton-pastoral.wav',import.meta.url)","new URL('https://example.invalid/music.wav')")).toString('base64'));
 const music=new HobbitonMusic();const sources=[];music.context={currentTime:10,createBufferSource(){const s={connect(){},disconnect(){},start(...args){this.args=args},stop(){this.stopped=true}};sources.push(s);return s;}};music.buffer={duration:40};music.master={gain:{setTargetAtTime(v){this.value=v}}};
 music.setEnabled(true);music.setVolume(2);assert.equal(music.level,1);music.start(5);music.context.currentTime=13;music.pause();assert.equal(music.offset,8);assert.ok(sources[0].stopped);music.start();assert.equal(sources[1].args[1],8);music.seek(39);assert.equal(music.offset,39);assert.ok(music.playing);music.seek(100);assert.equal(music.offset,40);assert.equal(music.playing,false);music.setEnabled(false);assert.equal(music.master.gain.value,0);
});
