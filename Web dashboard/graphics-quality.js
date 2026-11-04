// Shared rendering budgets for all 118 destinations.
export const GRAPHICS_LEVELS=Object.freeze({
 standard:Object.freeze({terrainSegments:180,shadowSize:1024,reflectionSize:256,pixelRatio:1,rocks:300,trees:240,grass:3000,detail:160,samples:0}),
 high:Object.freeze({terrainSegments:360,shadowSize:2048,reflectionSize:512,pixelRatio:2,rocks:850,trees:440,grass:18000,detail:480,samples:2}),
 '4k':Object.freeze({terrainSegments:540,shadowSize:4096,reflectionSize:1024,pixelRatio:1,rocks:1400,trees:560,grass:38000,detail:850,samples:4})
});
export function graphicsLevel(value){return GRAPHICS_LEVELS[value]||GRAPHICS_LEVELS.high;}
export function renderSize(quality,width,height,dpr=1,maxSize=Infinity){
 if(quality==='4k'){
  if(maxSize<3840)throw Error('This device cannot render a native 3840 × 2160 frame. Choose High detail.');
  return{width:3840,height:2160,pixelRatio:1};
 }
 const pixelRatio=Math.min(Math.max(1,dpr),graphicsLevel(quality).pixelRatio,maxSize/Math.max(1,width,height));
 return{width:Math.max(1,Math.round(width)),height:Math.max(1,Math.round(height)),pixelRatio};
}
export function cinematicLighting(profile){
 const cave=profile.kind==='cave',ash=profile.biome==='ash',snow=profile.biome==='snow',forest=profile.kind==='forest',warm=profile.biome==='arid',dark=cave||ash;
 return{
  dark,exposure:profile.name==='Bag End'?1.1:profile.name==='Mordor'?1.18:dark?1.12:snow?.92:1.02,environment:profile.name==='Bag End'?.8:profile.name==='Mordor'?.5:dark?.28:forest?.52:.65,
  sunColor:dark?0xffac78:warm?0xffd7a1:0xffebcd,sunIntensity:profile.name==='Mordor'?2.5:dark?2.1:snow?2.65:3.1,
  skyColor:dark?0x839eb5:0xc8e0f1,groundColor:dark?0x25252b:0x544b37,fill:profile.name==='Mordor'?.78:dark?.48:forest?.72:.62,
  fog:['Hobbiton','Bag End'].includes(profile.name)?.00165:profile.name==='Mordor'?.00135:cave?.0026:forest?.0018:.00115,
  saturation:ash?.9:snow?.97:1.025,bloom:dark?.14:.055,occlusion:dark?.36:.3,
  warmth:dark?.025:warm?.035:['Hobbiton','Bag End'].includes(profile.name)?.022:.008
 };
}
