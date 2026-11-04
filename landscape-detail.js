import {applyOrganicSurface} from './organic-surface.js';
import * as THREE from './assets/vendor/three.module.js';
import {graphicsLevel} from './graphics-quality.js';
import {randomOf,noise2} from './atlas-terrain.js';

// Seeded foreground dressing: true leaf, stem, pebble and deadwood geometry.
// Occupancy, slope and water checks preserve roads, foundations and village entrances.
export function addLandscapeDetail(world){
 const {profile:p,batch,terrain}=world,budget=graphicsLevel(world.quality),random=randomOf(p.seed^0x6e624eb7);
 const dry=['ash','arid','snow'].includes(p.biome),wet=['marsh','river','coast','lake'].includes(p.kind),forest=p.kind==='forest';
 const extent=world.isHobbiton?180:world.isMordor?1450:310,water=terrain.waterLevel??p.terrain.waterLevel;
 const allowed=(x,z)=>{
  const y=terrain.height(x,z),dx=(terrain.height(x+.35,z)-terrain.height(x-.35,z))/.7,dz=(terrain.height(x,z+.35)-terrain.height(x,z-.35))/.7;
  if(!Number.isFinite(y)||y<water+.16||Math.hypot(dx,dz)>1.45||world.groundOccupied(x,z))return null;
  if(world.smialPositions?.some(h=>Math.abs(x-h.x)<5.8&&z>h.z-8&&z<h.z+4))return null;
  return y;
 };
 const pebbles=Math.floor(budget.detail*(world.isHobbiton?.55:1));
 for(let i=0;i<pebbles;i++){
  const x=(random()-.5)*extent,z=(random()-.5)*extent,y=allowed(x,z);if(y===null)continue;
  const shore=Math.abs(y-water)<1.6,size=(shore?.08:.035)+random()*(shore?.28:.16);
  const mat=world.assets.material('rock',p.biome==='snow'?0xb1b8b8:p.biome==='arid'?0xc6b28e:p.biome==='ash'?0x625d59:0xb0ad9a);
  batch.add('rock',mat,[x,y+size*.12,z],[size*1.4,size*.43,size],[random(),random()*6.28,random()]);
 }
 const positions=[],colors=[],color=new THREE.Color();
 const triangle=(a,b,c,tint)=>{for(const point of[a,b,c]){positions.push(...point);color.set(tint);colors.push(color.r,color.g,color.b);}};
 const reed=wet&&!forest,arid=p.biome==='arid';
 if(!dry||arid){
  const leafColor=arid?0x89825b:forest?0x739954:reed?0x8c9d62:0x75935b;
  const fronds=reed?5:7;
  for(let f=0;f<fronds;f++){
   const a=f*2.399963,reach=reed?.15:.48,height=reed?.75:.32,ca=Math.cos(a),sa=Math.sin(a);
   for(let j=0;j<7;j++){
    const t=j/7,next=(j+1)/7,point=q=>[ca*reach*q,height*Math.sin(q*1.7),sa*reach*q];
    const b=point(t),tip=point(next);triangle(b,tip,[b[0]+.007,b[1],b[2]+.007],0x566b3e);
    for(const side of[-1,1]){
     const w=(1-t)*.12*(reed?.28:1),dx=-sa*w*side,dz=ca*w*side;
     const edge=[b[0]+dx,b[1]+.06,b[2]+dz],mid=[(b[0]+tip[0])*.5+dx*.35,(b[1]+tip[1])*.5+.035,(b[2]+tip[2])*.5+dz*.35];
     triangle(b,edge,mid,leafColor);triangle(edge,tip,mid,leafColor);triangle(tip,b,mid,0x667e48);
    }
   }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.87});
  const wind={value:0};m.onBeforeCompile=shader=>{shader.uniforms.uDetailWind=wind;shader.vertexShader='uniform float uDetailWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   #ifdef USE_INSTANCING
   vec2 root=instanceMatrix[3].xz;transformed.x+=sin(uDetailWind*1.25+root.x*.3+root.y*.19)*position.y*position.y*.075;
   #endif`);};m.customProgramCacheKey=()=> 'atlas-understory-wind-v1';applyOrganicSurface(m,'leaf');
  const count=Math.floor(budget.detail*(world.isHobbiton?.3:1)),mesh=new THREE.InstancedMesh(g,m,count),dummy=new THREE.Object3D();let used=0;
  for(let i=0;i<count*5&&used<count;i++){
   const x=(random()-.5)*extent,z=(random()-.5)*extent,y=allowed(x,z);if(y===null)continue;
   if(wet&&y>water+3)continue;
   if(world.isHobbiton&&typeof terrain.streamZ==='function'&&Math.abs(z-terrain.streamZ(x))<9)continue;
   if(noise2(x*.03,z*.03,p.seed)<.3)continue;
   dummy.position.set(x,y-.018,z);dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.setScalar(.65+random()*(forest?1.5:.7));dummy.updateMatrix();mesh.setMatrixAt(used++,dummy.matrix);
  }
  mesh.count=used;mesh.receiveShadow=true;mesh.computeBoundingSphere();world.scene.add(mesh);world.resources.push(mesh);world.detailMaterials=[...(world.detailMaterials||[]),m];world.animations.push(t=>wind.value=t);
 }
 if(forest||p.biome==='woodland')for(let i=0;i<(world.quality==='standard'?8:24);i++){
  const x=(random()-.5)*extent,z=(random()-.5)*extent,y=allowed(x,z);if(y===null)continue;
  const length=1.5+random()*2.8,radius=.12+random()*.15;
  batch.add('cylinder',world.wood,[x,y+radius*.65,z],[radius,length,radius],[Math.PI/2,random()*Math.PI,0]);
 }
 world.surfaceDetail={pebbles,understory:positions.length>0,biome:p.biome};
}
