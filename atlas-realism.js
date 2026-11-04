import * as THREE from './assets/vendor/three.module.js';
import { Sky } from './assets/vendor/Sky.js';
import { clamp, fbm, noise2, seedOf } from './atlas-terrain.js';
import {applyOrganicSurface} from './organic-surface.js';
import {applyWorldSurface} from './surface-shader.js';
export { THREE };
export class RealismAssets{
 constructor(renderer,{portrait=false}={}){this.portrait=portrait;this.renderer=renderer;this.textures=new Map();this.materials=new Map();this.environments=new Map();this.loader=new THREE.TextureLoader();}
 async texture(path,{repeat=1,srgb=true}={}){const key=path+':'+repeat+':'+srgb;if(this.textures.has(key))return this.textures.get(key);const promise=this.loader.loadAsync(path).then(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=Math.min(16,this.renderer.capabilities.getMaxAnisotropy());return t;});this.textures.set(key,promise);return promise;}
 async initialize(){
 if(this.ready)return this.ready;
 this.ready=(async()=>{const [grass,grassN,rock,rockN,stone,stoneN,roof,roofN,bark,barkN,dirt,dirtN,leaves,cloudSky,stoneR,roofR,grassR,rockR,barkR,dirtR]=await Promise.all([
  this.texture('assets/materials/aerial_grass_rock_diff_4k.jpg'),this.texture('assets/materials/aerial_grass_rock_nor_gl_4k.jpg',{srgb:false}),
  this.texture('assets/realism/rock_face_03_diff.jpg'),this.texture('assets/realism/rock_face_03_nor_gl.jpg',{srgb:false}),
  this.texture('assets/materials/castle_brick_01_diff_4k.jpg'),this.texture('assets/materials/castle_brick_01_nor_gl_4k.jpg',{srgb:false}),
  this.texture('assets/materials/roof_slates_02_diff_4k.jpg'),this.texture('assets/materials/roof_slates_02_nor_gl_4k.jpg',{srgb:false}),
  this.texture('assets/realism/bark_brown_01_diff.jpg'),this.texture('assets/realism/bark_brown_01_nor_gl.jpg',{srgb:false}),
  this.texture('assets/realism/brown_mud_leaves_01_diff.jpg'),this.texture('assets/realism/brown_mud_leaves_01_nor_gl.jpg',{srgb:false}),
  this.texture('assets/realism/canopy.png'),this.texture('assets/realism/cloud-sky.jpg'),
  ...['stone','roof','grass','rock','bark','dirt'].map(name=>this.texture('assets/realism/pbr/'+name+'-roughness.jpg',{srgb:false}))]);
 cloudSky.mapping=THREE.EquirectangularReflectionMapping;this.maps={grass,grassN,rock,rockN,stone,stoneN,roof,roofN,bark,barkN,dirt,dirtN,leaves,cloudSky,stoneR,roofR,grassR,rockR,barkR,dirtR};})();return this.ready;
 }
 async preparePortrait(){
  if(this.portraitReady)return this.portraitReady;
  this.portraitReady=(async()=>{const names=['wood_planks','plastered_wall'],sets=await Promise.all(names.map(async name=>Promise.all(['diff','nor_gl','rough'].map((suffix,i)=>this.texture('assets/hobbiton/materials/'+name+'_'+suffix+'.jpg',{srgb:i===0})))));
   [this.maps.timber,this.maps.plaster]=sets.map(([map,normalMap,roughnessMap])=>({map,normalMap,roughnessMap}));
  })();return this.portraitReady;
 }
 material(type,color=0xffffff){const key=type+':'+color+':'+this.portrait;if(this.materials.has(key))return this.materials.get(key);const m=this.maps;
 const spec={timber:{...m.timber,roughness:.81},plaster:{...m.plaster,roughness:.93},stone:{map:m.stone,normalMap:m.stoneN,roughnessMap:m.stoneR,roughness:.90},rock:{map:m.rock,normalMap:m.rockN,roughnessMap:m.rockR,roughness:.92},roof:{map:m.roof,normalMap:m.roofN,roughnessMap:m.roofR,roughness:.74},wood:{map:m.bark,normalMap:m.barkN,roughnessMap:m.barkR,roughness:.89},earth:{map:m.dirt,normalMap:m.dirtN,roughnessMap:m.dirtR,roughness:.96},grass:{map:m.grass,normalMap:m.grassN,roughnessMap:m.grassR,roughness:.94},leaf:{map:m.leaves,alphaTest:.32,side:THREE.DoubleSide,roughness:.86,transparent:false},metal:{metalness:.76,roughness:.38},window:{color:0x17272f,metalness:.48,roughness:.18},glow:{emissive:color,emissiveIntensity:2.2,roughness:.55}}[type]||{roughness:.9};
 const material=new THREE.MeshStandardMaterial({color,...spec});
 if(['stone','rock','roof','wood','earth','grass','timber','plaster'].includes(type)){
  applyWorldSurface(material,type,type==='timber'?.32:type==='plaster'?.45:type==='wood'?.6:type==='earth'?.32:type==='roof'?.65:type==='grass'?.24:.38,{weathered:this.portrait});
 }
 if(type==='leaf')applyOrganicSurface(material,'leaf');
 this.materials.set(key,material);return material;
 }
 terrainMaterial(profile,maps=this.maps){
 const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92}),p=profile.palette;
 mat.onBeforeCompile=shader=>{
 Object.assign(shader.uniforms,{uGrass:{value:maps.grass},uCliff:{value:maps.rock},uEarth:{value:maps.dirt},uGrassNormal:{value:maps.grassN},uCliffNormal:{value:maps.rockN},uEarthNormal:{value:maps.dirtN},uGroundColor:{value:new THREE.Color(p.ground)},uRockColor:{value:new THREE.Color(p.rock)},uSnowLine:{value:profile.biome==='snow'?15:profile.biome==='alpine'?95:9999},uWaterLevel:{value:profile.terrain?.waterLevel??-100},uDry:{value:['arid','ash'].includes(profile.biome)?1:0},uForest:{value:profile.kind==='forest'?1:0},uGrassRough:{value:maps.grassR},uCliffRough:{value:maps.rockR},uEarthRough:{value:maps.dirtR},uLushMeadow:{value:['Hobbiton','Bag End'].includes(profile.name)?1:0}});
 shader.vertexShader='varying vec3 vAtlasWorld; varying vec3 vAtlasNormal;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAtlasWorld=(modelMatrix*vec4(transformed,1.)).xyz;vAtlasNormal=normalize(mat3(modelMatrix)*normal);');
 shader.fragmentShader=`varying vec3 vAtlasWorld;varying vec3 vAtlasNormal;
 uniform sampler2D uGrass,uCliff,uEarth,uGrassNormal,uCliffNormal,uEarthNormal,uGrassRough,uCliffRough,uEarthRough;
 uniform vec3 uGroundColor,uRockColor;uniform float uSnowLine,uWaterLevel,uDry,uForest,uLushMeadow;
 float atlasNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);vec4 h=fract(sin(vec4(dot(i,vec2(127.1,311.7)),dot(i+vec2(1,0),vec2(127.1,311.7)),dot(i+vec2(0,1),vec2(127.1,311.7)),dot(i+vec2(1,1),vec2(127.1,311.7))))*43758.5453);return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);}
 vec3 atlasSurface(sampler2D tex,vec2 uv){vec3 a=texture2D(tex,uv).rgb;vec3 b=texture2D(tex,mat2(.8,-.6,.6,.8)*uv*.47+vec2(.37,.61)).rgb;return mix(a,b,.34);}
 `+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 atlasN=normalize(vAtlasNormal),w=pow(abs(atlasN),vec3(5.));w/=max(.001,w.x+w.y+w.z);
 vec3 stone=atlasSurface(uCliff,vAtlasWorld.zy*.12)*w.x+atlasSurface(uCliff,vAtlasWorld.xz*.12)*w.y+atlasSurface(uCliff,vAtlasWorld.xy*.12)*w.z;
 float strata=.92+.14*sin(vAtlasWorld.y*.55+atlasNoise(vAtlasWorld.xz*.07)*2.2);
 stone*=strata;
 vec3 grass=atlasSurface(uGrass,vAtlasWorld.xz*.24),earth=atlasSurface(uEarth,vAtlasWorld.xz*.28);
 float slope=smoothstep(.17,.56,1.-abs(atlasN.y));float macro=atlasNoise(vAtlasWorld.xz*.018),groundVariation=atlasNoise(vAtlasWorld.xz*.085);
 float earthMix=clamp(smoothstep(.46,.84,groundVariation)*.46+uForest*.32+uDry*.8,0.,1.);
 vec3 meadow=grass*mix(vec3(.72,.85,.54),uGroundColor*1.75,.42);meadow*=mix(.78,1.13,macro);
 float meadowDistance=smoothstep(140.,650.,distance(cameraPosition,vAtlasWorld));meadow=mix(meadow,uGroundColor*(.52+macro*.28),meadowDistance*.88);
 vec3 ground=mix(meadow,earth*mix(vec3(.83,.76,.59),uGroundColor*1.6,uDry),earthMix);
 float meadowLuma=dot(meadow,vec3(.2126,.7152,.0722));vec3 lushMeadow=mix(meadow,vec3(meadowLuma*.83,meadowLuma*1.19,meadowLuma*.62),.38);ground=mix(ground,mix(lushMeadow,earth*.8,earthMix*.28),uLushMeadow);
 float riparian=smoothstep(2.4,-.2,vAtlasWorld.y-uWaterLevel)*(1.-uDry);
 ground=mix(ground,earth*vec3(.56,.52,.44),riparian*.55);
 vec3 surface=mix(ground,stone*mix(vec3(.84),uRockColor*1.65,.62),slope);
 float snow=smoothstep(uSnowLine-12.,uSnowLine+15.,vAtlasWorld.y)*smoothstep(.45,.85,atlasN.y);surface=mix(surface,vec3(.84,.89,.93),snow);
 diffuseColor.rgb*=surface;`);
 // World-space normal projections follow cliffs instead of stretching a flat grass normal up their sides.
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`vec3 gn=texture2D(uGrassNormal,vAtlasWorld.xz*.24).xyz*2.-1.;vec3 en=texture2D(uEarthNormal,vAtlasWorld.xz*.28).xyz*2.-1.;vec3 detailN=mix(gn,en,earthMix);
 vec3 nx=texture2D(uCliffNormal,vAtlasWorld.zy*.12).xyz*2.-1.,ny=texture2D(uCliffNormal,vAtlasWorld.xz*.12).xyz*2.-1.,nz=texture2D(uCliffNormal,vAtlasWorld.xy*.12).xyz*2.-1.;
 vec3 cliffDetail=vec3(0.,nx.y,nx.x)*w.x+vec3(ny.x,0.,ny.y)*w.y+vec3(nz.x,nz.y,0.)*w.z;
 vec3 worldDetail=mix(vec3(detailN.x,0.,detailN.y)*.52,cliffDetail*.76,slope)*(1.-snow*.85);
 float atlasFootprint=max(length(dFdx(vAtlasWorld.xz*.28)),length(dFdy(vAtlasWorld.xz*.28)));
 float atlasRelief=1.-smoothstep(.025,.32,atlasFootprint);
 normal=normalize(mat3(viewMatrix)*normalize(atlasN+worldDetail*atlasRelief));`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat soilR=mix(texture2D(uGrassRough,vAtlasWorld.xz*.24).g,texture2D(uEarthRough,vAtlasWorld.xz*.28).g,earthMix);float cliffR=texture2D(uCliffRough,vAtlasWorld.zy*.12).g*w.x+texture2D(uCliffRough,vAtlasWorld.xz*.12).g*w.y+texture2D(uCliffRough,vAtlasWorld.xy*.12).g*w.z;float damp=(1.-smoothstep(1.,5.,vAtlasWorld.y))*uForest+riparian*.35;roughnessFactor=clamp(mix(.54+soilR*.43,.40+cliffR*.5,slope)-damp*.18,.28,1.);');
 };mat.customProgramCacheKey=()=>`atlas-terrain-v6-${profile.biome}-${profile.kind}-${profile.name==='Hobbiton'}`;return mat;
 }
 environment(profile,portrait=null){
 const dark=['ash'].includes(profile.biome)||profile.kind==='cave',key=(portrait?'portrait-'+profile.name+'-':'')+(dark?'dark':profile.biome==='snow'?'snow':(profile.sun?.elevation??.5)<.26?'evening':'day');
 const sky=new Sky();sky.scale.setScalar(12000);const u=sky.material.uniforms;u.turbidity.value=dark?9:3.4;u.rayleigh.value=dark?.7:1.75;u.mieCoefficient.value=.0055;u.mieDirectionalG.value=.84;
 const elevation=dark?5:clamp((portrait?.elevation??profile.sun?.elevation??.5)*180/Math.PI,4,65),azimuth=(profile.sun?.azimuth??-.7)*180/Math.PI;
 const sun=new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(90-elevation),THREE.MathUtils.degToRad(azimuth));u.sunPosition.value.copy(sun);
 if(portrait)for(const [old,value]of this.environments)if(old.startsWith('portrait-')&&old!==key){value.dispose();this.environments.delete(old);}
 if(!this.environments.has(key)){const pmrem=new THREE.PMREMGenerator(this.renderer);const scene=new THREE.Scene();scene.add(sky);const target=dark||portrait?pmrem.fromScene(scene,.03):pmrem.fromEquirectangular(this.maps.cloudSky);this.environments.set(key,target);pmrem.dispose();scene.remove(sky);}
 return{sky,sun,texture:this.environments.get(key).texture};
 }
 async dispose(){for(const p of this.textures.values())(await p).dispose();for(const m of this.materials.values())m.dispose();for(const e of this.environments.values())e.dispose();}
}
// One instanced draw per primitive/material combination, including close-range trim.
export class ArchitectureBatch{
 constructor(scene,assets,quality='high'){this.quality=quality;this.scene=scene;this.assets=assets;this.batches=new Map();this.geometries=new Map();this.resources=[];this.dummy=new THREE.Object3D();}
 geometry(type){if(this.geometries.has(type))return this.geometries.get(type);let g;
 if(type==='box'){
  g=new THREE.BoxGeometry(1,1,1,this.quality==='standard'?1:3,this.quality==='standard'?1:3,this.quality==='standard'?1:3);
  if(this.quality!=='standard'){const p=g.attributes.position,v=new THREE.Vector3(),core=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);core.copy(v).clampScalar(-.475,.475);v.sub(core).normalize().multiplyScalar(.025).add(core);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();}
 }
 else if(type==='sphere')g=new THREE.SphereGeometry(1,this.quality==='standard'?12:28,this.quality==='standard'?8:18);
 else if(type==='rock'){g=new THREE.IcosahedronGeometry(1,this.quality==='standard'?2:3);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=.84+noise2(x*3.2+y,z*3.2,13)*.32;p.setXYZ(i,x*f,y*f,z*f);}g.computeVertexNormals();}
 else if(type==='cylinder')g=new THREE.CylinderGeometry(1,1,1,this.quality==='standard'?14:36);
 else if(type==='cone')g=new THREE.ConeGeometry(1,1,this.quality==='standard'?14:36);
 else if(type==='leaf')g=new THREE.PlaneGeometry(1,1);
 else if(type==='ring'){g=new THREE.TorusGeometry(1,.1,10,48);}
 else if(type==='arch'){g=new THREE.TorusGeometry(1,.12,10,48,Math.PI);}
 else if(type==='elven-roof'){const shape=new THREE.Shape();shape.moveTo(-.5,0);shape.quadraticCurveTo(-.24,.02,0,.65);shape.quadraticCurveTo(.24,.02,.5,0);shape.quadraticCurveTo(.2,-.04,0,.56);shape.quadraticCurveTo(-.2,-.04,-.5,0);g=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});g.translate(0,0,-.5);}
 else if(type==='roof'){
  const shape=new THREE.Shape();shape.moveTo(-.5,0);shape.lineTo(0,.5);shape.lineTo(.5,0);shape.closePath();g=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});g.translate(0,0,-.5);
 }else throw Error('Unknown geometry '+type);this.geometries.set(type,g);return g;}
 add(type,material,position,scale=[1,1,1],rotation=[0,0,0]){const key=type+':'+material.uuid;let batch=this.batches.get(key);if(!batch){batch={type,material,instances:[]};this.batches.set(key,batch);}batch.instances.push({position,scale,rotation});}
 box(x,y,z,w,h,d,material,angle=0){this.add('box',material,[x,y+h/2,z],[w,h,d],[0,angle,0]);}
 cylinder(x,y,z,r,h,material){this.add('cylinder',material,[x,y+h/2,z],[r,h,r]);}
 commit(){for(const batch of this.batches.values()){const mesh=new THREE.InstancedMesh(this.geometry(batch.type),batch.material,batch.instances.length);for(const [i,t]of batch.instances.entries()){this.dummy.position.set(...t.position);this.dummy.scale.set(...t.scale);this.dummy.rotation.set(...t.rotation);this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix);}mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();this.scene.add(mesh);this.resources.push(mesh);}return this.resources;}
 dispose(){for(const m of this.resources){this.scene.remove(m);m.dispose();}for(const g of this.geometries.values())g.dispose();this.batches.clear();}
}
