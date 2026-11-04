import * as THREE from './assets/vendor/three.module.js';
// Both resolutions meet the same coarse edge samples, avoiding cracks at terrain LOD seams.
export function terrainGeometry(terrain,{size,segments,cutout=0,edgeStep=0}){
 const g=new THREE.PlaneGeometry(size,size,segments,segments);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv,half=size/2;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i);let y=terrain.height(x,z);
  if(edgeStep&&(Math.abs(Math.abs(x)-half)<.001||Math.abs(Math.abs(z)-half)<.001)){
   const onX=Math.abs(Math.abs(x)-half)<.001,t=onX?z:x,a=Math.floor(t/edgeStep)*edgeStep,f=(t-a)/edgeStep;
   y=onX?THREE.MathUtils.lerp(terrain.height(x,a),terrain.height(x,a+edgeStep),f):THREE.MathUtils.lerp(terrain.height(a,z),terrain.height(a+edgeStep,z),f);
  }
  p.setY(i,y);uv.setXY(i,x*.1,z*.1);
 }
 if(cutout){const old=g.index.array,indices=[];for(let i=0;i<old.length;i+=3){const a=old[i],b=old[i+1],c=old[i+2],x=(p.getX(a)+p.getX(b)+p.getX(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;if(Math.abs(x)>=cutout||Math.abs(z)>=cutout)indices.push(a,b,c);}g.setIndex(indices);}
 g.computeVertexNormals();return g;
}
