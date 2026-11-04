import * as THREE from './assets/vendor/three.module.js';
import {FELLOWSHIP_NAMES,hallChasePose} from './moria-battle.js';
import {applyWorldSurface} from './surface-shader.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};

export const FELLOWSHIP_SPECS=Object.freeze([
 {name:'Gandalf the Grey',role:'wizard',height:1.92,pos:[0,0,8.2],cloak:0x555c63,tunic:0x6d747c,trim:0xc8d6e5,hair:0xd8dde2,skin:0xe2c4aa,weapon:'staff-sword',stridePhase:0},
 {name:'Aragorn',role:'ranger',height:1.86,pos:[-2.15,0,6.45],cloak:0x2a332b,tunic:0x3c3228,trim:0x8a795d,hair:0x231d19,skin:0xd8b497,weapon:'longsword',stridePhase:.8},
 {name:'Legolas',role:'elf',height:1.84,pos:[2.2,0,6.3],cloak:0x364a38,tunic:0x4c6247,trim:0xc9ba86,hair:0xe6cf92,skin:0xeed2ba,weapon:'bow',stridePhase:1.6},
 {name:'Gimli',role:'dwarf',height:1.42,pos:[-3.55,0,5.15],cloak:0x4a2922,tunic:0x5c3428,trim:0xb88b4a,hair:0x7c361a,skin:0xd9af8e,weapon:'axe',stridePhase:2.3},
 {name:'Boromir',role:'gondor',height:1.85,pos:[3.65,0,5.0],cloak:0x481f24,tunic:0x2b252c,trim:0xc5a25d,hair:0x3a281d,skin:0xdcb89b,weapon:'shield-sword',stridePhase:3.1},
 {name:'Frodo Baggins',role:'hobbit',height:1.18,pos:[-1.05,0,4.35],cloak:0x354733,tunic:0x6e2c26,trim:0xc5a86a,hair:0x241914,skin:0xe4c1a4,weapon:'sting',stridePhase:3.9},
 {name:'Samwise Gamgee',role:'hobbit',height:1.19,pos:[1.15,0,4.2],cloak:0x4c4a38,tunic:0x8c734b,trim:0xb89b67,hair:0x8f683b,skin:0xe0b898,weapon:'pack-blade',stridePhase:4.6},
 {name:'Meriadoc Brandybuck',role:'hobbit',height:1.2,pos:[-2.35,0,3.1],cloak:0x3d4f37,tunic:0x937834,trim:0x665233,hair:0x6c4b27,skin:0xe3bfa1,weapon:'barrow-blade',stridePhase:5.2},
 {name:'Peregrin Took',role:'hobbit',height:1.17,pos:[2.4,0,2.95],cloak:0x394b35,tunic:0x3f5844,trim:0x98875b,hair:0x75522c,skin:0xe5c3a6,weapon:'barrow-blade',stridePhase:5.9}
].map(s=>Object.freeze(s)));

export const GOBLIN_RING=Object.freeze(Array.from({length:40},(_,i)=>{
 const ring=i<22?0:i<34?1:2;
 const t=ring===0?i/21:ring===1?(i-22)/11:(i-34)/5;
 const angle=-Math.PI*.84+t*Math.PI*1.68;
 const radiusX=ring===0?7.8+rand(i*3)*2.4:ring===1?12.2+rand(i*5)*3.2:14.5;
 const radiusZ=ring===0?9.2+rand(i*7)*3.4:ring===1?15.5+rand(i*11)*5.5:22;
 const x=Math.sin(angle)*radiusX+(rand(i*13)-.5)*1.2;
 const z=5.2-Math.cos(angle)*radiusZ+(rand(i*17)-.5)*2.2;
 const wallClimber=ring===2;
 return Object.freeze({
  index:i,
  x:wallClimber?(i%2?-13.2:13.2):x,
  y:wallClimber?3.2+(i%3)*2.4:0,
  z:wallClimber?-4-(i-34)*6.5:z,
  wallClimber,
  weapon:i%3===0?'spear':i%2===0?'scimitar-shield':'scimitar',
  phase:rand(i*19)*Math.PI*2,
  scale:.88+rand(i*23)*.22
 });
}));

