import {clamp} from './atlas-terrain.js';

// Bag End portrait reference: low photographic lens, warm grazing light,
// restrained greens and separated foreground / middle ground / horizon.
// These are live 3D settings, not projection of the portrait onto other places.
export function portraitQuality(profile){
 if(!profile?.name||profile.name==='Moria')return null;
 const cold=['snow','alpine'].includes(profile.biome),ash=profile.biome==='ash',cave=profile.kind==='cave',forest=profile.kind==='forest',arid=profile.biome==='arid';
 return Object.freeze({
  fov:profile.name==='Bag End'?35:forest?39:['city','fortress'].includes(profile.kind)?41:38,
  elevation:cave||ash?profile.sun.elevation:clamp(profile.sun.elevation*.70,.22,.44),
  sunColor:cold?0xffeedb:ash?0xffbd8d:0xffd8a4,
  sunIntensity:cave?2.25:ash?2.75:cold?2.95:3.55,
  environment:cave?.28:ash?.30:forest?.28:.24,
  fill:cave?.46:ash?.58:forest?.40:.30,
  exposure:ash?1.12:cold?.97:1.03,
  fog:ash?.00130:cave?.0024:forest?.00110:.00065,
  saturation:ash?.92:cold?.99:1.035,
  warmth:cold?.008:ash?.024:.028,
  occlusion:.46,bloom:ash?.095:.042,
  aerialDensity:cave?0:ash?.0015:arid?.00085:forest?.00070:.00050,
  aerialHeight:cold?105:ash?72:forest?42:64,
  aerialColor:cold?0xb5cbd8:ash?0xa18770:arid?0xd7c3a0:0xc0cbc0,
  sunShafts:cave?0:forest?.24:ash?.15:cold?.17:.20,
  microContrast:ash?.19:.17,
  specularScale:cold?1.28:ash?1.14:1.22,
  vignette:.085,
  foreground:!['snow','ash','arid'].includes(profile.biome),
 });
}

// Six composed shots for destinations without their own authored tour.
// Keep movement local to a landmark and delegate all ground clearance to terrain.
export function portraitTour(world,time){
 const p=world.profile,look=portraitQuality(p);if(!look)return null;
 const phase=(((time%40)+40)%40)/40*6,index=Math.floor(phase),t=phase-index;
 const smooth=t*t*t*(t*(t*6-15)+10);
 const landmarks=world.landmarks?.length?world.landmarks:[{position:p.camera.target}];
 const mark=landmarks[index%landmarks.length],nextMark=landmarks[(index+1)%landmarks.length];
 const base=mark?.position||p.camera.target,nextBase=nextMark?.position||base;
 const drift=smooth*.18;
 const tx=base[0]*(1-drift)+nextBase[0]*drift;
 const tz=base[2]*(1-drift)+nextBase[2]*drift;
 const ty=Math.max(base[1]*(1-drift)+nextBase[1]*drift,world.terrain.height(tx,tz)+2.5);
 const target=[tx,ty,tz];
 const wide=clamp(p.camera.distance,60,210),scales=[1,.60,.38,.70,.45,1.06];
 const distance=wide*scales[index]*(1-smooth*.09);
 const yaw=p.camera.yaw+[-.50,-.22,.34,.66,-.62,.22][index]+smooth*.15;
 const pitch=(['mountain','volcano'].includes(p.kind)?.22:index===2?.10:index===4?.13:.22)+Math.sin(smooth*Math.PI)*.025;
 return {eye:world.terrain.safeCamera(target,distance,yaw,pitch,1.65),target,chapter:['Establishing landscape','Approach through the landscape','Landmark study','Light and architecture','Surface and foreground','The wider world'][index]};
}
