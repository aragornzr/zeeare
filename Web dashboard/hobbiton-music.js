// Original, sample-free pastoral score. Playback begins only after explicit user activation.
export const HOBBITON_MUSIC_URL=new URL('./assets/hobbiton/hobbiton-pastoral.wav',import.meta.url);
export class HobbitonMusic {
 constructor(){this.enabled=false;this.level=.65;this.playing=false;this.offset=0;this.source=null;}
 async initialize(){
  if(!this.context){
   const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
   if(!Audio)throw new Error('Audio playback is unavailable in this browser.');
   const c=this.context=new Audio();this.master=c.createGain();this.master.gain.value=this.enabled?this.level:0;
   this.capture=c.createMediaStreamDestination();this.master.connect(c.destination);this.master.connect(this.capture);
   this.ready=(async()=>{const response=await fetch(HOBBITON_MUSIC_URL);if(!response.ok)throw new Error(`Hobbiton music could not load (${response.status}).`);this.buffer=await c.decodeAudioData(await response.arrayBuffer());return this.buffer;})();
  }
  await this.context.resume();await this.ready;return this;
 }
 setEnabled(enabled){this.enabled=Boolean(enabled);this.applyVolume();}
 setVolume(value){this.level=Math.max(0,Math.min(1,Number(value)||0));this.applyVolume();}
 applyVolume(){if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.level:0,this.context.currentTime,.035);}
 get currentTime(){return this.playing?Math.min(this.buffer.duration,this.offset+this.context.currentTime-this.startedAt):this.offset;}
 start(offset=this.offset){
  if(!this.buffer)throw new Error('Initialize Hobbiton music before starting playback.');
  this.stopSource();this.offset=Math.max(0,Math.min(this.buffer.duration,Number(offset)||0));
  if(this.offset>=this.buffer.duration)return;
  const source=this.context.createBufferSource();source.buffer=this.buffer;source.connect(this.master);
  this.source=source;this.startedAt=this.context.currentTime;this.playing=true;
  source.onended=()=>{if(this.source===source){this.offset=this.buffer.duration;this.playing=false;this.source=null;}source.disconnect();};
  source.start(0,this.offset);
 }
 stopSource(){const source=this.source;this.source=null;if(source){source.onended=null;source.stop();source.disconnect();}this.playing=false;}
 pause(){const offset=this.currentTime;this.stopSource();this.offset=offset;}
 seek(seconds){const wasPlaying=this.playing;this.pause();this.offset=Math.max(0,Math.min(this.buffer?.duration||40,Number(seconds)||0));if(wasPlaying)this.start(this.offset);}
 async dispose(){this.pause();this.master?.disconnect();this.capture?.disconnect();await this.context?.close();this.context=null;this.buffer=null;this.ready=null;}
}
