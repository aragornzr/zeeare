import * as THREE from './assets/vendor/three.module.js';
import {PORTRAIT_SOURCE as SOURCE,PORTRAIT_LANDMARKS,portraitDepth,portraitPoint,portraitShot,portraitLimits} from './bag-end-portrait-layout.js';

// A textured 3D depth surface preserves the actual portrait's faces, materials and light.
// The constrained viewing envelope avoids claiming unseen sides of the photographed scene.
export class BagEndPortraitWorld{
 constructor(scene,profile,quality='high'){
  this.scene=scene;this.profile=profile;this.quality=quality;this.photoBased=true;this.isBagEnd=true;this.resources=[];this.buildings=1;this.trees=0;this.peopleCount=3;this.lastDistance=12;this.lastTarget=new THREE.Vector3(0,0,-12);this.wind={value:0};
  this.terrain={height:()=>-1000};
  this.landmarks=PORTRAIT_LANDMARKS.map(p=>({...p,position:portraitPoint(...p.uv)}));
  this.story={metadata:{names:['Bilbo Baggins','Gandalf the Grey','Frodo Baggins'],imageBased:true,presentation:'portrait depth scene',motion:'camera, parallax and ambience; portrait character poses'},bilbo:{group:new THREE.Object3D()},frodo:{group:new THREE.Object3D()},wizard:{group:new THREE.Object3D()}};
  for(const[name,uv]of[['bilbo',[.755,.505]],['frodo',[.435,.637]],['wizard',[.16,.69]]])this.story[name].group.position.set(...portraitPoint(...uv));
 }
 async build(){
  const texture=await new THREE.TextureLoader().loadAsync(SOURCE.path);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;this.texture=texture;this.resources.push(texture);
  const segments=this.quality==='4k'?320:this.quality==='high'?240:128,rows=Math.round(segments*9/16),geometry=new THREE.PlaneGeometry(1,1,segments,rows),p=geometry.attributes.position,uv=geometry.attributes.uv,wind=[];
  for(let i=0;i<p.count;i++){
   const u=uv.getX(i),v=1-uv.getY(i),point=portraitPoint(u,v);p.setXYZ(i,...point);
   const character=(u<.33&&v>.25)||(u>.35&&u<.51&&v>.42&&v<.85)||(u>.70&&u<.81&&v>.33&&v<.7);
   wind.push(!character&&(v<.2||u>.82&&v>.65||u<.33&&v>.4)?1:0);
  }
  geometry.setAttribute('aPortraitWind',new THREE.Float32BufferAttribute(wind,1));geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false,transparent:true,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
   shader.uniforms.uPortraitTime=this.wind;shader.vertexShader='attribute float aPortraitWind;uniform float uPortraitTime;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(uPortraitTime*.65+uv.x*19.+uv.y*7.)*aPortraitWind*.0025;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat portraitEdge=min(min(vMapUv.x,1.-vMapUv.x),min(vMapUv.y,1.-vMapUv.y));diffuseColor.a*=smoothstep(0.,.015,portraitEdge);');
  };material.customProgramCacheKey=()=> 'bag-end-original-portrait-depth-v1';
  this.terrainMesh=new THREE.Mesh(geometry,material);this.terrainMesh.name='Bag End original portrait depth surface';this.terrainMesh.frustumCulled=false;this.scene.add(this.terrainMesh);this.resources.push(geometry,material);
  this.scene.background=texture;this.scene.environment=null;this.scene.fog=null;
  this.makeSmoke([.742,.416],.65,.32);this.makeSmoke([.445,.151],1.3,.16);
  return this;
 }
 makeSmoke(uv,height,opacity){
  const points=[],phases=[];for(let i=0;i<25;i++){points.push(0,0,0);phases.push(i/25);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false,uniforms:{uTime:this.wind,uHeight:{value:height},uOpacity:{value:opacity}},vertexShader:`attribute float aPhase;uniform float uTime,uHeight;varying float vAge;void main(){float f=fract(aPhase+uTime*.10);vAge=f;vec3 p=position+vec3(sin(f*9.+aPhase*17.)*.025*f+.05*f,f*uHeight,0.);vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp((.018+f*.05)*1300./max(1.,-view.z),1.,32.);}`,fragmentShader:`uniform float uOpacity;varying float vAge;void main(){float alpha=(1.-smoothstep(.1,1.,length(gl_PointCoord-.5)*2.))*sin(vAge*3.14159)*uOpacity;gl_FragColor=vec4(vec3(.8,.8,.76),alpha);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
  const smoke=new THREE.Points(geometry,material);smoke.position.set(...portraitPoint(...uv));smoke.renderOrder=2;smoke.frustumCulled=false;this.scene.add(smoke);this.resources.push(geometry,material);this.smoke??=[];this.smoke.push(smoke);
 }
 render(renderer,camera,{mode,time,yaw,pitch,distance,target,motionTime=0,reduced=false}){
  const shot=mode==='cinematic'?portraitShot(time):null,limits=portraitLimits(yaw,pitch,distance);
  const center=shot?new THREE.Vector3(...portraitPoint(...shot.uv)):target.clone();
  const zoom=shot?shot.zoom:12/limits.distance;
  camera.fov=SOURCE.fov;camera.near=.05;camera.far=100;camera.zoom=zoom;camera.position.set(mode==='cinematic'?0:Math.sin(limits.yaw)*1.8,mode==='cinematic'?0:Math.sin(limits.pitch)*1.4,0);
  camera.lookAt(center);camera.updateProjectionMatrix();this.lastTarget.copy(center);this.lastDistance=12/zoom;this.wind.value=reduced?0:motionTime;
  this.texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
  const prior=renderer.toneMapping;try{renderer.toneMapping=THREE.NoToneMapping;renderer.setRenderTarget(null);renderer.render(this.scene,camera);}finally{renderer.toneMapping=prior;}
  return{target:center,chapter:shot?.title};
 }
 animate(){}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.remove(this.terrainMesh,...this.smoke||[]);for(const resource of this.resources)resource.dispose();this.resources=[];this.scene.background=null;}
}
