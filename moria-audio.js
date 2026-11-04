// Original Web Audio sound design plus locally recorded, generic synthetic dialogue.
// No movie recording, actor voice clone, sampled score, or external audio service.
export const MORIA_CUES=Object.freeze([
 [1.2,'crackle'],[4,'roar'],[6.4,'whip'],[7,'clash'],[8.5,'crackle'],
 [9.7,'voice-shadow'],[12,'roar'],[13.4,'whip'],[14,'clash'],[17,'strike'],
 [19.1,'whip'],[19.7,'clash'],[21.5,'crackle'],[22.3,'voice-pass'],
 [25,'roar'],[26.2,'whip'],[26.8,'clash'],[28,'strike'],[30,'rumble']
].map(cue=>Object.freeze(cue)));
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export class MoriaAudio {
 constructor(){this.enabled=false;this.level=.55;this.location='west';this.playing=false;this.events=new Set();this.activeSources=new Map();this.voices=new Map();this.voiceErrors=[];}
 async initialize(){
  if(this.context){await this.context.resume();await this.ready;return;}
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)throw Error('Audio is unavailable in this browser.');
  const c=this.context=new Audio();
  this.master=c.createGain();this.master.gain.value=0;
  const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=18;limiter.ratio.value=8;limiter.attack.value=.005;limiter.release.value=.25;
  this.capture=c.createMediaStreamDestination();this.master.connect(limiter);limiter.connect(c.destination);limiter.connect(this.capture);
  this.fx=c.createGain();this.fx.gain.value=.76;this.fx.connect(this.master);
  const reverb=c.createConvolver(),impulse=c.createBuffer(2,c.sampleRate*3.4,c.sampleRate);
  for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3.5)*.24;}
  reverb.buffer=impulse;const wet=c.createGain();wet.gain.value=.22;this.fx.connect(reverb);reverb.connect(wet);wet.connect(this.master);
  this.ambient=c.createGain();this.ambient.gain.value=.24;this.ambient.connect(this.master);
  this.score=c.createGain();this.score.gain.value=.05;this.score.connect(this.ambient);
  this.noise=c.createBuffer(1,c.sampleRate*4,c.sampleRate);const data=this.noise.getChannelData(0);let brown=0;
  for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.025)/1.025;data[i]=brown*4.5;}
  this.whiteNoise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const white=this.whiteNoise.getChannelData(0);for(let i=0;i<white.length;i++)white[i]=Math.random()*2-1;
  const wind=c.createBufferSource();wind.buffer=this.noise;wind.loop=true;const low=c.createBiquadFilter();low.type='lowpass';low.frequency.value=280;wind.connect(low);low.connect(this.ambient);wind.start();
  // Slow, original low-register open fifths and a distant dissonant overtone.
  for(const [frequency,level]of [[36.71,.30],[55,.16],[73.42,.09],[155.56,.025]]){
   const tone=c.createOscillator(),gain=c.createGain();tone.type='sine';tone.frequency.value=frequency;gain.gain.value=level;tone.connect(gain);gain.connect(this.score);tone.start();
   const lfo=c.createOscillator(),depth=c.createGain();lfo.frequency.value=.025+frequency*.00012;depth.gain.value=frequency*.003;lfo.connect(depth);depth.connect(tone.frequency);lfo.start();
  }
  this.ready=Promise.all([
   ['voice-pass','gandalf-pass.wav'],['voice-shadow','gandalf-shadow.wav']
  ].map(async([key,file])=>{try{const response=await fetch(new URL(`./assets/moria/audio/${file}`,import.meta.url));if(!response.ok)throw Error(`${file}: ${response.status}`);const buffer=await c.decodeAudioData(await response.arrayBuffer());if(buffer.duration<.2)throw Error(`${file}: empty recording`);this.voices.set(key,buffer);}catch(error){this.voiceErrors.push(error.message);}}));
  this.updateAmbience();await c.resume();await this.ready;
 }
 async setEnabled(enabled){if(enabled)await this.initialize();this.enabled=Boolean(enabled);if(!enabled)this.stopTransients();this.applyVolume();}
 applyVolume(){if(this.context)this.master.gain.setTargetAtTime(this.enabled?this.level:0,this.context.currentTime,.07);}
 setVolume(value){this.level=clamp(Number(value)||0,0,1);this.applyVolume();}
 setLocation(location){if(this.location!==location)this.stopTransients();this.location=location;this.events.clear();this.updateAmbience();}
 setPlaying(playing){const next=Boolean(playing);if(this.playing===next)return;if(this.playing&&!next)this.stopTransients();this.playing=next;this.updateAmbience();}
 updateAmbience(){if(!this.context)return;const now=this.context.currentTime,bridge=this.location==='bridge';this.ambient.gain.setTargetAtTime(bridge?(this.playing?.68:.27):.2,now,.35);this.score.gain.setTargetAtTime(bridge?(this.playing?.72:.24):.04,now,.6);}
 track(source,gain,nodes=[]){
  this.activeSources.set(source,{gain,nodes});source.onended=()=>{const entry=this.activeSources.get(source);if(!entry)return;source.disconnect();for(const node of entry.nodes)node.disconnect();entry.gain.disconnect();this.activeSources.delete(source);};return source;
 }
 stopTransients(){
  if(!this.context)return;const now=this.context.currentTime;
  for(const[source,{gain}]of this.activeSources){gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(0,now,.012);try{source.stop(now+.06);}catch{}}
 }
 noiseBurst({duration=.5,frequency=500,endFrequency=100,level=.3,filterType='lowpass',q=.7,rate=1,white=false,attack=.035,delay=0}){
  const c=this.context,now=c.currentTime+delay,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
  source.buffer=white?this.whiteNoise:this.noise;source.loop=duration>source.buffer.duration;source.playbackRate.setValueAtTime(rate,now);source.playbackRate.exponentialRampToValueAtTime(Math.max(.2,rate*.6),now+duration);
  filter.type=filterType;filter.Q.value=q;filter.frequency.setValueAtTime(frequency,now);filter.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),now+duration);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+attack);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.connect(filter);filter.connect(gain);gain.connect(this.fx);this.track(source,gain,[filter]);source.start(now);source.stop(now+duration+.02);return {source,gain,filter};
 }
 tone({frequency=120,endFrequency=frequency,duration=1,level=.1,type='sine',delay=0,attack=.01,detune=0}){
  const c=this.context,now=c.currentTime+delay,source=c.createOscillator(),gain=c.createGain();source.type=type;source.frequency.setValueAtTime(frequency,now);source.frequency.exponentialRampToValueAtTime(Math.max(15,endFrequency),now+duration);source.detune.value=detune;
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+attack);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);source.connect(gain);gain.connect(this.fx);this.track(source,gain);source.start(now);source.stop(now+duration+.02);return {source,gain};
 }
 speak(type){
  const buffer=this.voices.get(type);if(!buffer)return;
  const c=this.context,now=c.currentTime,source=c.createBufferSource(),gain=c.createGain(),presence=c.createBiquadFilter();
  source.buffer=buffer;source.playbackRate.value=.96;presence.type='peaking';presence.frequency.value=1750;presence.Q.value=.7;presence.gain.value=2;
  gain.gain.setValueAtTime(.95,now);source.connect(presence);presence.connect(gain);gain.connect(this.fx);this.track(source,gain,[presence]);source.start();
 }
 effect(type){
  if(!this.context||!this.enabled)return;
  if(type.startsWith('voice-')){this.speak(type);return;}
  if(type==='roar'){
   // A low vocal growl, changing formants, turbulent breath, and rough subharmonics.
   this.noiseBurst({duration:3.35,frequency:650,endFrequency:115,level:.70,filterType:'bandpass',q:1.4,rate:.65,attack:.19});
   this.noiseBurst({duration:2.8,frequency:1600,endFrequency:260,level:.18,filterType:'bandpass',q:2,white:true,attack:.2});
   const {source,gain}=this.tone({frequency:104,endFrequency:38,duration:3.25,level:.16,type:'sawtooth',attack:.2});
   const c=this.context,lfo=c.createOscillator(),depth=c.createGain();lfo.frequency.setValueAtTime(23,c.currentTime);lfo.frequency.linearRampToValueAtTime(13,c.currentTime+3.2);depth.gain.value=.07;lfo.connect(depth);depth.connect(gain.gain);lfo.start();lfo.stop(c.currentTime+3.4);lfo.onended=()=>{lfo.disconnect();depth.disconnect();};
   this.tone({frequency:52,endFrequency:28,duration:3.5,level:.14,type:'sine',attack:.2});return;
  }
  if(type==='whip'){
   this.noiseBurst({duration:.7,frequency:220,endFrequency:4800,level:.38,filterType:'bandpass',q:1.3,white:true,attack:.2});
   this.noiseBurst({duration:.13,frequency:6500,endFrequency:1600,level:.72,white:true,attack:.003,delay:.55});
   this.tone({frequency:180,endFrequency:46,duration:.45,level:.1,delay:.56});return;
  }
  if(type==='clash'){
   this.noiseBurst({duration:.19,frequency:8500,endFrequency:1900,level:.48,white:true,attack:.002});
   for(const [frequency,level]of[[1247,.10],[1871,.07],[2663,.055],[3971,.025]])this.tone({frequency,endFrequency:frequency*.995,duration:1.4,level,type:'sine',attack:.002});
   this.tone({frequency:112,endFrequency:65,duration:.24,level:.09});return;
  }
  if(type==='strike'){
   this.noiseBurst({duration:2.1,frequency:3100,endFrequency:70,level:.64,white:true,attack:.003});
   this.tone({frequency:290,endFrequency:36,duration:2.4,level:.26});
   for(const frequency of[440,660,990])this.tone({frequency,duration:2.2,level:.055,attack:.005});return;
  }
  if(type==='rumble'){this.noiseBurst({duration:2,frequency:140,endFrequency:38,level:.55,rate:.5,attack:.25});this.tone({frequency:43,endFrequency:24,duration:2,level:.15,attack:.3});return;}
  this.noiseBurst({duration:.48,frequency:2100,endFrequency:450,level:.21,white:true,attack:.005});
 }
 tick(time,playing){
  this.setPlaying(playing);if(!playing||!this.enabled)return;
  for(const[at,type]of MORIA_CUES)if(time>=at&&!this.events.has(at)){this.events.add(at);if(time-at<.35)this.effect(type);}
 }
 seek(time){this.stopTransients();this.events=new Set(MORIA_CUES.filter(([at])=>at<=time).map(([at])=>at));}
 async suspend(){this.setPlaying(false);this.stopTransients();if(this.context)await this.context.suspend();}
}
