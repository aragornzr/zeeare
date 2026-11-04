// Camera-space depth reconstruction from the authored portrait. Coordinates are image UVs.
export const PORTRAIT_SOURCE=Object.freeze({path:'assets/bag-end/bag-end-portrait.png',width:1672,height:941,aspect:16/9,fov:35});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const ellipse=(u,v,x,y,rx,ry)=>1-smooth(.72,1.08,Math.hypot((u-x)/rx,(v-y)/ry));
export function portraitDepth(u,v){
 let depth=28-(22*smooth(.28,1,v));
 const house=smooth(.39,.54,u)*smooth(.12,.3,v)*(1-smooth(.62,.76,v));depth=depth*(1-house)+12.5*house;
 const wizard=ellipse(u,v,.16,.69,.175,.48),frodo=ellipse(u,v,.435,.637,.082,.205),bilbo=ellipse(u,v,.755,.505,.05,.17);
 depth=depth*(1-wizard)+6.8*wizard;depth=depth*(1-frodo)+9.5*frodo;depth=depth*(1-bilbo)+12*bilbo;
 return clamp(depth,6,30);
}
export function portraitPoint(u,v,depth=portraitDepth(u,v)){
 const halfHeight=Math.tan(PORTRAIT_SOURCE.fov*Math.PI/360)*depth;
 return[(u-.5)*halfHeight*2*PORTRAIT_SOURCE.aspect,(.5-v)*halfHeight*2,-depth];
}
export const PORTRAIT_LANDMARKS=Object.freeze([
 {title:'Bag End · the portrait scene',uv:[.5,.5],distance:12,description:'Bilbo’s green-door home beneath the old oak, with the original portrait’s photographic detail.'},
 {title:'Bilbo · outside the green door',uv:[.756,.485],distance:8.8,description:'Bilbo’s portrait appearance, cigar and warm light at the doorway.'},
 {title:'Gandalf · at the garden gate',uv:[.19,.58],distance:9.4,description:'Gandalf’s textured grey cloak, long hair and wooden staff at the gate.'},
 {title:'Frodo · setting off',uv:[.435,.61],distance:8.8,description:'Frodo’s portrait appearance on the garden path.'},
 {title:'The wooded Hill & old oak',uv:[.67,.26],distance:9.5,description:'Living turf, mature trees and the wooded hillside behind Bag End.'},
 {title:'Flowers, stonework & the lane',uv:[.56,.72],distance:9.4,description:'Flowers, moss, weathered fencing and the curved stone path.'}
]);
export const PORTRAIT_SHOTS=Object.freeze([
 {time:0,uv:[.5,.5],zoom:1,title:'An afternoon at Bag End'},
 {time:8,uv:[.66,.47],zoom:1.22,title:'The green door & wooded Hill'},
 {time:16,uv:[.715,.49],zoom:1.42,title:'Bilbo by the doorstep'},
 {time:24,uv:[.45,.59],zoom:1.34,title:'Frodo on the garden path'},
 {time:32,uv:[.285,.57],zoom:1.24,title:'Gandalf at the gate'},
 {time:40,uv:[.5,.5],zoom:1,title:'Home beneath the old oak'}
]);
export function portraitShot(time){
 const t=clamp(Number.isFinite(time)?time:0,0,40),i=Math.min(PORTRAIT_SHOTS.length-2,Math.floor(t/8)),a=PORTRAIT_SHOTS[i],b=PORTRAIT_SHOTS[i+1],f=smooth(a.time,b.time,t);
 return{uv:[a.uv[0]+(b.uv[0]-a.uv[0])*f,a.uv[1]+(b.uv[1]-a.uv[1])*f],zoom:a.zoom+(b.zoom-a.zoom)*f,title:a.title};
}
export function portraitLimits(yaw,pitch,distance){return{yaw:clamp(yaw,-.07,.07),pitch:clamp(pitch,-.045,.045),distance:clamp(distance,5.5,12)};}
