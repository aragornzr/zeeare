import * as THREE from './assets/vendor/three.module.js';
import {battlePose,hallChasePose} from './moria-battle.js';
import {createHallOfDurinScene} from './moria-fellowship.js';
import {RealismAssets} from './atlas-realism.js';
import {AtlasFinish} from './atlas-finish.js?v=20261031-cinematic';
import {graphicsLevel,cinematicLighting,renderSize} from './graphics-quality.js';
import {fbm,noise2} from './atlas-terrain.js';
import {Water} from './assets/vendor/Water.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(i)=>{const n=Math.sin(i*127.1+31.7)*43758.5453;return n-Math.floor(n);};
export class MoriaLandscape {
 constructor(canvas,onEnter){
  this.canvas=canvas;this.onEnter=onEnter;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.16;
  this.quality=innerWidth>=900&&this.renderer.capabilities.maxTextureSize>=3840?'4k':innerWidth<650?'standard':'high';this.realism=new RealismAssets(this.renderer,{portrait:true});this.finish=new AtlasFinish(this.renderer);this.camera=new THREE.PerspectiveCamera(42,1,.2,750);this.scene=new THREE.Scene();this.textures=new Map();this.resources=new Set();this.location=null;this.gates=[];this.pointer=new THREE.Vector2();this.ray=new THREE.Raycaster();
  this.target=new THREE.Vector3(0,3.2,4.5);this.yaw=0;this.pitch=.16;this.distance=22;this.pointers=new Map();this.hallScene=null;
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.drag={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch};this.moved=false;if(this.pointers.size===2){const[a,b]=[...this.pointers.values()];this.pinch=Math.hypot(a.x-b.x,a.y-b.y);}});
  canvas.addEventListener('pointermove',e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===2){const[a,b]=[...this.pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(this.pinch)this.zoom(d/this.pinch);this.pinch=d;this.moved=true;}else if(this.drag){const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;this.yaw=clamp(this.drag.yaw-dx*.006,-1.45,1.45);this.pitch=clamp(this.drag.pitch+dy*.004,-.06,1);if(Math.hypot(dx,dy)>5)this.moved=true;}});
  canvas.addEventListener('pointerup',e=>{if(!this.moved&&!this.isInterior()){const r=canvas.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);if(this.ray.intersectObjects(this.gates,true).length)this.onEnter();}this.pointers.delete(e.pointerId);this.drag=null;this.pinch=null;});
  for(const type of['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{this.pointers.delete(e.pointerId);this.drag=null;this.pinch=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(-clamp(e.deltaY,-100,100)*.002));},{passive:false});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Enter'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')this.yaw=clamp(this.yaw+.08,-1.45,1.45);if(e.key==='ArrowRight')this.yaw=clamp(this.yaw-.08,-1.45,1.45);if(e.key==='ArrowUp')this.pitch=clamp(this.pitch+.07,-.06,1);if(e.key==='ArrowDown')this.pitch=clamp(this.pitch-.07,-.06,1);if(e.key==='+'||e.key==='=')this.zoom(1.2);if(e.key==='-')this.zoom(1/1.2);if(e.key==='Enter'&&!this.isInterior())this.onEnter();});
 }
 isInterior(loc=this.location){return loc==='hall'||loc==='chase'||loc==='bridge';}
 isHall(loc=this.location){return loc==='hall'||loc==='chase';}
 async texture(name,repeat=1){
  const key=`${name}:${repeat}`;if(this.textures.has(key))return this.textures.get(key);
  const t=await new THREE.TextureLoader().loadAsync(`assets/materials/${name}.jpg`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);if(name.includes('diff'))t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.textures.set(key,t);return t;
 }
 async load(location){
  if(this.location===location)return;
  const serial=this.serial=(this.serial||0)+1;
  await this.realism.initialize();await this.realism.preparePortrait();
  this.flameTexture=await this.realism.texture('assets/realism/flame.png');
  const interior=this.isInterior(location);
  if(this.isHall(location)){
   [this.hallExploreImage,this.hallChaseImage]=await Promise.all([
    this.realism.texture('assets/moria/hall-of-durin.jpg'),
    this.realism.texture('assets/moria/hall-goblin-chase.jpg')
   ]);
  }else if(location==='bridge'){
   [this.balrogImage,this.gandalfImage]=await Promise.all([
    this.realism.texture('assets/moria/balrog-character.png'),
    this.realism.texture('assets/moria/gandalf-character.png')
   ]);
  }
  this.waterNormal=await this.realism.texture('assets/realism/water-normal.jpg',{srgb:false});
  if(serial!==this.serial)return;
  this.clear();
  const baseLight=cinematicLighting({biome:interior?'ash':'alpine',kind:interior?'cave':'mountain'});
  this.finish.configure(this.quality,{
   ...baseLight,
   bloom:.24,
   bloomThreshold:.68,
   contrast:1.12,
   saturation:1.1,
   warmth:.05,
   sunShafts:.22,
   microContrast:.22,
   vignette:.2
  });
  this.location=location;this.gates=[];this.flames=[];this.lights=[];
  this.stone=this.realism.material('stone',0x777c80);
  this.rock=this.realism.material('rock',0x687074);
  this.dark=this.track(new THREE.MeshStandardMaterial({color:0x080e12,roughness:1}));
  this.metal=this.track(new THREE.MeshStandardMaterial({color:0x8aa7b7,metalness:.68,roughness:.36}));
  this.scene.background=new THREE.Color(interior?0x05070b:location==='west'?0x182b42:0x738a96);
  this.scene.fog=new THREE.FogExp2(interior?0x080b11:location==='west'?0x253a50:0x7e929b,interior?.0065:.006);
  const env=this.realism.environment({biome:interior?'ash':'alpine',kind:interior?'cave':'mountain',sun:{elevation:location==='west'?.12:.48,azimuth:-.7}});this.scene.environment=env.texture;this.scene.environmentIntensity=interior?.24:location==='west'?.35:.6;env.sky.geometry.dispose();env.sky.material.dispose();
  if(!interior){this.scene.background=this.realism.maps.cloudSky;this.scene.backgroundIntensity=location==='west'?.18:.8;}
  this.scene.add(new THREE.HemisphereLight(interior?0x6884a8:0xa9c9e9,0x1a130e,interior?.42:location==='west'?.55:.7));
  const key=new THREE.DirectionalLight(location==='west'?0xc2ddff:0xffe2b7,interior?.55:3);key.position.set(-28,58,34);key.castShadow=true;key.shadow.mapSize.set(graphicsLevel(this.quality).shadowSize,graphicsLevel(this.quality).shadowSize);Object.assign(key.shadow.camera,{left:-65,right:65,top:60,bottom:-55,near:1,far:210});key.shadow.bias=-.0003;this.scene.add(key);
  if(this.isHall(location))this.buildHallInterior();
  else if(location==='bridge')this.buildBridgeInterior();
  else this.buildExterior(location==='east');
  this.reset();this.resize();
 }
 track(resource){this.resources.add(resource);return resource;}
 mesh(geometry,material,parent=this.scene){const mesh=new THREE.Mesh(this.track(geometry),material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 box(x,y,z,w,h,d,material=this.stone,parent){const m=this.mesh(new THREE.BoxGeometry(w,h,d),material,parent);m.position.set(x,y+h/2,z);return m;}
 cylinder(x,y,z,r,h,material=this.stone,parent,top=r,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(top,r,h,segments),material,parent);m.position.set(x,y+h/2,z);return m;}
 sphere(x,y,z,scale,material,parent){const m=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),material,parent);m.position.set(x,y,z);m.scale.set(...scale);return m;}
 curve(points,r,material,parent){return this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,r,6,false),material,parent);}
 buildExterior(east){
  const floorGeometry=new THREE.PlaneGeometry(600,600,180,180);floorGeometry.rotateX(-Math.PI/2);const pos=floorGeometry.attributes.position,uv=floorGeometry.attributes.uv;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);let y=(fbm(x*.09,z*.09,71,4)-.4)*1.6;const lake=!east&&x<-8+Math.sin(z*.07)*4&&z>-9;if(lake)y-=Math.min(5,Math.abs(x+8)*.16);if(Math.abs(x)<9&&z<5)y*=.15;pos.setY(i,y-.35);uv.setXY(i,x*.09,z*.09);}floorGeometry.computeVertexNormals();this.mesh(floorGeometry,this.rock);
  const cliff=(left,right,bottom,top)=>{const cols=80,rows=70,points=[],uvs=[],indices=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const x=left+(right-left)*i/cols,y=bottom+(top-bottom)*j/rows;const strata=Math.sin(y*.8+x*.08)*.2;const depth=-20-fbm(x*.024,y*.025,34)*10-fbm(x*.18,y*.13,7,3)*2+strata;points.push(x,y,depth);uvs.push(x*.085,y*.085);if(i<cols&&j<rows){const a=j*(cols+1)+i;indices.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();this.mesh(g,this.rock);};
  cliff(-280,-6,-5,180);cliff(6,280,-5,180);cliff(-6,6,20,180);
  const boulderGeo=new THREE.IcosahedronGeometry(1,3),b=boulderGeo.attributes.position;for(let i=0;i<b.count;i++){const f=.8+noise2(b.getX(i)*5,b.getY(i)*4+b.getZ(i),24)*.4;b.setXYZ(i,b.getX(i)*f,b.getY(i)*f,b.getZ(i)*f);}boulderGeo.computeVertexNormals();this.track(boulderGeo);
  for(let i=0;i<32;i++){const side=i%2?1:-1,m=new THREE.Mesh(boulderGeo,this.rock);m.position.set(side*(10+rand(i+7)*55),3+rand(i+12)*45,-24-rand(i+18)*7);m.scale.set(3+rand(i)*8,4+rand(i+2)*14,3+rand(i+3)*4);m.rotation.set(rand(i)*.2,rand(i+2)*.5,rand(i+4)*.3);m.castShadow=m.receiveShadow=true;this.scene.add(m);}
  const rocks=new THREE.InstancedMesh(boulderGeo,this.rock,450),dummy=new THREE.Object3D();for(let i=0;i<450;i++){let x=(rand(i+31)-.5)*180,z=(rand(i+431)-.5)*140;if(Math.abs(x)<8&&z<18)x+=13;dummy.position.set(x,-.2,z);dummy.rotation.set(rand(i)*3,rand(i+3)*6,rand(i+9)*2);const size=.15+rand(i+23)*1.4;dummy.scale.set(size,size*.6,size*.9);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=rocks.receiveShadow=true;this.scene.add(rocks);
  if(east)this.greatGate();else this.durinGate();
 }
 durinGate(){
  this.box(0,0,-17,17,24,7,this.rock);
  const door=this.box(0,.1,-12.9,7.5,12,.3,this.dark);this.gates.push(door);
  for(const s of[-1,1]){this.box(s*4.5,0,-12.5,1.4,13,2);this.box(s*5.5,0,-12.8,.45,14,2,this.rock);}
  const archPoints=[];for(let i=0;i<=30;i++){const a=i/30*Math.PI;archPoints.push([Math.cos(a)*4.5,10+Math.sin(a)*4.5,-11.9]);}this.curve(archPoints,.55,this.stone);
  this.box(0,0,-11.5,10,.5,5);
  const art=document.createElement('canvas');art.width=512;art.height=768;const c=art.getContext('2d');c.strokeStyle='#c7e5ff';c.lineWidth=3;c.shadowColor='#71b9ff';c.shadowBlur=9;
  c.beginPath();c.moveTo(45,730);c.lineTo(45,255);c.bezierCurveTo(45,10,467,10,467,255);c.lineTo(467,730);c.stroke();
  for(const s of[-1,1]){const x=256+s*120;c.beginPath();c.moveTo(x,690);c.lineTo(x,360);for(let j=0;j<5;j++){const y=420+j*48;c.moveTo(x,y+30);c.quadraticCurveTo(x+s*75,y-10,x+s*58,y-58);c.moveTo(x,y+30);c.quadraticCurveTo(x-s*50,y,x-s*40,y-45);}c.stroke();}
  c.beginPath();c.moveTo(208,335);c.lineTo(204,282);c.lineTo(232,303);c.lineTo(256,258);c.lineTo(280,303);c.lineTo(308,282);c.lineTo(304,335);c.closePath();c.stroke();
  for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/6,x=256+Math.cos(a)*103,y=231+Math.sin(a)*95;c.beginPath();c.moveTo(x-6,y);c.lineTo(x+6,y);c.moveTo(x,y-6);c.lineTo(x,y+6);c.stroke();}
  const texture=this.track(new THREE.CanvasTexture(art)),mat=this.track(new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));const runes=this.mesh(new THREE.PlaneGeometry(7.4,12),mat);runes.position.set(0,6.1,-12.65);this.gates.push(runes);
  const glow=new THREE.PointLight(0x81c5ff,22,25,2);glow.position.set(0,7,-7);this.scene.add(glow);
  this.water=new Water(new THREE.PlaneGeometry(180,180),{textureWidth:512,textureHeight:512,waterNormals:this.waterNormal,sunDirection:new THREE.Vector3(-.4,.3,.7),sunColor:0xb4d3ef,waterColor:0x102934,distortionScale:.5,fog:true});this.track(this.water.geometry);this.track(this.water.material);this.water.rotation.x=-Math.PI/2;this.water.position.set(-102,-.27,52);this.scene.add(this.water);
  const bark=this.track(new THREE.MeshStandardMaterial({color:0x393a32,roughness:1}));
  for(const s of[-1,1]){this.curve([[s*9,0,-10],[s*9.5,7,-11],[s*10.4,13,-12]],.5,bark);for(let i=0;i<7;i++){this.curve([[s*9.5,5+i,-11],[s*(11+i*.3),9+i*.5,-11],[s*(13+i*.5),11+i*.4,-12]],.13,bark);for(let j=0;j<3;j++){const leaf=this.mesh(new THREE.PlaneGeometry(5.5,5),this.realism.material('leaf',0x78926b));leaf.position.set(s*(12+i*.5),11+i*.4,-12);leaf.rotation.set(j*.4,j*Math.PI/3,0);}}}
  for(let i=0;i<23;i++){const a=i/22*Math.PI,block=this.box(Math.cos(a)*4.6,9.8+Math.sin(a)*4.6,-11.3,.6,.5,1.3,this.stone);block.rotation.z=a-Math.PI/2;}
  for(let i=0;i<4;i++)this.box(0,-.15+i*.12,-6-i*1.2,9+i*.3,.18,1.4,this.stone);
 }
 greatGate(){
  const open=this.box(0,0,-17,12,19,1,this.dark);this.gates.push(open);
  for(let i=0;i<12;i++)this.box(0,-.1+i*.18,11-i*1.8,20-i*.32,.3,2.2);
  for(const s of[-1,1]){
   this.box(s*9,0,-12,6,25,10);
   for(let j=0;j<5;j++)this.box(s*(6.3+j*.8),0,-6-j*.8,.5,20+j*.8,.6,this.stone);
   this.box(s*9,23,-12,7,2,11);this.box(s*9,26,-12,8,1,12);
   for(let j=0;j<9;j++){this.box(s*9,2+j*2.4,-6.8,3,.22,.25,this.dark);this.box(s*(8+(j%2)*2),2+j*2.4,-6.7,.2,1.5,.3,this.metal);}
   const leaf=this.box(s*7,1,-3,5.5,12,1.3);leaf.rotation.z=-s*.17;leaf.rotation.y=s*.6;this.gates.push(leaf);
  }
  for(let j=0;j<4;j++)this.box(0,19+j*1.7,-12,15-j*1.8,1.8,10);
 }
 buildHallInterior(){
  this.target.set(0,3.2,4.5);
  this.hallScene=createHallOfDurinScene(this.scene,{
   stone:this.stone,
   rock:this.rock,
   metal:this.metal,
   flameTexture:this.flameTexture,
   exploreTexture:this.hallExploreImage,
   chaseTexture:this.hallChaseImage,
   quality:this.quality
  });
  this.gandalf=this.hallScene.gandalf;
  this.balrog=this.hallScene.balrog;
  this.staffLight=this.hallScene.staffLight;
  this.fireLight=this.hallScene.balrogLight;
  this.fellowship=this.hallScene.companions;
  this.goblins=this.hallScene.goblins;
 }
 buildBridgeInterior(){
  this.target.set(0,5,-10);
  // Thin unrailed masonry bridge above a true open chasm, with arched underside.
  for(let i=0;i<35;i++){const z=16-i*1.55,y=.25+Math.cos((i/34-.5)*Math.PI)*.65;this.box(0,y,z,2.7,.65,1.53);if(i%3===0)this.box(0,y-.5,z,2.8,.5,1.4);}
  for(const s of[-1,1]){
   this.box(0,-4,s===1?30:-49,45,5,24);
   for(let i=0;i<9;i++){
    const z=35-i*15;
    this.box(s*20,-62,z,8,105,8);
    for(let j=0;j<4;j++)this.box(s*(17+j*1.8),-5,z-4,1.1,48,1.2);
    this.box(s*20,37,z,12,4,12);this.box(s*20,42,z,16,3,16);
    this.box(s*20,-6,z,12,2,12);
   }
  }
  for(let i=0;i<8;i++)this.box(0,45,-70+i*18,60,5,6);
  this.box(0,-60,-115,160,125,10,this.rock);for(const s of[-1,1])this.box(s*76,-60,-20,12,125,210,this.rock);
  const lava=this.track(new THREE.MeshBasicMaterial({color:0xe44b09}));for(let i=0;i<12;i++){this.box((rand(i+9)-.5)*100,-53,20-i*9,1+rand(i)*3,.2,15,lava);}
  const under=new THREE.PointLight(0xff480a,3500,150,2);under.position.set(8,-26,-20);this.scene.add(under);
  const white=new THREE.PointLight(0xc8e5ff,140,28,2);white.position.set(-.5,5,6);this.scene.add(white);this.staffLight=white;
  this.gandalf=new THREE.Group();this.gandalf.position.set(0,1,6);this.gandalf.rotation.y=Math.PI;this.scene.add(this.gandalf);
  const robe=this.track(new THREE.MeshStandardMaterial({color:0x777d7e,roughness:1})),whiteMat=this.track(new THREE.MeshStandardMaterial({color:0xb7beb9,roughness:.95})),wood=this.track(new THREE.MeshStandardMaterial({color:0x4e3b2a,roughness:1}));
  this.cylinder(0,0,0,.53,1.65,robe,this.gandalf,.25,16);this.sphere(0,1.98,0,[.23,.3,.23],whiteMat,this.gandalf);
  this.cylinder(0,2.17,0,.53,.08,robe,this.gandalf,.53,20);this.cylinder(0,2.25,0,.3,.65,robe,this.gandalf,0,20);
  this.cylinder(0,1.44,.21,.03,.55,whiteMat,this.gandalf,.22,10);
  this.curve([[-.2,1.6,0],[-.65,1.3,.1],[-.92,1.6,.1]],.12,robe,this.gandalf);
  this.curve([[.2,1.6,0],[.52,1.45,.1],[.85,1.5,.2]],.12,robe,this.gandalf);
  this.wizardStaff=this.cylinder(-.93,0,.13,.045,3.2,wood,this.gandalf,.055,8);
  const staff=this.track(new THREE.MeshBasicMaterial({color:0xd9edff}));this.sphere(-.93,3.2,.13,[.13,.2,.13],staff,this.gandalf);
  const glamdringGlow=this.track(new THREE.MeshStandardMaterial({color:0xf4faff,emissive:0xd8ecff,emissiveIntensity:1.35,metalness:.55,roughness:.18}));
  const blade=this.wizardSword=this.box(.8,1.2,.25,.07,1.5,.035,glamdringGlow,this.gandalf);blade.rotation.z=-.65;
  this.buildBalrog();this.addCharacterImpostors();
  const particles=this.track(new THREE.BufferGeometry()),positions=new Float32Array(700*3);for(let i=0;i<700;i++){positions[i*3]=(rand(i+12)-.5)*40;positions[i*3+1]=rand(i+33)*25-12;positions[i*3+2]=-8-rand(i+54)*70;}particles.setAttribute('position',new THREE.BufferAttribute(positions,3));
  this.embers=new THREE.Points(particles,this.track(new THREE.PointsMaterial({color:0xffa14b,size:.12,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending})));this.scene.add(this.embers);
 }
 buildBalrog(){
  const g=this.balrog=new THREE.Group();g.position.set(0,1,-17);g.scale.set(1.28,1.28,1.28);this.scene.add(g);
  const skin=this.track(new THREE.MeshStandardMaterial({color:0x08090a,map:this.rock.map,normalMap:this.rock.normalMap,normalScale:new THREE.Vector2(2,2),roughness:.98,emissive:0x260900,emissiveIntensity:.04}));
  const molten=this.track(new THREE.MeshBasicMaterial({color:0xff8b1c}));
  this.sphere(0,7,0,[2.3,1.7,1.25],skin,g);this.sphere(0,5.2,0,[1.2,1.9,.8],skin,g);this.sphere(0,3.8,0,[1.3,.8,.9],skin,g);this.sphere(0,9,0,[.85,1.25,.8],skin,g);
  this.sphere(0,8.65,.75,[.68,.55,.7],skin,g);this.box(0,8.1,1.2,.9,.55,.14,this.dark,g);
  for(let i=0;i<7;i++){this.cylinder(-.4+i*.13,8.16,1.3,.05,.25,molten,g,0,5);const tooth=this.cylinder(-.4+i*.13,8.57,1.3,.05,.22,molten,g,0,5);tooth.rotation.z=Math.PI;}
  for(let i=0;i<13;i++){const spine=this.cylinder((i%2?1:-1)*(.6+rand(i)*1.8),7+rand(i+1)*2,-.6,.22,1+rand(i+2)*1.5,skin,g,0,5);spine.rotation.z=(i%2?1:-1)*.7;}
  for(const s of[-1,1]){
   this.curve([[s*1.2,4,0],[s*1.8,2,.4],[s*2,0,1]],.65,skin,g);
   this.curve([[s*1.6,7.7,0],[s*3.7,6.5,.2],[s*4.4,4.8,1]],.7,skin,g);
   this.sphere(s*4.4,4.8,1,[.65,.8,.5],skin,g);
   for(let i=0;i<4;i++)this.curve([[s*(4.1+i*.2),4.6,1.2],[s*(4.25+i*.23),3.9,1.5],[s*(4.1+i*.24),3.6,1.9]],.08,skin,g);
   this.sphere(s*1.6,3,0,[.8,1.4,.75],skin,g);this.sphere(s*2,.2,1,[.65,.35,1],skin,g);
   const brow=this.box(s*.45,9.32,.88,.65,.2,.3,skin,g);brow.rotation.z=-s*.3;
   this.curve([[s*.8,9.7,0],[s*1.8,10.3,-.2],[s*2.2,11.5,-.4],[s*1.1,12,-.3]],.3,skin,g);
   this.sphere(s*.43,9.2,.91,[.25,.08,.08],molten,g);
   for(let i=0;i<7;i++)this.curve([[s*(.3+i*.2),7.7-i*.42,1.2],[s*(.5+i*.12),7.3-i*.42,1.42],[s*(.8+i*.12),7-i*.42,1.25]],.025,molten,g);
   const wing=this.track(new THREE.MeshStandardMaterial({color:0x1c1514,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}));
   const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(s*3,5,s*8,6,s*12,4);shape.bezierCurveTo(s*9,2,s*8,-3,s*4,-3);shape.lineTo(0,0);
   const m=this.mesh(new THREE.ShapeGeometry(shape),wing,g);m.position.set(s,7,-1.5);
  }
  this.whip=this.curve([[4.3,5,1],[7,6,2],[9,10,3],[7,13,2],[3,14,0]],.07,molten,g);
  const mat=this.track(new THREE.SpriteMaterial({map:this.flameTexture,color:0xffffff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  for(let i=0;i<30;i++){const f=new THREE.Sprite(mat);f.position.set((rand(i+1)-.5)*4.5,4+rand(i+8)*8,-.6+(rand(i+7)-.5)*2.3);f.scale.set(1+rand(i)*1.4,3+rand(i+1)*3.5,1);f.userData.base=f.position.clone();f.userData.seed=i;g.add(f);this.flames.push(f);}
  this.fireLight=new THREE.PointLight(0xff5c0b,950,55,2);this.fireLight.position.set(0,8,-13);this.scene.add(this.fireLight);
 }
 addCharacterImpostors(){
  if(!this.balrogImage||!this.gandalfImage)return;
  for(const group of[this.balrog,this.gandalf])group.traverse(object=>{if(!object.isMesh||object===this.whip)return;const material=this.track(object.material.clone());material.colorWrite=false;material.depthWrite=false;object.material=material;});
  const character=(texture,height)=>{const material=this.track(new THREE.SpriteMaterial({map:texture,color:0xffffff,transparent:true,depthWrite:true,alphaTest:.06,toneMapped:false}));const sprite=new THREE.Sprite(material);sprite.scale.set(height*texture.image.width/texture.image.height,height,1);this.scene.add(sprite);return sprite;};
  this.balrogCard=character(this.balrogImage,19.2);this.gandalfCard=character(this.gandalfImage,3.8);this.gandalfCard.position.set(0,2.9,6);
 }
 animateWhip(attack){
  const idle=[[4.3,5,1],[7,6,2],[9,10,3],[7,13,2],[3,14,0]],strike=[[4.3,5,1],[6,7,7],[3,6,15],[1,3,20],[-.5,2,23]];
  const curve=new THREE.CatmullRomCurve3(idle.map((p,i)=>new THREE.Vector3(...p.map((v,j)=>v*(1-attack)+strike[i][j]*attack))));
  const frames=curve.computeFrenetFrames(20,false),position=this.whip.geometry.attributes.position,normal=this.whip.geometry.attributes.normal;
  for(let i=0;i<=20;i++){const p=curve.getPointAt(i/20),n=frames.normals[i],b=frames.binormals[i];for(let j=0;j<=6;j++){const a=j/6*Math.PI*2,x=Math.cos(a)*n.x+Math.sin(a)*b.x,y=Math.cos(a)*n.y+Math.sin(a)*b.y,z=Math.cos(a)*n.z+Math.sin(a)*b.z,index=i*7+j;position.setXYZ(index,p.x+x*.07,p.y+y*.07,p.z+z*.07);normal.setXYZ(index,x,y,z);}}position.needsUpdate=normal.needsUpdate=true;this.whip.geometry.computeBoundingSphere();
 }
 reset(){
  if(this.isHall()){
   this.yaw=this.location==='chase'?.12:-.08;
   this.pitch=.13;
   this.distance=this.location==='chase'?14.5:13.2;
   this.target.set(0,2.6,4.2);
  }else if(this.location==='bridge'){
   this.yaw=.38;this.pitch=.22;this.distance=43;this.target.set(0,5,-10);
  }else{
   this.yaw=0;this.pitch=.14;this.distance=this.location==='east'?53:38;this.target.set(0,7,-10);
  }
 }
 zoom(factor){this.distance=clamp(this.distance/factor,this.isInterior()?7:12,130);}
 resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;const maxSize=Math.min(this.renderer.capabilities.maxTextureSize,this.renderer.getContext().getParameter(this.renderer.getContext().MAX_RENDERBUFFER_SIZE));const buffer=renderSize(this.quality,r.width,r.height,devicePixelRatio||1,maxSize);this.renderer.setPixelRatio(buffer.pixelRatio);this.renderer.setSize(buffer.width,buffer.height,false);this.camera.aspect=buffer.width/buffer.height;this.camera.updateProjectionMatrix();const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());this.finish.resize(size.x,size.y);}
 render(now,battleTime){
  if(!this.location)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches&&battleTime===null)now=0;
  if(this.isHall()){
   const running=battleTime!==null||this.location==='chase';
   const t=battleTime!==null?battleTime:now;
   if(this.hallScene)this.hallScene.update(t,running);
   const chase=running?hallChasePose(battleTime!==null?battleTime:now%32):null;
   const yaw=this.yaw+(battleTime!==null?Math.sin(battleTime*.22)*.24:running?Math.sin(now*.18)*.08:0);
   const pitch=this.pitch+(battleTime!==null?Math.sin(battleTime*.16)*.04:0);
   const distance=this.distance*(battleTime!==null?.92-.12*Math.sin(battleTime/32*Math.PI):1);
   this.target.set(
    battleTime!==null?Math.sin(battleTime*.3)*.6:0,
    2.5+(chase?chase.balrogGlow*.35:0),
    battleTime!==null?3.8-chase.progress*2.4:4.2
   );
   this.camera.position.set(
    this.target.x+Math.sin(yaw)*Math.cos(pitch)*distance,
    Math.max(1.4,this.target.y+Math.sin(pitch)*distance),
    this.target.z+Math.cos(yaw)*Math.cos(pitch)*distance
   );
   this.camera.lookAt(this.target.x,this.target.y+.45,-18);
  }else{
   const cinematic=this.location==='bridge'&&battleTime!==null;
   const yaw=this.yaw+(cinematic?Math.sin(battleTime*.12)*.12:0),distance=this.distance*(cinematic?1-Math.sin(battleTime/32*Math.PI)*.12:1);
   this.camera.position.set(this.target.x+Math.sin(yaw)*Math.cos(this.pitch)*distance,Math.max(2.3,this.target.y+Math.sin(this.pitch)*distance),this.target.z+Math.cos(yaw)*Math.cos(this.pitch)*distance);this.camera.lookAt(this.target);
   const t=cinematic?battleTime:now,pose=battlePose(cinematic?t:0);
   for(const f of this.flames){const b=f.userData.base,i=f.userData.seed;f.position.y=b.y+Math.sin(t*3+i)*.6;f.position.x=b.x+Math.sin(t*2+i)*.25;f.scale.y=3+Math.sin(t*4+i)*1.1;}
   if(this.balrog&&this.whip){this.balrog.rotation.y=Math.sin(t*.6)*.045;this.balrog.position.y=1+Math.sin(t*.9)*.15;this.fireLight.intensity=950+Math.sin(t*7)*130;this.balrog.position.z=-17+(cinematic?Math.min(3,t*.2)-Math.max(0,t-24)*.15:0);this.animateWhip(pose.attack);this.whip.rotation.y=cinematic?0:Math.sin(t*1.4)*.12;this.wizardStaff.rotation.z=cinematic?Math.sin(t*.65)*.12:0;this.wizardSword.rotation.z=-.65+pose.attack*.8;this.balrog.rotation.x=-pose.attack*.08;if(this.embers)this.embers.rotation.y=t*.012;this.staffLight.intensity=140+pose.staff*550+pose.clash*380;}
   if(this.balrogCard){this.balrogCard.position.copy(this.balrog.position);this.balrogCard.position.y+=7.5;}
  }
  if(this.water?.isWater)this.water.material.uniforms.time.value=now*.3;
  else if(this.water){const p=this.water.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*.4+now*.5)*.025+Math.cos(p.getY(i)*.3-now*.4)*.02);p.needsUpdate=true;this.water.geometry.computeVertexNormals();}
  this.finish.render(this.scene,this.camera);
 }
 clear(){this.hallScene?.dispose();this.hallScene=null;this.water?.disposeReflection?.();this.scene.traverse(o=>{if(o.isLight&&o.shadow)o.shadow.dispose();});this.scene.clear();for(const r of this.resources)r.dispose?.();this.resources.clear();this.water=null;this.balrog=null;this.gandalf=null;this.fellowship=null;this.goblins=null;this.whip=null;this.embers=null;this.balrogCard=null;this.gandalfCard=null;}
 dispose(){this.clear();for(const t of this.textures.values())t.dispose();this.realism.dispose();this.finish.dispose();this.renderer.dispose();}
}
