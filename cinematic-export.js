// Offline, timestamped WebCodecs rendering: fixed cadence independent of live FPS.
import {Muxer,ArrayBufferTarget} from './assets/vendor/webm-muxer.mjs';
export async function renderCinematicWebM(renderer,{duration=40,fps=24,musicURL=null,onProgress=()=>{},width=3840,height=2160}={}){
 if(!globalThis.VideoEncoder||!globalThis.VideoFrame)throw Error('Offline film export requires a browser with WebCodecs.');
 if(!renderer?.ready)throw Error('Wait for the scene to finish loading.');
 if(width!==3840||height!==2160)throw Error('This exporter renders native 3840 × 2160 films.');
 if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(fps)||fps<1||fps>60)throw Error('Choose a positive duration and a frame rate between 1 and 60.');
 const supported=await VideoEncoder.isConfigSupported({codec:'vp09.00.50.08',width,height,bitrate:60000000,framerate:fps,latencyMode:'quality',alpha:'discard',bitrateMode:'variable'});
 if(!supported.supported)throw Error('This browser cannot encode the requested 4K film.');
 const prior={active:renderer.active,mode:renderer.mode,time:renderer.time,playing:renderer.playing,quality:renderer.quality,userQuality:renderer.userQuality,target:renderer.target.clone(),distance:renderer.distance,pitch:renderer.pitch,yaw:renderer.yaw};renderer.setActive(false);
 let failure=null,videoFrames=0,audio=null,audioContext=null,videoEncoder=null,audioEncoder=null;
 const waitQueue=async encoder=>{while(encoder.encodeQueueSize>2){if(failure)throw failure;await new Promise(resolve=>encoder.addEventListener('dequeue',resolve,{once:true}));}};
 try{
  if(renderer.quality!=='4k')await renderer.setQuality('4k');renderer.setActive(false);renderer.mode='cinematic';renderer.playing=true;
  if(musicURL){audioContext=new AudioContext();const response=await fetch(musicURL);if(!response.ok)throw Error('The original film music could not load.');const decoded=await audioContext.decodeAudioData(await response.arrayBuffer()),offline=new OfflineAudioContext(2,Math.ceil(duration*48000),48000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();audio=await offline.startRendering();await audioContext.close();}
  const target=new ArrayBufferTarget(),muxer=new Muxer({target,video:{codec:'V_VP9',width,height,frameRate:fps},...(audio?{audio:{codec:'A_OPUS',numberOfChannels:2,sampleRate:48000}}:{}),firstTimestampBehavior:'offset'});
  if(audio){audioEncoder=new AudioEncoder({output:(chunk,meta)=>muxer.addAudioChunk(chunk,meta),error:e=>failure=e});audioEncoder.configure({codec:'opus',sampleRate:48000,numberOfChannels:2,bitrate:128000});for(let offset=0;offset<audio.length;offset+=960){const count=Math.min(960,audio.length-offset),planar=new Float32Array(count*2);planar.set(audio.getChannelData(0).subarray(offset,offset+count));planar.set(audio.getChannelData(1).subarray(offset,offset+count),count);const sample=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:count,numberOfChannels:2,timestamp:Math.round(offset/48000*1e6),data:planar});audioEncoder.encode(sample);sample.close();await waitQueue(audioEncoder);}await audioEncoder.flush();if(failure)throw failure;}
  videoEncoder=new VideoEncoder({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:e=>failure=e});videoEncoder.configure(supported.config);
  const frames=Math.round(duration*fps);for(let i=0;i<frames;i++){if(failure)throw failure;renderer.time=i/fps;renderer.render(i/fps*1000);const frame=new VideoFrame(renderer.canvas,{timestamp:Math.round(i/fps*1e6),duration:Math.round(1e6/fps),alpha:'discard'});videoEncoder.encode(frame,{keyFrame:i%(fps*2)===0});frame.close();videoFrames++;await waitQueue(videoEncoder);if(i%12===0){onProgress({frame:i,total:frames,percent:i/frames*100});await new Promise(resolve=>setTimeout(resolve,0));}}
  await videoEncoder.flush();if(failure)throw failure;muxer.finalize();onProgress({frame:frames,total:frames,percent:100});return{blob:new Blob([target.buffer],{type:'video/webm'}),metadata:{width,height,fps,duration,videoFrames,requestedBitrate:60000000,codec:'VP9',audio:Boolean(audio),audioSampleRate:audio?48000:null}};
 }finally{
  if(videoEncoder?.state!=='closed')videoEncoder?.close();if(audioEncoder?.state!=='closed')audioEncoder?.close();if(audioContext&&audioContext.state!=='closed')await audioContext.close();
  if(renderer.quality!==prior.quality)await renderer.setQuality(prior.quality);renderer.setActive(false);renderer.userQuality=prior.userQuality;renderer.mode=prior.mode;renderer.time=prior.time;renderer.target.copy(prior.target);renderer.distance=prior.distance;renderer.pitch=prior.pitch;renderer.yaw=prior.yaw;renderer.setActive(prior.active);renderer.playing=prior.playing;renderer.onUpdate({quality:renderer.quality,mode:renderer.mode,playing:renderer.playing,time:renderer.time});
 }
}
