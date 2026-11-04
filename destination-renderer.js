import {THREE,RealismAssets} from './atlas-realism.js?v=bag-end-20261031';
import {DestinationWorld} from './destination-world.js?v=bag-end-20261031';
import {AtlasFinish} from './atlas-finish.js?v=bag-end-20261031';
import {graphicsLevel,renderSize,cinematicLighting} from './graphics-quality.js';
import {portraitQuality,portraitTour} from './portrait-quality.js';
import {clamp} from './atlas-terrain.js';
export class DestinationRenderer{
 constructor(canvas,onUpdate=()=>{}){
  this.canvas=canvas;this.onUpdate=onUpdate;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.finish=new AtlasFinish(this.renderer);this.assets=new RealismAssets(this.renderer,{portrait:true});this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(48,1,.25,14000);this.target=new THREE.Vector3(0,10,0);this.offset=new THREE.Vector3();this.active=true;this.playing=false;this.mode='cinematic';this.time=0;this.distance=130;this.pitch=.35;this.yaw=.4;this.maxSize=Math.min(this.renderer.capabilities.maxTextureSize,this.renderer.getContext().getParameter(this.renderer.getContext().MAX_RENDERBUFFER_SIZE));this.quality=innerWidth<650?'standard':innerWidth>=900&&this.maxSize>=3840?'4k':'high';this.userQuality=false;this.frame=0;this.last=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.points=[];this.events=new AbortController();this.setupControls();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
 }
 load(profile){const ticket=this.request=(this.request||0)+1;this.pending=(this.pending||Promise.resolve()).catch(()=>{}).then(()=>ticket===this.request?this.loadScene(profile):undefined);return this.pending;}
 async loadScene(profile){
  const serial=this.serial=(this.serial||0)+1;this.profile=profile;this.portraitLook=portraitQuality(profile);this.assets.portrait=Boolean(this.portraitLook);this.camera.fov=this.portraitLook?.fov||48;this.camera.updateProjectionMatrix();this.ready=false;this.playing=false;this.onUpdate({loading:true});const lighting={...cinematicLighting(profile),...this.portraitLook},budget=graphicsLevel(this.quality);this.renderer.toneMappingExposure=lighting.exposure;this.finish.configure(this.quality,lighting);await this.assets.initialize();if(this.portraitLook)await this.assets.preparePortrait();if(serial!==this.serial)return;
  this.world?.dispose();this.sun?.shadow.dispose();this.scene.clear();this.sky?.geometry.dispose();this.sky?.material.dispose();
  const {sky,sun,texture}=this.assets.environment(profile,this.portraitLook);this.sky=sky;this.scene.background=this.assets.maps.cloudSky;this.scene.backgroundIntensity=profile.biome==='ash'?.3:.8;this.scene.backgroundBlurriness=.015;if(this.portraitLook&&profile.kind!=='cave'){this.scene.add(sky);this.scene.background=new THREE.Color(profile.palette.sky);}this.scene.environment=texture;this.scene.environmentIntensity=lighting.environment;
  const dark=lighting.dark;this.scene.fog=new THREE.FogExp2(profile.name==='Hobbiton'?0x9daeb4:profile.palette.sky,lighting.fog);
  this.scene.add(new THREE.HemisphereLight(lighting.skyColor,lighting.groundColor,lighting.fill));
  this.sun=new THREE.DirectionalLight(lighting.sunColor,lighting.sunIntensity);this.sun.position.copy(sun).multiplyScalar(450);this.sun.castShadow=true;const shadowSize=Math.min(budget.shadowSize,this.maxSize);this.sun.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(this.sun.shadow.camera,{left:-160,right:160,top:160,bottom:-160,near:1,far:1000});this.sun.shadow.normalBias=this.portraitLook?.018:.055;this.sun.shadow.bias=this.portraitLook?-.000025:-.00006;this.sunDirection=sun.clone();this.scene.add(this.sun,this.sun.target);
  const World=profile.name==='Bag End'?(await import('./bag-end-world.js?v=bag-end-20261031')).BagEndWorld:profile.name==='Hobbiton'?(await import('./hobbiton-world.js?v=bag-end-20261031')).HobbitonWorld:profile.name==='Mordor'?(await import('./mordor-world.js?v=bag-end-20261031')).MordorWorld:DestinationWorld;const world=new World(this.scene,this.assets,profile,this.quality);world.sun=sun;this.world=world;await world.build();if(serial!==this.serial)return;
  this.ready=true;this.time=0;this.offset.set(0,0,0);this.reset();this.resize();this.onUpdate({loading:false,profile,quality:this.quality,landmarks:world.landmarks,stats:{buildings:world.buildings,trees:world.trees,people:world.peopleCount||0,cast:world.story?.metadata.names,vertices:world.terrainMesh.geometry.attributes.position.count}});this.start();this.render(performance.now());
 }
 setupControls(){
  const canvas=this.canvas,signal=this.events.signal;this.pointers=new Map();
  canvas.addEventListener('contextmenu',e=>e.preventDefault(),{signal});
  canvas.addEventListener('pointerdown',e=>{if(![0,2].includes(e.button))return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.setMode('explore');this.drag={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch,target:this.target.clone(),pan:e.shiftKey||e.button===2};if(this.pointers.size===2){const[a,b]=[...this.pointers.values()];this.pinch=Math.hypot(a.x-b.x,a.y-b.y);}},{signal});
  canvas.addEventListener('pointermove',e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===2){const[a,b]=[...this.pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(this.pinch)this.zoom(d/this.pinch);this.pinch=d;}else if(this.drag){const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(this.drag.pan){const factor=this.distance*.0018;this.target.copy(this.drag.target).add(new THREE.Vector3(-Math.cos(this.yaw)*dx*factor,0,Math.sin(this.yaw)*dx*factor-dy*factor));this.target.x=clamp(this.target.x,this.world?.isMordor?-920:-600,this.world?.isMordor?1000:600);this.target.z=clamp(this.target.z,this.world?.isMordor?-850:-600,this.world?.isMordor?950:600);this.target.y=Math.max(this.world?.terrain.height(this.target.x,this.target.z)+3||3,this.target.y);}else{this.yaw=this.drag.yaw-dx*.005;this.pitch=clamp(this.drag.pitch+dy*.004,.04,1.35);}}},{signal});
  for(const type of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{this.pointers.delete(e.pointerId);this.drag=null;this.pinch=null;},{signal});
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(-clamp(e.deltaY,-100,100)*.002));},{passive:false,signal});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home',' '].includes(e.key)){e.preventDefault();this.setMode('explore');}if(e.key==='ArrowLeft')this.yaw+=.08;if(e.key==='ArrowRight')this.yaw-=.08;if(e.key==='ArrowUp')this.pitch=clamp(this.pitch+.06,.04,1.35);if(e.key==='ArrowDown')this.pitch=clamp(this.pitch-.06,.04,1.35);if(e.key==='+'||e.key==='=')this.zoom(1.2);if(e.key==='-')this.zoom(1/1.2);if(e.key==='Home')this.reset();},{signal});
 }
 setMode(mode){if(mode==='explore'&&this.mode==='cinematic'&&this.lastRenderedTarget){this.target.copy(this.lastRenderedTarget);const delta=this.camera.position.clone().sub(this.target);this.distance=delta.length();this.yaw=Math.atan2(delta.x,delta.z);this.pitch=clamp(Math.asin(delta.y/this.distance),.04,1.35);}this.mode=mode;this.playing=false;this.onUpdate({mode,playing:false});}
 setPlaying(playing){this.playing=playing;this.mode='cinematic';this.onUpdate({mode:this.mode,playing});}
 zoom(factor){this.distance=clamp(this.distance/factor,8,this.world?.isMordor?1400:650);}
 reset(){if(!this.world)return;const p=this.profile.camera;this.target.set(...p.target);this.target.y=Math.max(this.world.terrain.height(this.target.x,this.target.z)+6,this.target.y);this.distance=p.distance;this.pitch=p.pitch;this.yaw=p.yaw;this.time=0;this.onUpdate({time:0});}
 focus(index){const point=this.world?.landmarks[index];if(!point)return;this.setMode('explore');this.target.set(...point.position);this.distance=point.distance|| (this.world.isHobbiton?(/hobbits|gardens/i.test(point.title)?8:/Bag End/.test(point.title)?18:/tree/.test(point.title)?36:24):clamp(this.profile.camera.distance*.5,30,100));this.pitch=this.world.isHobbiton?.16:.28;this.onUpdate({focus:point});}
 async setQuality(value){if(!['standard','high','4k'].includes(value)||!this.profile)return Promise.resolve();if(value==='4k')renderSize(value,1,1,1,this.maxSize);this.userQuality=true;this.quality=value;return this.load(this.profile);}
 resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;const size=renderSize(this.quality,r.width,r.height,devicePixelRatio||1,this.maxSize);this.renderer.setPixelRatio(size.pixelRatio);this.renderer.setSize(size.width,size.height,false);this.camera.aspect=size.width/size.height;this.camera.updateProjectionMatrix();const buffer=this.renderer.getDrawingBufferSize(new THREE.Vector2());this.finish.resize(buffer.x,buffer.y);this.onUpdate({quality:this.quality,resolution:{width:buffer.x,height:buffer.y}});}
 start(){if(this.active&&!this.frame){this.last=performance.now();this.frame=requestAnimationFrame(t=>this.loop(t));}}
 loop(t){this.frame=0;if(!this.active)return;const dt=Math.max(0,(t-this.last)/1000);this.last=t;if(this.ready){if(this.playing){this.time=(this.time+dt)%40;this.onUpdate({time:this.time});}this.render(t);}this.frame=requestAnimationFrame(time=>this.loop(time));}
 render(t){
  if(!this.ready)return;let yaw=this.yaw,pitch=this.pitch,distance=this.distance,target=this.target.clone();
  if(this.mode==='cinematic'){
   const phase=this.time/40*Math.PI*2;yaw+=Math.sin(phase)*.48;pitch+=Math.sin(phase*.5)*.08;distance*=1-Math.sin(phase*.5)*.18;
   if(this.playing&&!this.reduced.matches)target.y+=Math.sin(phase)*1.5;
  }
  let eye=this.world.terrain.safeCamera([target.x,target.y,target.z],distance,yaw,pitch,this.world.isHobbiton?.65:2);
  if(this.mode==='cinematic'){const shot=this.world.getCinematicCamera?.(this.time)||portraitTour(this.world,this.time);if(shot){target.copy(shot.target?.isVector3?shot.target:new THREE.Vector3(...shot.target));eye=shot.eye?.isVector3?shot.eye.toArray():shot.eye;this.onUpdate({chapter:shot.chapter});}}
  if(this.portraitLook){const delta=new THREE.Vector3(...eye).sub(target),length=Math.max(.01,delta.length());eye=this.world.terrain.safeCamera(target.toArray(),length,Math.atan2(delta.x,delta.z),Math.asin(clamp(delta.y/length,-1,1)),this.world.isHobbiton?1.25:1.6);}
  this.camera.position.set(...eye);this.camera.lookAt(target);{const span=this.world.isMordor?260:clamp((this.portraitLook?this.camera.position.distanceTo(target):distance)*.85,this.portraitLook?12:28,160);Object.assign(this.sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span});this.sun.shadow.camera.updateProjectionMatrix();}this.sun.target.position.copy(target);this.sun.position.copy(target).addScaledVector(this.sunDirection,450);
  if(this.portraitLook){const shadow=this.sun.shadow,span=shadow.camera.right,step=2*span/shadow.mapSize.x;
   const forward=this.sunDirection.clone().normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),forward).normalize(),up=new THREE.Vector3().crossVectors(forward,right);
   const shift=right.multiplyScalar(Math.round(target.dot(right)/step)*step-target.dot(right)).add(up.multiplyScalar(Math.round(target.dot(up)/step)*step-target.dot(up)));
   this.sun.target.position.add(shift);this.sun.position.add(shift);}
 this.lastRenderedTarget=target.clone();
  this.world.animate(this.reduced.matches&&!this.playing?0:t/1000,this.mode==='cinematic'?this.time:null);
  this.finish.render(this.scene,this.camera);
 }
 async capture4K(){
  if(!this.ready)throw Error('Wait for the destination to finish loading.');renderSize('4k',1,1,1,this.maxSize);
  const prior={quality:this.quality,active:this.active,playing:this.playing,mode:this.mode,time:this.time,target:this.target.clone(),distance:this.distance,pitch:this.pitch,yaw:this.yaw};
  const restoreCamera=()=>{this.mode=prior.mode;this.time=prior.time;this.target.copy(prior.target);this.distance=prior.distance;this.pitch=prior.pitch;this.yaw=prior.yaw;this.playing=prior.playing;};
  this.setActive(false);
  try{
   if(this.quality!=='4k'){this.quality='4k';await this.load(this.profile);}this.setActive(false);restoreCamera();this.resize();this.render(this.time*1000);
   return await new Promise((resolve,reject)=>this.canvas.toBlob(blob=>blob?resolve(blob):reject(Error('The 4K frame could not be saved.')),'image/png'));
  }finally{
   if(this.quality!==prior.quality){this.quality=prior.quality;await this.load(this.profile);}restoreCamera();this.resize();this.setActive(prior.active);this.onUpdate({quality:this.quality,mode:this.mode,playing:this.playing,time:this.time});
  }
 }
 setActive(active){this.active=active;if(!active){this.playing=false;if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.onUpdate({playing:false});}else this.start();}
 async dispose(){this.setActive(false);this.events.abort();this.resizeObserver.disconnect();this.world?.dispose();this.sky?.geometry.dispose();this.sky?.material.dispose();await this.assets.dispose();this.finish.dispose();this.renderer.dispose();}
}