export function createHallOfDurinScene(scene,{stone,rock,metal,flameTexture,exploreTexture,chaseTexture,quality='4k'}={}){
 const resources=new Set(),track=r=>{if(r)resources.add(r);return r;};
 const root=new THREE.Group();root.name='Hall of Durin (Dwarrowdelf)';scene.add(root);

 const darkStone=track((stone||new THREE.MeshStandardMaterial({color:0x4a5259,roughness:.84})).clone());
 darkStone.color.setHex(0x49515a);darkStone.roughness=.82;darkStone.metalness=.08;
 applyWorldSurface(darkStone,{scale:.16,variation:.28,moss:.08,macro:.24,sparkle:.14});

 const polishedFloor=track((stone||new THREE.MeshStandardMaterial({color:0x363d45,roughness:.48})).clone());
 polishedFloor.color.setHex(0x343c44);polishedFloor.roughness=.42;polishedFloor.metalness=.14;
 applyWorldSurface(polishedFloor,{scale:.22,variation:.32,moss:.04,macro:.28,sparkle:.2});

 const carvedTrim=track(new THREE.MeshStandardMaterial({color:0x746b5c,roughness:.58,metalness:.26}));
 const steelMat=track((metal||new THREE.MeshStandardMaterial({color:0xa8bac8,metalness:.78,roughness:.28})).clone());
 const darkIron=track(new THREE.MeshStandardMaterial({color:0x2a2f34,metalness:.68,roughness:.46}));
 const stingMat=track(new THREE.MeshStandardMaterial({color:0xb8e6ff,emissive:0x4cb5ff,emissiveIntensity:1.6,metalness:.5,roughness:.2}));
 const staffCrystalMat=track(new THREE.MeshBasicMaterial({color:0xf2fbff}));
 const moltenMat=track(new THREE.MeshBasicMaterial({color:0xff7b18}));

 const addMesh=(geo,mat,parent=root,cast=true,receive=true)=>{
  const m=new THREE.Mesh(track(geo),mat);m.castShadow=cast;m.receiveShadow=receive;parent.add(m);return m;
 };

 // 1. Cracked Dwarven flagstone floor with chiseled geometric reliefs and reflective seams
 const floorSegs=quality==='4k'?180:110;
 const floorGeo=new THREE.PlaneGeometry(76,136,floorSegs,floorSegs);floorGeo.rotateX(-Math.PI/2);
 const fp=floorGeo.attributes.position,fuv=floorGeo.attributes.uv;
 for(let i=0;i<fp.count;i++){
  const x=fp.getX(i),z=fp.getZ(i);
  const slab=Math.sin(x*1.57)*Math.sin(z*1.57);
  const crack=Math.exp(-Math.pow(Math.sin(x*.42+Math.cos(z*.27)*1.8),2)*36)*-.055;
  const aisle=Math.abs(x)<6.5?.025:0;
  fp.setY(i,aisle+slab*.018+crack);
  fuv.setXY(i,x*.22,z*.22);
 }
 floorGeo.computeVertexNormals();
 const floor=addMesh(floorGeo,polishedFloor,root,false,true);
 floor.position.set(0,0,-24);

 // Dwarrowdelf geometric inlaid runner strips along the central avenue
 for(const side of[-1,1]){
  const runner=addMesh(new THREE.BoxGeometry(.38,.03,124),carvedTrim,root,false,true);
  runner.position.set(side*5.4,.015,-24);
 }

 // 2. Colossal carved Dwarven pillars of the Hall of Durin (two grand double colonnades)
 const pillarGroup=new THREE.Group();pillarGroup.name='Colonnade of Durin';root.add(pillarGroup);
 const shaftGeo=track(new THREE.CylinderGeometry(1.75,1.92,28,8,6));
 const baseGeo=track(new THREE.CylinderGeometry(2.35,2.65,1.8,8));
 const plinthGeo=track(new THREE.BoxGeometry(5.4,.85,5.4));
 const capGeo=track(new THREE.CylinderGeometry(2.85,1.78,2.6,8));
 const ribGeo=track(new THREE.TorusGeometry(14.5,.42,8,28,Math.PI));

 for(let row=0;row<9;row++){
  const z=18-row*10.5;
  for(const side of[-1,1]){
   for(const tier of[0,1]){
    const x=side*(14.2+tier*11.5);
    const p=new THREE.Group();p.position.set(x,0,z);pillarGroup.add(p);
    const plinth=new THREE.Mesh(plinthGeo,darkStone);plinth.position.y=.42;plinth.castShadow=plinth.receiveShadow=true;p.add(plinth);
    const base=new THREE.Mesh(baseGeo,darkStone);base.position.y=1.55;base.castShadow=base.receiveShadow=true;p.add(base);
    const shaft=new THREE.Mesh(shaftGeo,darkStone);shaft.position.y=15.8;shaft.castShadow=shaft.receiveShadow=true;p.add(shaft);
    // Chiseled dwarven ring bands on each pillar
    for(const by of[5.5,11.5,17.5,23.5]){
     const band=addMesh(new THREE.CylinderGeometry(1.96,1.96,.42,8),carvedTrim,p);
     band.position.y=by;
    }
    const cap=new THREE.Mesh(capGeo,darkStone);cap.position.y=29.8;cap.castShadow=cap.receiveShadow=true;p.add(cap);
   }
  }
  // Vaulted stone arches spanning the central nave
  const arch=new THREE.Mesh(ribGeo,darkStone);
  arch.position.set(0,28.5,z);arch.castShadow=arch.receiveShadow=true;pillarGroup.add(arch);
 }

 // Scattered ancient dwarf-stone rubble & fallen shields along the column bases
 const shardGeo=track(new THREE.DodecahedronGeometry(.32,1));
 const shards=new THREE.InstancedMesh(shardGeo,darkStone,160);
 const dummy=new THREE.Object3D();
 for(let i=0;i<160;i++){
  const side=i%2?1:-1;
  const x=side*(6.8+rand(i*5)*16),z=18-rand(i*7)*88;
  dummy.position.set(x,.12+rand(i*11)*.18,z);
  dummy.rotation.set(rand(i)*3,rand(i+2)*3,rand(i+4)*3);
  dummy.scale.set(.6+rand(i+6)*1.8,.35+rand(i+8)*.7,.6+rand(i+10)*1.5);
  dummy.updateMatrix();shards.setMatrixAt(i,dummy.matrix);
 }
 shards.castShadow=shards.receiveShadow=true;root.add(shards);track(shards);

 // 3. High-density 3D Depth-Displaced Photographic Relief Backdrop
 // Projects the matched Hall of Durin / Goblin Chase paintings onto a 3D depth-displaced curved relief dome
 // so the 3D scene and 3D video inherit the exact epic texture & lighting quality of the picture.
 let reliefUniforms=null,reliefMesh=null;
 if(exploreTexture||chaseTexture){
  const texA=exploreTexture||chaseTexture,texB=chaseTexture||exploreTexture;
  const reliefGeo=new THREE.PlaneGeometry(92,52,160,96);
  const rp=reliefGeo.attributes.position,ruv=reliefGeo.attributes.uv;
  for(let i=0;i<rp.count;i++){
   const u=ruv.getX(i),v=ruv.getY(i);
   const nx=(u-.5)*2,ny=(v-.5)*2;
   // Concave amphitheater vault curvature with pillar-corridor depth recess down the center
   const corridorDepth=Math.exp(-nx*nx*3.2)*14;
   const pillarRipple=Math.cos(nx*Math.PI*5)*1.35*(1-Math.exp(-nx*nx*4));
   const archCurve=-Math.pow(Math.max(0,ny),2)*6.5;
   rp.setZ(i,-corridorDepth+pillarRipple+archCurve);
  }
  reliefGeo.computeVertexNormals();
  reliefUniforms={
   uExploreMap:{value:texA},
   uChaseMap:{value:texB},
   uBlend:{value:0},
   uTime:{value:0},
   uStaffPulse:{value:1},
   uBalrogPulse:{value:.65}
  };
  const reliefMat=track(new THREE.ShaderMaterial({
   uniforms:reliefUniforms,
   vertexShader:`
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    uniform sampler2D uExploreMap;
    uniform sampler2D uChaseMap;
    uniform float uBlend;
    uniform float uTime;
    void main(){
     vUv=uv;
     vec3 cA=texture2D(uExploreMap,uv).rgb;
     vec3 cB=texture2D(uChaseMap,uv).rgb;
     vec3 col=mix(cA,cB,uBlend);
     float luma=dot(col,vec3(.299,.587,.114));
     vec3 displaced=position+normal*(luma*2.4+sin(uv.x*18.0+uTime*1.6)*.06*uBlend);
     vec4 wp=modelMatrix*vec4(displaced,1.0);
     vWorldPos=wp.xyz;
     vNormal=normalize(normalMatrix*normal);
     gl_Position=projectionMatrix*viewMatrix*wp;
    }`,
   fragmentShader:`
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    uniform sampler2D uExploreMap;
    uniform sampler2D uChaseMap;
    uniform float uBlend;
    uniform float uTime;
    uniform float uStaffPulse;
    uniform float uBalrogPulse;
    void main(){
     vec2 px=vec2(1.0/3840.0,1.0/2160.0);
     vec3 cA=texture2D(uExploreMap,vUv).rgb;
     vec3 cB=texture2D(uChaseMap,vUv).rgb;
     vec3 base=mix(cA,cB,uBlend);
     vec3 nSample=mix(texture2D(uExploreMap,vUv+vec2(px.x,0.0)).rgb,texture2D(uChaseMap,vUv+vec2(px.x,0.0)).rgb,uBlend);
     vec3 uSample=mix(texture2D(uExploreMap,vUv+vec2(0.0,px.y)).rgb,texture2D(uChaseMap,vUv+vec2(0.0,px.y)).rgb,uBlend);
     float dx=dot(nSample-base,vec3(.333));
     float dy=dot(uSample-base,vec3(.333));
     vec3 microNormal=normalize(vNormal+vec3(-dx*5.5,-dy*5.5,0.0));
     vec3 staffDir=normalize(vec3(18.0,26.0,8.0)-vWorldPos);
     float staffDiff=max(0.0,dot(microNormal,staffDir));
     float centerGlow=exp(-pow((vUv.x-.5)*3.1,2.0)-pow((vUv.y-.52)*2.6,2.0));
     vec3 balrogTint=vec3(1.0,.38,.08)*centerGlow*uBalrogPulse*(.32+.68*uBlend)*(.88+.12*sin(uTime*6.5));
     vec3 staffTint=vec3(.78,.91,1.0)*staffDiff*.22*uStaffPulse;
     vec3 color=base*(.92+staffDiff*.24)+balrogTint+staffTint;
     float edgeFade=smoothstep(0.0,.08,vUv.x)*smoothstep(1.0,.92,vUv.x)*smoothstep(0.0,.1,vUv.y)*smoothstep(1.0,.9,vUv.y);
     gl_FragColor=vec4(color,edgeFade*.95);
    }`,
   transparent:true,
   depthWrite:false
  }));
  reliefMesh=addMesh(reliefGeo,reliefMat,root,false,false);
  reliefMesh.position.set(0,19.5,-70);
  reliefMesh.name='Hall of Durin Photographic 3D Relief';
 }

 // 4. Dynamic Volumetric Lighting: Gandalf's Blazing Staff + Distant Balrog Hellfire
 const staffLight=new THREE.PointLight(0xd8eeff,260,44,1.85);
 staffLight.position.set(-.45,4.2,8.4);
 staffLight.castShadow=true;
 staffLight.shadow.mapSize.set(1024,1024);
 staffLight.shadow.bias=-.0004;
 root.add(staffLight);

 const pathLight=new THREE.PointLight(0x9bcaff,95,28,2);
 pathLight.position.set(0,1.4,6.5);
 root.add(pathLight);

 const balrogLight=new THREE.PointLight(0xff4e0a,1400,120,1.9);
 balrogLight.position.set(0,11,-54);
 root.add(balrogLight);

 // Volumetric light-beam cone radiating from Gandalf's staff onto the flagstones
 const beamMat=track(new THREE.MeshBasicMaterial({color:0xcce8ff,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
 const staffBeam=addMesh(new THREE.ConeGeometry(7.2,11.5,28,1,true),beamMat,root,false,false);
 staffBeam.position.set(-.45,2.4,8.4);

 // 5. Build All 9 Fellowship Companions (Gandalf + Aragorn, Legolas, Gimli, Boromir, Frodo, Sam, Merry, Pippin)
 const fellowshipGroup=new THREE.Group();fellowshipGroup.name='The Fellowship of the Ring';root.add(fellowshipGroup);
 const companions=[];

 for(const spec of FELLOWSHIP_SPECS){
  const actor=createCompanion(spec,{track,addMesh,steelMat,darkIron,stingMat,staffCrystalMat});
  fellowshipGroup.add(actor.group);
  companions.push(actor);
 }
 const gandalfActor=companions[0];

 // 6. Build Encircling Goblins of Moria (40 articulated 3D goblins almost surrounding the Fellowship)
 const goblinGroup=new THREE.Group();goblinGroup.name='Goblins of Moria';root.add(goblinGroup);
 const goblinSkin=track(new THREE.MeshStandardMaterial({color:0x3b4638,roughness:.78,metalness:.08}));
 const goblinArmor=track(new THREE.MeshStandardMaterial({color:0x23272a,roughness:.52,metalness:.62}));
 const goblinEye=track(new THREE.MeshBasicMaterial({color:0xffbe3b}));
 const goblins=[];

 for(const gSpec of GOBLIN_RING){
  const gob=createGoblin(gSpec,{track,addMesh,goblinSkin,goblinArmor,goblinEye,steelMat});
  goblinGroup.add(gob.group);
  goblins.push(gob);
 }

 // 7. Build the Balrog of Morgoth Seen Afar in the Background (z = -56)
 const balrogObj=createDistantBalrog({track,addMesh,rock:darkStone,moltenMat,flameTexture});
 root.add(balrogObj.group);

 // 8. Drifting cavern dust motes & Balrog fire embers
 const emberCount=900;
 const emberGeo=track(new THREE.BufferGeometry());
 const emberPos=new Float32Array(emberCount*3);
 for(let i=0;i<emberCount;i++){
  emberPos[i*3]=(rand(i*3+1)-.5)*46;
  emberPos[i*3+1]=.4+rand(i*3+2)*24;
  emberPos[i*3+2]=14-rand(i*3+3)*82;
 }
 emberGeo.setAttribute('position',new THREE.BufferAttribute(emberPos,3));
 const embers=new THREE.Points(emberGeo,track(new THREE.PointsMaterial({color:0xff8f38,size:.15,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending})));
 root.add(embers);track(embers);

 function update(time=0,running=false){
  const t= Number(time)||0;
  const pose=hallChasePose(running?t:0);
  const blend=running?clamp(.35+pose.progress*.65,0,1):0;
  if(reliefUniforms){
   reliefUniforms.uBlend.value=blend;
   reliefUniforms.uTime.value=t;
   reliefUniforms.uStaffPulse.value=pose.staffLight;
   reliefUniforms.uBalrogPulse.value=pose.balrogGlow;
  }

  // Forward motion offset down the Hall of Durin during the 3D chase
  const hallAdvance=running?Math.sin(t*.45)*.35:0;

  // Animate each of the 9 Fellowship companions
  for(let i=0;i<companions.length;i++){
   const c=companions[i],s=c.spec,ph=s.stridePhase;
   const cycle=running?t*6.8*pose.sprintSpeed+ph:t*1.6+ph;
   const amp=running?.68:.14;
   const bob=running?Math.abs(Math.sin(cycle))*.16:Math.sin(cycle)*.025;
   const sway=running?Math.cos(cycle*.5)*.08:Math.sin(t*.7+ph)*.04;

   c.group.position.set(
    s.pos[0]+sway,
    s.pos[1]+bob,
    s.pos[2]+hallAdvance+(running?Math.sin(t*.9+ph)*.22:0)
   );
   // Look around in awe when exploring, lean forward in urgent sprint when running
   c.group.rotation.y=running?Math.sin(cycle*.5)*.06:Math.sin(t*.55+ph)*.22;
   c.torso.rotation.x=running?.22+Math.sin(cycle*2)*.05:.04;

   // Articulated leg & knee stride
   const legA=Math.sin(cycle)*amp,legB=Math.sin(cycle+Math.PI)*amp;
   c.leftLeg.rotation.x=legA;
   c.rightLeg.rotation.x=legB;
   c.leftKnee.rotation.x=Math.max(0,-legA*.85);
   c.rightKnee.rotation.x=Math.max(0,-legB*.85);

   // Articulated arms & cloak billow
   if(s.role==='wizard'){
    // Gandalf holds his staff high in his right hand to light the path!
    c.rightArm.rotation.x=running?-1.18+Math.sin(cycle)*.12:-1.08+Math.sin(t*1.5)*.05;
    c.rightArm.rotation.z=-.18;
    c.leftArm.rotation.x=running?-legA*.55:.15+Math.sin(t*1.1)*.06;
   }else{
    c.leftArm.rotation.x=-legA*.65;
    c.rightArm.rotation.x=-legB*.65-(running?.25:0);
   }
   c.cloak.rotation.x=.14+(running?.32+Math.abs(Math.sin(cycle))*.18:Math.sin(t*1.4+ph)*.04);
   c.head.rotation.y=running?Math.sin(t*1.8+ph)*.18:Math.sin(t*.8+ph)*.28;
  }

  // Update Gandalf's blazing staff light position & intensity
  const gx=gandalfActor.group.position.x-.42,gy=gandalfActor.group.position.y+2.55,gz=gandalfActor.group.position.z+.48;
  staffLight.position.set(gx,gy,gz);
  staffLight.intensity=running?290+pose.staff*480+pose.clash*320:250+Math.sin(t*2.5)*28;
  pathLight.position.set(gx*.5,1.25,gz+1.2);
  pathLight.intensity=running?120+pose.staff*180:95+Math.sin(t*2.1)*12;
  staffBeam.position.set(gx,gy-1.35,gz+.2);
  staffBeam.material.opacity=running?.15+pose.staff*.12:.12+Math.sin(t*2.2)*.02;

  // Animate Encircling Goblins of Moria
  for(const gob of goblins){
   const gs=gob.spec;
   const surge=running?pose.goblinSurge:0;
   const gCycle=t*(running?7.6:2.1)+gs.phase;
   if(gs.wallClimber){
    // Goblins clambering down the colossal Dwarven pillars
    gob.group.position.set(gs.x,gs.y-surge*1.6+Math.sin(gCycle)*.25,gs.z+surge*2.2);
    gob.group.rotation.x=.55;
    gob.group.rotation.y=gs.x<0?Math.PI*.42:-Math.PI*.42;
   }else{
    // Horseshoe encirclement closing in around the Fellowship
    const pull=running?.76-.16*surge:1.08;
    const tx=gs.x*pull+Math.sin(gCycle*.5)*.28;
    const tz=gs.z*pull+(running?1.6*surge:0);
    gob.group.position.set(tx,Math.abs(Math.sin(gCycle))*(running?.14:.03),tz);
    gob.group.rotation.y=Math.atan2(-tx,5.4-tz);
   }
   gob.leftLeg.rotation.x=Math.sin(gCycle)*(running?.62:.18);
   gob.rightLeg.rotation.x=-Math.sin(gCycle)*(running?.62:.18);
   gob.rightArm.rotation.x=-.65+Math.sin(gCycle*1.3)*(running?.55:.15);
   gob.leftArm.rotation.x=-.35-Math.cos(gCycle)*(running?.35:.08);
   // Hide outer goblins slightly in calm exploration mode so the chase feels like an ambush tightening
   gob.group.visible=running||gs.index<14;
  }

  // Animate the Balrog of Morgoth Seen Afar in the Background
  const balrogZ=running?-56+pose.progress*11:-62;
  balrogObj.group.position.set(Math.sin(t*.45)*.8,1+Math.sin(t*1.1)*.18,balrogZ);
  balrogObj.group.rotation.y=Math.sin(t*.6)*.06;
  balrogObj.animateWhip(running?pose.attack:Math.sin(t*.9)*.15+.15);
  balrogLight.position.set(balrogObj.group.position.x,10.5,balrogZ+4);
  balrogLight.intensity=(running?1550:980)*pose.balrogGlow+Math.sin(t*7.5)*160;
  for(const f of balrogObj.flames){
   const b=f.userData.base,seed=f.userData.seed;
   f.position.y=b.y+Math.sin(t*3.6+seed)*.65;
   f.position.x=b.x+Math.sin(t*2.4+seed)*.28;
   f.scale.y=3.4+Math.sin(t*4.5+seed)*1.25;
  }

  // Drifting embers
  embers.rotation.y=t*.018;
  embers.position.z=running?(t*1.8)%8:0;
 }

 function dispose(){
  scene.remove(root);
  for(const r of resources)r.dispose?.();
  resources.clear();
 }

 update(0,false);
 return{
  root,
  fellowshipGroup,
  goblinGroup,
  balrog:balrogObj.group,
  gandalf:gandalfActor.group,
  staffLight,
  balrogLight,
  companions,
  goblins,
  metadata:{
   fellowshipCount:companions.length,
   fellowshipNames:FELLOWSHIP_NAMES,
   goblinCount:goblins.length,
   balrogDistance:Math.abs(balrogObj.group.position.z-gandalfActor.group.position.z)
  },
  update,
  dispose
 };
}

function createCompanion(spec,{track,addMesh,steelMat,darkIron,stingMat,staffCrystalMat}){
 const group=new THREE.Group();group.name=spec.name;
 const s=spec.height/1.8;
 group.position.set(...spec.pos);

 const cloakMat=track(new THREE.MeshStandardMaterial({color:spec.cloak,roughness:.88}));
 const tunicMat=track(new THREE.MeshStandardMaterial({color:spec.tunic,roughness:.76}));
 const trimMat=track(new THREE.MeshStandardMaterial({color:spec.trim,roughness:.45,metalness:.35}));
 const skinMat=track(new THREE.MeshStandardMaterial({color:spec.skin,roughness:.68}));
 const hairMat=track(new THREE.MeshStandardMaterial({color:spec.hair,roughness:.82}));
 const bootMat=track(new THREE.MeshStandardMaterial({color:spec.role==='hobbit'?spec.skin:0x271e18,roughness:.8}));
 const woodMat=track(new THREE.MeshStandardMaterial({color:0x4b3624,roughness:.86}));

 // Articulated legs & knees
 const makeLeg=side=>{
  const hip=new THREE.Group();hip.position.set(side*.19*s,.86*s,0);group.add(hip);
  const thigh=addMesh(new THREE.CylinderGeometry(.095*s,.082*s,.44*s,10),tunicMat,hip);
  thigh.position.y=-.22*s;
  const knee=new THREE.Group();knee.position.y=-.42*s;hip.add(knee);
  const shin=addMesh(new THREE.CylinderGeometry(.08*s,.068*s,.42*s,10),bootMat,knee);
  shin.position.y=-.21*s;
  const foot=addMesh(new THREE.BoxGeometry(.13*s,.07*s,.26*s),bootMat,knee);
  foot.position.set(0,-.41*s,.05*s);
  return{hip,knee};
 };
 const left=makeLeg(-1),right=makeLeg(1);

 // Torso & belt
 const torso=new THREE.Group();torso.position.y=.88*s;group.add(torso);
 const chest=addMesh(new THREE.CylinderGeometry(.24*s,.19*s,.66*s,14),tunicMat,torso);
 chest.position.y=.33*s;
 const belt=addMesh(new THREE.CylinderGeometry(.21*s,.21*s,.07*s,14),trimMat,torso);
 belt.position.y=.08*s;

 // Billowing travelling cloak
 const cloak=addMesh(new THREE.ConeGeometry(.42*s,1.18*s,14,1,true,Math.PI*.65,Math.PI*1.7),cloakMat,torso);
 cloak.position.set(0,.12*s,-.06*s);

 // Head, hair, beard / helm
 const head=new THREE.Group();head.position.y=.76*s;torso.add(head);
 const skull=addMesh(new THREE.SphereGeometry(.155*s,18,14),skinMat,head);
 skull.scale.set(.92,1.08,.95);
 const hair=addMesh(new THREE.SphereGeometry(.162*s,16,12),hairMat,head);
 hair.position.set(0,.03*s,-.02*s);

 if(spec.role==='wizard'){
  // Gandalf's long silver beard & pointed grey hat
  const beard=addMesh(new THREE.ConeGeometry(.12*s,.42*s,10),hairMat,head);
  beard.position.set(0,-.18*s,.08*s);beard.rotation.z=Math.PI;
  const brim=addMesh(new THREE.CylinderGeometry(.38*s,.38*s,.03*s,20),cloakMat,head);
  brim.position.y=.13*s;
  const cone=addMesh(new THREE.ConeGeometry(.21*s,.46*s,18),cloakMat,head);
  cone.position.set(0,.35*s,-.02*s);cone.rotation.x=-.12;
 }else if(spec.role==='dwarf'){
  // Gimli's thick braided beard & dwarven bronze-crested helm
  const beard=addMesh(new THREE.ConeGeometry(.14*s,.36*s,10),hairMat,head);
  beard.position.set(0,-.15*s,.09*s);beard.rotation.z=Math.PI;
  const helm=addMesh(new THREE.CylinderGeometry(.17*s,.18*s,.16*s,14),trimMat,head);
  helm.position.y=.09*s;
 }

 // Arms & characteristic weapons
 const makeArm=side=>{
  const arm=new THREE.Group();arm.position.set(side*.28*s,.58*s,0);torso.add(arm);
  const limb=addMesh(new THREE.CylinderGeometry(.072*s,.06*s,.56*s,10),cloakMat,arm);
  limb.position.y=-.26*s;
  return arm;
 };
 const leftArm=makeArm(-1),rightArm=makeArm(1);

 if(spec.weapon==='staff-sword'){
  const staff=addMesh(new THREE.CylinderGeometry(.032,.042,2.45,10),woodMat,rightArm);
  staff.name='Gandalf’s staff of Durin';
  staff.position.set(0,-.15,.22);staff.rotation.x=Math.PI*.35;
  const crown=addMesh(new THREE.SphereGeometry(.11,16,12),staffCrystalMat,staff,false,false);
  crown.position.y=1.24;
  const glamdringMat=track(new THREE.MeshStandardMaterial({color:0xf4faff,emissive:0xd8ecff,emissiveIntensity:1.25,metalness:.55,roughness:.18}));
  const glamdring=addMesh(new THREE.BoxGeometry(.045,1.08,.018),glamdringMat,leftArm);
  glamdring.name='Glamdring';
  glamdring.position.set(0,-.58,.18);glamdring.rotation.x=Math.PI*.4;
 }else if(spec.weapon==='longsword'){
  const sword=addMesh(new THREE.BoxGeometry(.042,1.05,.016),steelMat,rightArm);
  sword.position.set(0,-.56,.2);sword.rotation.x=Math.PI*.42;
 }else if(spec.weapon==='bow'){
  const bow=addMesh(new THREE.TorusGeometry(.42,.018,8,20,Math.PI),woodMat,leftArm);
  bow.position.set(0,-.48,.16);bow.rotation.z=-Math.PI/2;
 }else if(spec.weapon==='axe'){
  const haft=addMesh(new THREE.CylinderGeometry(.026,.028,.95,8),woodMat,rightArm);
  haft.position.set(0,-.48,.18);haft.rotation.x=Math.PI*.4;
  const blade=addMesh(new THREE.CylinderGeometry(.22,.22,.035,12,1,false,0,Math.PI),steelMat,haft);
  blade.position.y=.38;blade.rotation.z=Math.PI/2;
 }else if(spec.weapon==='shield-sword'){
  const shield=addMesh(new THREE.CylinderGeometry(.34,.34,.04,18),trimMat,leftArm);
  shield.position.set(-.08,-.36,.12);shield.rotation.z=Math.PI/2;
  const sword=addMesh(new THREE.BoxGeometry(.042,.96,.016),steelMat,rightArm);
  sword.position.set(0,-.52,.18);sword.rotation.x=Math.PI*.4;
 }else if(spec.weapon==='sting'){
  const sting=addMesh(new THREE.BoxGeometry(.034,.58,.014),stingMat,rightArm,false,false);
  sting.name='Sting';
  sting.position.set(0,-.38,.14);sting.rotation.x=Math.PI*.42;
 }else{
  const blade=addMesh(new THREE.BoxGeometry(.032,.54,.014),steelMat,rightArm);
  blade.position.set(0,-.36,.14);blade.rotation.x=Math.PI*.4;
  if(spec.weapon==='pack-blade'){
   const pack=addMesh(new THREE.BoxGeometry(.28,.34,.18),woodMat,torso);
   pack.position.set(0,.36,-.18);
  }
 }

 return{
  spec,
  group,
  torso,
  head,
  cloak,
  leftLeg:left.hip,
  rightLeg:right.hip,
  leftKnee:left.knee,
  rightKnee:right.knee,
  leftArm,
  rightArm
 };
}

function createGoblin(spec,{track,addMesh,goblinSkin,goblinArmor,goblinEye,steelMat}){
 const group=new THREE.Group();group.name=`Moria Goblin ${spec.index+1}`;
 const s=spec.scale*.78;
 group.position.set(spec.x,spec.y,spec.z);

 const makeLeg=side=>{
  const hip=new THREE.Group();hip.position.set(side*.16*s,.68*s,0);group.add(hip);
  const leg=addMesh(new THREE.CylinderGeometry(.075*s,.055*s,.64*s,8),goblinArmor,hip);
  leg.position.y=-.3*s;
  return hip;
 };
 const leftLeg=makeLeg(-1),rightLeg=makeLeg(1);

 const torso=addMesh(new THREE.CylinderGeometry(.21*s,.16*s,.58*s,10),goblinArmor,group);
 torso.position.y=.92*s;torso.rotation.x=.28;

 const head=new THREE.Group();head.position.set(0,1.26*s,.08*s);group.add(head);
 addMesh(new THREE.SphereGeometry(.14*s,12,10),goblinSkin,head);
 // Jagged Moria goblin iron helm
 const helm=addMesh(new THREE.ConeGeometry(.16*s,.22*s,6),goblinArmor,head);
 helm.position.y=.08*s;
 for(const side of[-1,1]){
  const eye=addMesh(new THREE.SphereGeometry(.024*s,6,6),goblinEye,head,false,false);
  eye.position.set(side*.052*s,.015*s,.125*s);
 }

 const leftArm=new THREE.Group();leftArm.position.set(-.23*s,1.12*s,0);group.add(leftArm);
 const rightArm=new THREE.Group();rightArm.position.set(.23*s,1.12*s,0);group.add(rightArm);
 addMesh(new THREE.CylinderGeometry(.058*s,.048*s,.48*s,8),goblinSkin,leftArm).position.y=-.22*s;
 addMesh(new THREE.CylinderGeometry(.058*s,.048*s,.48*s,8),goblinSkin,rightArm).position.y=-.22*s;

 if(spec.weapon==='spear'){
  const spear=addMesh(new THREE.CylinderGeometry(.018,.018,1.85,6),steelMat,rightArm);
  spear.position.set(0,-.35,.35);spear.rotation.x=Math.PI*.44;
 }else{
  const scimitar=addMesh(new THREE.BoxGeometry(.038,.68,.014),steelMat,rightArm);
  scimitar.position.set(0,-.38,.2);scimitar.rotation.x=Math.PI*.4;
  if(spec.weapon==='scimitar-shield'){
   const buckler=addMesh(new THREE.CylinderGeometry(.24,.24,.035,8),goblinArmor,leftArm);
   buckler.position.set(-.06,-.28,.12);buckler.rotation.z=Math.PI/2;
  }
 }

 return{spec,group,leftLeg,rightLeg,leftArm,rightArm};
}

function createDistantBalrog({track,addMesh,rock,moltenMat,flameTexture}){
 const group=new THREE.Group();group.name='Balrog of Morgoth (Afar)';
 group.position.set(0,1,-58);
 const skin=track(new THREE.MeshStandardMaterial({
  color:0x0b0909,
  map:rock?.map||null,
  normalMap:rock?.normalMap||null,
  roughness:.92,
  emissive:0x4e1400,
  emissiveIntensity:.35
 }));

 // Towering horned silhouette wreathed in flame far in the background
 const chest=addMesh(new THREE.SphereGeometry(1,24,18),skin,group);
 chest.position.set(0,7.4,0);chest.scale.set(2.5,1.9,1.35);
 const abdomen=addMesh(new THREE.SphereGeometry(1,20,16),skin,group);
 abdomen.position.set(0,5.2,0);abdomen.scale.set(1.45,2.0,.95);
 const head=addMesh(new THREE.SphereGeometry(1,20,16),skin,group);
 head.position.set(0,9.6,.4);head.scale.set(.95,1.25,.95);

 // Molten eyes, roaring maw & curled ram horns
 for(const s of[-1,1]){
  const eye=addMesh(new THREE.SphereGeometry(.22,10,8),moltenMat,group,false,false);
  eye.position.set(s*.42,9.8,1.18);eye.scale.set(1.2,.45,.5);
  const hornCurve=new THREE.CatmullRomCurve3([
   new THREE.Vector3(s*.8,10.1,0),
   new THREE.Vector3(s*2.1,10.8,-.3),
   new THREE.Vector3(s*2.6,12.2,-.5),
   new THREE.Vector3(s*1.4,12.9,-.2)
  ]);
  addMesh(new THREE.TubeGeometry(hornCurve,16,.34,8,false),skin,group);

  const legCurve=new THREE.CatmullRomCurve3([
   new THREE.Vector3(s*1.3,4.2,0),
   new THREE.Vector3(s*1.9,2.1,.4),
   new THREE.Vector3(s*2.1,0,1.0)
  ]);
  addMesh(new THREE.TubeGeometry(legCurve,14,.68,8,false),skin,group);

  const armCurve=new THREE.CatmullRomCurve3([
   new THREE.Vector3(s*1.8,8.0,0),
   new THREE.Vector3(s*3.9,6.8,.3),
   new THREE.Vector3(s*4.7,5.0,1.1)
  ]);
  addMesh(new THREE.TubeGeometry(armCurve,14,.72,8,false),skin,group);

  // Vast shadow-smoke wings spanning between the distant pillars
  const wingMat=track(new THREE.MeshStandardMaterial({color:0x1b1210,emissive:0x320a00,emissiveIntensity:.28,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false}));
  const shape=new THREE.Shape();
  shape.moveTo(0,0);
  shape.bezierCurveTo(s*4,6,s*10,7.5,s*15,4.8);
  shape.bezierCurveTo(s*11,2.2,s*9,-3.5,s*4.5,-3.2);
  shape.lineTo(0,0);
  const wing=addMesh(new THREE.ShapeGeometry(shape),wingMat,group,false,false);
  wing.position.set(s*1.1,7.6,-1.6);
 }

 // Molten fire veins across torso
 for(let i=0;i<8;i++){
  const s=i%2?1:-1,row=Math.floor(i/2);
  const vein=new THREE.CatmullRomCurve3([
   new THREE.Vector3(s*.35,8.2-row*.6,1.25),
   new THREE.Vector3(s*1.1,7.9-row*.6,1.38),
   new THREE.Vector3(s*1.8,7.5-row*.6,1.1)
  ]);
  addMesh(new THREE.TubeGeometry(vein,10,.05,6,false),moltenMat,group,false,false);
 }

 // Fiery multi-thonged whip
 const idle=[[4.6,5.2,1.1],[7.4,6.4,2.2],[9.5,10.4,3.2],[7.2,13.4,2.0],[3.2,14.4,0]];
 const strike=[[4.6,5.2,1.1],[6.2,7.5,8.0],[3.4,6.4,16.5],[1.2,3.6,22.0],[-.4,2.4,26.0]];
 const whipCurve=new THREE.CatmullRomCurve3(idle.map(p=>new THREE.Vector3(...p)));
 const whip=addMesh(new THREE.TubeGeometry(whipCurve,20,.09,6,false),moltenMat,group,false,false);

 function animateWhip(attack=0){
  const a=clamp(attack,0,1);
  const curve=new THREE.CatmullRomCurve3(idle.map((p,i)=>new THREE.Vector3(...p.map((v,j)=>v*(1-a)+strike[i][j]*a))));
  const frames=curve.computeFrenetFrames(20,false),pos=whip.geometry.attributes.position,norm=whip.geometry.attributes.normal;
  for(let i=0;i<=20;i++){
   const p=curve.getPointAt(i/20),n=frames.normals[i],b=frames.binormals[i];
   for(let j=0;j<=6;j++){
    const ang=j/6*Math.PI*2,x=Math.cos(ang)*n.x+Math.sin(ang)*b.x,y=Math.cos(ang)*n.y+Math.sin(ang)*b.y,z=Math.cos(ang)*n.z+Math.sin(ang)*b.z,idx=i*7+j;
    pos.setXYZ(idx,p.x+x*.09,p.y+y*.09,p.z+z*.09);
    norm.setXYZ(idx,x,y,z);
   }
  }
  pos.needsUpdate=norm.needsUpdate=true;
 }

 const flames=[];
 if(flameTexture){
  const spriteMat=track(new THREE.SpriteMaterial({map:flameTexture,color:0xffffff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  for(let i=0;i<36;i++){
   const f=new THREE.Sprite(spriteMat);
   f.position.set((rand(i+1)-.5)*5.5,4.2+rand(i+8)*8.8,-.6+(rand(i+7)-.5)*2.5);
   f.scale.set(1.4+rand(i)*1.8,3.4+rand(i+1)*4.0,1);
   f.userData.base=f.position.clone();
   f.userData.seed=i;
   group.add(f);
   flames.push(f);
  }
 }

 return{group,whip,flames,animateWhip};
}
