import {applyOrganicSurface} from './organic-surface.js';
import * as THREE from './assets/vendor/three.module.js';

// True geometric inhabitants. Bodies, facial features, curls, bare feet and clothing
// use merged vertex-colored meshes; arms and legs remain articulated in 3D.
const SKIN=[0xc99a79,0xd6ad88,0xba8663,0xe0b897,0xb88c6b];
const HAIR=[0x35261e,0x4a3325,0x65442d,0x342c25,0x867363];
const SHIRTS=[0xd8c7a3,0xa5b59b,0xc4b59b,0xb9c2be,0xc9a77f];
const VESTS=[0x6a5537,0x586348,0x79513a,0x6a443b,0x5b6164];
const PANTS=[0x665d48,0x6b604e,0x56554b,0x7b6a51];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fract=x=>x-Math.floor(x);
const random=(i,s=0)=>fract(Math.sin(i*127.1+s*311.7)*43758.5453);

class MeshAssembler{
 constructor(geometries){this.geometries=geometries;this.vertices=[];this.normals=[];this.colors=[];this.cloth=[];this.dummy=new THREE.Object3D();}
 add(type,position,scale,color,rotation=[0,0,0],cloth=0){
  const g=typeof type==='string'?this.geometries[type]:type,p=g.attributes.position,n=g.attributes.normal,index=g.index;
  this.dummy.position.set(...position);this.dummy.scale.set(...scale);this.dummy.rotation.set(...rotation);this.dummy.updateMatrix();
  const normalMatrix=new THREE.Matrix3().getNormalMatrix(this.dummy.matrix),v=new THREE.Vector3(),normal=new THREE.Vector3(),c=new THREE.Color(color);
  const count=index?index.count:p.count;
  for(let i=0;i<count;i++){const at=index?index.getX(i):i;v.fromBufferAttribute(p,at).applyMatrix4(this.dummy.matrix);normal.fromBufferAttribute(n,at).applyMatrix3(normalMatrix).normalize();this.vertices.push(v.x,v.y,v.z);this.normals.push(normal.x,normal.y,normal.z);const grain=type==='head'?(random(at,11)-.5)*.026:0;this.colors.push(c.r*(1+grain),c.g*(1+grain*.6),c.b*(1+grain*.4));this.cloth.push(cloth);}
 }
 finish(material,resources){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.colors,3));g.setAttribute('aCloth',new THREE.Float32BufferAttribute(this.cloth,1));g.computeBoundingSphere();resources.add(g);const mesh=new THREE.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;return mesh;}
}
function clothSurface(){
 const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:0});
 m.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float aCloth;varying float vHobbitCloth;varying vec3 vHobbitLocal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHobbitCloth=aCloth;vHobbitLocal=position;');
  shader.fragmentShader='varying float vHobbitCloth;varying vec3 vHobbitLocal;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat weave=(sin(vHobbitLocal.x*2200.)*sin(vHobbitLocal.y*1800.)*.018);diffuseColor.rgb*=1.+weave*vHobbitCloth;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.56,.96,clamp(vHobbitCloth,0.,1.));');
 };m.customProgramCacheKey=()=> 'hobbit-merged-cloth-v2';return m;
}
function skinSurface(){
 const m=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.53,metalness:0,clearcoat:.028,clearcoatRoughness:.68,sheen:.14,sheenColor:0xa97761,sheenRoughness:.7});
 m.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vSkinPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSkinPosition=position;');
  shader.fragmentShader='varying vec3 vSkinPosition;\nfloat skinHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z); }\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float pores=skinHash(floor(vSkinPosition*1450.));float tone=skinHash(floor(vSkinPosition*130.));
   float cheeks=exp(-pow((abs(vSkinPosition.x)-.051)/.027,2.)-pow((vSkinPosition.y-.428)/.028,2.))*smoothstep(.035,.075,vSkinPosition.z);
   diffuseColor.rgb*=.974+tone*.035+pores*.02;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.055,.962,.948),cheeks*.55);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=.51+skinHash(floor(vSkinPosition*1100.))*.105;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec2 poreUV=vSkinPosition.xy*1250.;vec2 cell=floor(poreUV),local=fract(poreUV);vec2 center=vec2(.25+skinHash(vec3(cell,1.))*.5,.25+skinHash(vec3(cell,2.))*.5);
   float poreDent=1.-smoothstep(.06,.24,length(local-center));float poreLod=clamp(1.-length(fwidth(poreUV))*.65,0.,1.);
   normal=normalize(normal+vec3(-dFdx(poreDent),-dFdy(poreDent),0.)*.075*poreLod);`);
 };m.customProgramCacheKey=()=> 'hobbit-natural-skin-v4';return applyOrganicSurface(m,'skin');
}
function makeGeometries(quality){
 const ultra=quality==='4k',detail=ultra?28:quality==='high'?20:14,headWidth=ultra?80:quality==='high'?56:36,headHeight=ultra?64:quality==='high'?44:28;
 const head=new THREE.SphereGeometry(1,headWidth,headHeight),p=head.attributes.position;
 const bump=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2)-(((y-cy)/sy)**2));
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const front=Math.max(0,z),jaw=1+.025*bump(x,y,0,-.43,1,.22)-.115*bump(x,y,0,-.88,.8,.16);x*=jaw*(1+x*.011*y);
  if(z>0){z*=.88;z+=front*(.035*bump(x,y,0,.54,.85,.48)+.078*bump(x,y,0,-.66,.52,.22));
   z-=front*.072*(bump(x,y,-.4,.18,.24,.18)+bump(x,y,.4,.18,.24,.18));
   z+=front*.054*(bump(x,y,-.46,.32,.29,.10)+bump(x,y,.46,.32,.29,.10));
   z+=front*.046*(bump(x,y,-.56,-.12,.25,.20)+bump(x,y,.56,-.12,.25,.20));
   z-=front*.018*bump(x,y,0,-.28,.18,.12);z+=front*.16*bump(x,y,0,.06,.12,.27);}
  if(y<-.65)y=-.65+(y+.65)*.7;
  p.setXYZ(i,x,y,z);
 }head.computeVertexNormals();
 const torso=new THREE.LatheGeometry([new THREE.Vector2(.12,0),new THREE.Vector2(.145,.035),new THREE.Vector2(.16,.17),new THREE.Vector2(.155,.23),new THREE.Vector2(.12,.29)],ultra?36:24);
 const tp=torso.attributes.position;for(let i=0;i<tp.count;i++){const x=tp.getX(i),y=tp.getY(i),z=tp.getZ(i),a=Math.atan2(z,x),wrinkle=Math.sin(a*15+y*25)*Math.sin(y*35)*.0014;tp.setXYZ(i,x+Math.cos(a)*wrinkle,y,z+Math.sin(a)*wrinkle);}torso.computeVertexNormals();
 return {sphere:new THREE.SphereGeometry(1,detail,Math.max(10,detail-8)),head,
  curl:new THREE.TorusGeometry(1,.22,4,8),fineRing:new THREE.TorusGeometry(1,.035,5,24),cylinder:new THREE.CylinderGeometry(1,1,1,ultra?18:12),box:new THREE.BoxGeometry(1,1,1),torso,
  skirt:new THREE.LatheGeometry([new THREE.Vector2(.17,0),new THREE.Vector2(.185,.03),new THREE.Vector2(.175,.18),new THREE.Vector2(.13,.30)],ultra?36:24)};
}
function addCurve(assembler,points,radius,color,segments=12){
 const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point))),geometry=new THREE.TubeGeometry(curve,segments,radius,4,false);
 assembler.add(geometry,[0,0,0],[1,1,1],color);geometry.dispose();
}
function detailedHead(index,quality,geometries,materials,resources,skin,hair){
 const group=new THREE.Group(),surface=new MeshAssembler(geometries),eyes=new MeshAssembler(geometries),strands=new MeshAssembler(geometries),ultra=quality==='4k';
 const width=.096+(random(index,41)-.5)*.009,cheight=.122+(random(index,42)-.5)*.009,centerY=.445,asym=(random(index,44)-.5)*.0015;
 surface.add('head',[0,centerY,0],[width,cheight,.087],skin);
 // The bridge, alae and columella merge into one small anatomical nose.
 surface.add('sphere',[asym,.435,.092],[.018,.012,.016],skin);
 for(const side of[-1,1]){
  surface.add('sphere',[asym+side*.013,.433,.088],[.008,.007,.009],skin);
  surface.add('sphere',[asym+side*.011,.429,.098],[.0037,.0018,.0023],0x704e40);
 }
 surface.add('sphere',[asym,.43,.1],[.0028,.005,.004],skin);
 // Fine lip rolls follow a relaxed adult mouth, without detached cheek spheres.
 addCurve(surface,[[-.027,.405,.075],[-.014,.408,.08],[0,.4068,.081],[.014,.408,.080],[.027,.405,.075]],.00155,0xa56e61,14);
 addCurve(surface,[[-.026,.4037,.075],[-.014,.4028,.08],[.001,.402,.081],[.015,.403,.079],[.027,.404,.075]],.0021,0xb77e6c,14);
 addCurve(surface,[[-.027,.4047,.076],[0,.4045,.0815],[.027,.4047,.076]],.00055,0x765248,12);
 for(const side of[-1,1]){
  const eyeX=side*.037,eyeY=.467+(side===1?asym:0),eyeZ=.067;
  eyes.add('sphere',[eyeX,eyeY,eyeZ],[.0115,.0049,.0055],0xb7b8aa);
  eyes.add('sphere',[eyeX+asym*.4,eyeY,.0725],[.0048,.0045,.0016],index%3===0?0x617370:index%3===1?0x63543c:0x5c6945);
  eyes.add('sphere',[eyeX+asym*.4,eyeY,.0738],[.0021,.0027,.0008],0x161c18);
  eyes.add('sphere',[eyeX-.0015,eyeY+.0015,.0745],[.00065,.00065,.00035],0xe5e7df);
  const upper=[],lower=[];for(let j=0;j<=12;j++){const a=j/12*Math.PI,x=eyeX+Math.cos(a)*.012;upper.push([x,eyeY+Math.sin(a)*.0045+.0005,.0705+Math.sin(a)*.0017]);lower.push([x,eyeY-Math.sin(a)*.0032-.0005,.0705+Math.sin(a)*.0012]);}
  addCurve(surface,upper,.0015,skin,16);addCurve(surface,lower,.00125,skin,16);
  if(index%3===0)for(let crease=0;crease<2;crease++)addCurve(surface,[[eyeX+side*.014,eyeY-.001-crease*.003,.068],[eyeX+side*.022,eyeY-.004-crease*.004,.066],[eyeX+side*.027,eyeY-.006-crease*.005,.063]],.00026,new THREE.Color(skin).multiplyScalar(.86),6);
  // Brow strands taper and lean naturally over the orbital ridge.
  for(let j=0;j<(ultra?19:12);j++){const f=j/(ultra?18:11),x=eyeX+(f-.5)*.035,y=.4805+Math.sin(f*Math.PI)*.0025;addCurve(strands,[[x,y,.071],[x+side*.0015,y+.002,.070],[x+side*.003,y+.0028,.069]],.00038,hair,3);}
  const earX=side*(width*.99),earColor=new THREE.Color(skin).multiplyScalar(.96);
  surface.add('sphere',[earX,.441,-.008],[.0125,.026,.011],earColor);
  surface.add('sphere',[earX+side*.003,.44,.001],[.0055,.013,.0024],0xae7c64);
  const helix=[];for(let j=0;j<=16;j++){const a=-.7+j/16*Math.PI*1.75;helix.push([earX+side*(.006+Math.cos(a)*.009),.443+Math.sin(a)*.024,.001+Math.cos(a)*.0015]);}addCurve(surface,helix,.0017,skin,20);
  addCurve(surface,[[earX+side*.005,.425,.004],[earX+side*.006,.443,.005],[earX+side*.009,.455,.003]],.00135,skin,12);
 }
 const face=surface.finish(materials.skin,resources);face.name='Hobbit sculpted face';group.add(face);
 const eyeMesh=eyes.finish(materials.eyes,resources);eyeMesh.name='Hobbit inset eyes';group.add(eyeMesh);
 // A contour-cut scalp and hundreds of non-torus, irregular curled strands.
 const lat=ultra?34:24,lon=ultra?64:40,positions=[],indices=[];
 const scalp=(u,v)=>{const phi=u*Math.PI*2,front=Math.max(0,Math.sin(phi)),maxTheta=1.67-front*.69+Math.sin(phi*13)*.025+Math.sin(phi*27)*.012,theta=v*maxTheta,ripple=1+(Math.sin(phi*13+theta*8)+Math.sin(phi*23-theta*15))*.004;return new THREE.Vector3(Math.sin(theta)*Math.cos(phi)*(width+.002)*ripple,centerY+Math.cos(theta)*(cheight+.002)*ripple,Math.sin(theta)*Math.sin(phi)*.089*ripple);};
 for(let j=0;j<=lat;j++)for(let i=0;i<=lon;i++){const p=scalp(i/lon,j/lat);positions.push(p.x,p.y,p.z);if(i<lon&&j<lat){const a=j*(lon+1)+i;indices.push(a,a+1,a+lon+1,a+1,a+lon+2,a+lon+1);}}
 const capGeometry=new THREE.BufferGeometry();capGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));capGeometry.setIndex(indices);capGeometry.computeVertexNormals();strands.add(capGeometry,[0,0,0],[1,1,1],hair);capGeometry.dispose();
 const count=ultra?330:quality==='high'?210:110;
 for(let i=0;i<count;i++){
  const u=random(i,71+index),v=.18+random(i,72+index)*.81,phi=u*Math.PI*2,base=scalp(u,v),normal=base.clone().sub(new THREE.Vector3(0,centerY,0)).normalize(),tangent=new THREE.Vector3(-Math.sin(phi),0,Math.cos(phi)),bitangent=new THREE.Vector3().crossVectors(normal,tangent).normalize(),points=[],len=.007+random(i,81)*.012,curl=.002+random(i,83)*.0026;
  for(let j=0;j<=9;j++){const f=j/9,angle=f*Math.PI*(1.3+random(i,84)*2.2),p=base.clone().addScaledVector(tangent,(f-.5)*len).addScaledVector(normal,.0007+Math.sin(angle)*curl).addScaledVector(bitangent,Math.cos(angle)*curl+f*.002);points.push(p.toArray());}
  const color=new THREE.Color(hair).multiplyScalar(.83+random(i,86)*.34);addCurve(strands,points,.00045+random(i,87)*.00045,color,ultra?12:9);
 }
 const hairMesh=strands.finish(materials.hair,resources);hairMesh.name='Hobbit fine curly hair';group.add(hairMesh);group.userData={detail:quality,sculpted:true,headSegments:ultra?[80,64]:quality==='high'?[56,44]:[36,28],strands:count};
 group.scale.setScalar(.85);group.position.y=.0204;group.userData.adultHeadScale=.85;return group;
}
function buildCharacter(index,placement,quality,geometries,materials,resources){
 const material=materials.surface;
 const root=new THREE.Group(),bodyPivot=new THREE.Group();root.add(bodyPivot);bodyPivot.position.y=.38;
 const skin=placement.skin??SKIN[index%SKIN.length],hair=placement.hair??HAIR[index%HAIR.length],shirt=placement.shirt??SHIRTS[index%SHIRTS.length],vest=placement.waistcoat??VESTS[index%VESTS.length],trousers=PANTS[index%PANTS.length],skirt=Boolean(placement.skirt);
 const body=new MeshAssembler(geometries);
 // Torso profile is rounded and full rather than an oversized cone.
 body.add('torso',[0,0,0],[1,1,.69],vest,[0,0,0],1);
 body.add('sphere',[0,.16,.095],[.075,.145,.023],shirt,[0,0,0],1);
 body.add('cylinder',[0,.285,0],[.034,.062,.032],skin);
 for(const side of[-1,1])body.add('sphere',[side*.122,.235,0],[.049,.052,.055],shirt,[0,0,0],1);
 bodyPivot.add(detailedHead(index,quality,geometries,materials,resources,skin,hair));
 // Shaped collar, waistcoat edging, a leather belt and tiny brass buttons.
 for(const side of[-1,1]){
  body.add('box',[side*.033,.265,.099],[.046,.055,.012],shirt,[0,0,side*.4],1);
  body.add('box',[side*.073,.16,.116],[.007,.17,.01],vest,[0,0,-side*.25],1);
 }
 body.add('box',[0,.035,.106],[.25,.022,.019],0x574731);
 body.add('box',[0,.035,.119],[.028,.026,.008],0x9c8254);
 for(let i=0;i<4;i++)body.add('sphere',[.012,.075+i*.043,.122],[.006,.006,.004],0x9b875a);
 // Subtle tailored fabric folds around the shoulders, waist and shirt front.
 for(let fold=0;fold<5;fold++){const x=(fold-2)*.023;addCurve(body,[[x,.07,.119],[x+.004,.13,.121],[x-.002,.2,.112]],.0008,new THREE.Color(shirt).multiplyScalar(.9),8);}
 if(skirt){body.add('skirt',[0,-.27,0],[1,1,.74],trousers,[0,0,0],1);body.add('box',[0,-.13,.141],[.23,.25,.014],0xb5ad92,[0,0,0],1);}
 bodyPivot.add(body.finish(material,resources));
 const arms=[],legs=[],feet=[];
 for(const side of[-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(side*.148,.235,0);bodyPivot.add(shoulder);
  const upper=new MeshAssembler(geometries);upper.add('sphere',[0,-.065,0],[.041,.094,.043],shirt,[0,0,0],1);shoulder.add(upper.finish(material,resources));
  const elbow=new THREE.Group();elbow.position.y=-.13;shoulder.add(elbow);
  const forearm=new MeshAssembler(geometries);forearm.add('sphere',[0,-.055,0],[.032,.076,.032],shirt,[0,0,0],1);forearm.add('sphere',[0,-.123,.006],[.028,.036,.019],skin);
  for(let finger=0;finger<4;finger++)forearm.add('sphere',[(finger-1.5)*.01,-.148,.013],[.006,.019,.006],skin,[0,0,(finger-1.5)*.05]);
  forearm.add('sphere',[-side*.026,-.123,.014],[.01,.023,.009],skin,[0,0,-side*.5]);elbow.add(forearm.finish(material,resources));arms.push({shoulder,elbow,side});
  const hip=new THREE.Group();hip.position.set(side*.075,.38,0);root.add(hip);
  const thigh=new MeshAssembler(geometries);thigh.add('sphere',[0,-.072,0],[.059,.105,.064],trousers,[0,0,0],1);hip.add(thigh.finish(material,resources));
  const knee=new THREE.Group();knee.position.y=-.15;hip.add(knee);
  const lower=new MeshAssembler(geometries);lower.add('sphere',[0,-.07,0],[.043,.09,.046],trousers,[0,0,0],1);lower.add('sphere',[0,-.15,0],[.026,.052,.029],skin);knee.add(lower.finish(material,resources));
  const foot=new THREE.Group();foot.position.set(0,-.184,.028);knee.add(foot);
  const footMesh=new MeshAssembler(geometries);footMesh.add('sphere',[0,-.019,.025],[.052,.032,.096],skin);
  for(let toe=0;toe<5;toe++){const offset=(toe-2)*.017;footMesh.add('sphere',[offset,-.018,.105-Math.abs(toe-1)*.006],[.011,.018,.024],skin);}
  for(let curl=0;curl<8;curl++)footMesh.add('curl',[(random(curl,index)-.5)*.055,.013,.014+random(curl+5,index)*.046],[.005,.005,.005],hair,[Math.PI/2,0,random(curl+4,index)*3]);
  foot.add(footMesh.finish(material,resources));feet.push({group:foot,restY:-.184});legs.push({hip,knee,side});
 }
 let basket=null,tool=null;
 if(placement.activity==='carry'){
  const build=new MeshAssembler(geometries);build.add('cylinder',[0,0,0],[.105,.13,.085],0x9a784b);build.add('fineRing',[0,.065,0],[.106,.106,.085],0xb18f5c,[Math.PI/2,0,0]);
  for(let row=0;row<4;row++)build.add('fineRing',[0,-.05+row*.033,0],[.107,.107,.086],0x705c3b,[Math.PI/2,0,0]);
  for(let i=0;i<6;i++)build.add('sphere',[(random(i,index)-.5)*.12,.065+random(i+4,index)*.03,(random(i+5,index)-.5)*.09],[.025,.03,.025],i%2?0x8e5334:0x879047);
  basket=build.finish(material,resources);basket.position.set(0,.44,.2);root.add(basket);
 }
 if(placement.activity==='garden'){
  const build=new MeshAssembler(geometries);build.add('cylinder',[0,-.04,0],[.009,.43,.009],0x78603d);build.add('box',[0,-.28,.014],[.075,.13,.025],0x6c736b);tool=build.finish(material,resources);root.add(tool);tool.position.set(.17,.3,.25);tool.rotation.x=-.22;
 }
 const height=placement.height??(.99+random(index,17)*.16);root.scale.setScalar(height/1.06);
 root.name=placement.name||`Hobbit inhabitant ${index+1}`;root.userData={kind:'hobbit',height,bareFeet:true,curlyHair:true,activity:placement.activity||'chat'};
 return{group:root,bodyPivot,arms,legs,feet,basket,tool,height,activity:placement.activity||'chat',placement,focus:[placement.x||0,0,placement.z||0],phase:random(index,5)*Math.PI*2};
}
const DEFAULTS=[
 {x:-8,z:4,activity:'chat',yaw:.5},{x:-7,z:5,activity:'chat',yaw:-2.4},
 {x:5,z:6,activity:'walk',path:[[5,6],[7,10],[3,14],[-1,10]]},
 {x:10,z:-4,activity:'garden'},{x:-12,z:-5,activity:'carry',path:[[-12,-5],[-10,0],[-6,2]]},
 {x:13,z:11,activity:'chat',skirt:true},{x:14,z:12,activity:'chat',yaw:3},
 {x:-4,z:-10,activity:'garden',skirt:true},{x:2,z:14,activity:'walk',path:[[2,14],[-2,18],[-6,15]]},
 {x:16,z:-8,activity:'carry'},{x:-16,z:12,activity:'walk',path:[[-16,12],[-13,17],[-9,13]]},
 {x:-3,z:9,activity:'chat'}
];
function curveFor(placement){if(!placement.path||placement.path.length<2)return null;const points=placement.path.map(([x,z])=>new THREE.Vector3(x,0,z));return new THREE.CatmullRomCurve3(points,true,'centripetal',.4);}
export function createHobbitVillagePeople(scene,terrain,{quality='high',placements=[]}={}){
 if(!scene?.add||typeof terrain?.height!=='function')throw Error('A Three.js scene and terrain.height are required.');
 const resources=new Set(),geometries=makeGeometries(quality),materials={surface:clothSurface(),skin:skinSurface(),eyes:new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.18,clearcoat:.9,clearcoatRoughness:.12}),hair:new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.43,sheen:.45,sheenRoughness:.3,sheenColor:0x988168})};Object.values(materials).forEach(m=>resources.add(m));Object.values(geometries).forEach(g=>resources.add(g));
 const people=(placements.length?placements:DEFAULTS).map((placement,index)=>{const person=buildCharacter(index,placement,quality,geometries,materials,resources);person.path=curveFor(placement);person.pathLength=person.path?.getLength()||1;scene.add(person.group);return person;});
 let disposed=false;
 const feetPosition=new THREE.Vector3();
 function update(time=0){if(disposed)return;const t=Number.isFinite(time)?time:0;
  for(const person of people){
   const p=person.placement,phase=person.phase,walk=Boolean(person.path),speed=person.activity==='carry'?.27:.38;
   let x=p.x||0,z=p.z||0,yaw=p.yaw||0;
   if(person.path){const f=((t*speed/person.pathLength+phase/(Math.PI*2))%1+1)%1,point=person.path.getPointAt(f),tangent=person.path.getTangentAt(f);x=point.x;z=point.z;yaw=Math.atan2(tangent.x,tangent.z);}
   const base=terrain.height(x,z);person.group.position.set(x,base+.015,z);person.group.rotation.y=yaw;
   const stride=walk?Math.sin(t*4.2+phase):0,breathe=Math.sin(t*1.2+phase)*.003;
   person.bodyPivot.rotation.set(person.activity==='garden'?.24+Math.sin(t*.75+phase)*.055:0,0,walk?stride*.025:0);person.bodyPivot.position.y=.38+breathe+(walk?Math.abs(stride)*.009:0);
   for(const{hip,knee,side}of person.legs){const swing=stride*side;hip.rotation.x=walk?swing*.28:person.activity==='garden'?.025:0;knee.rotation.x=walk?Math.max(0,-swing)*.32:.025;}
   for(const{shoulder,elbow,side}of person.arms){
    shoulder.rotation.set(walk?-stride*side*.2:0,0,side*.07);elbow.rotation.x=-.06;
    if(person.activity==='carry'){shoulder.rotation.x=-.5;shoulder.rotation.z=side*.20;elbow.rotation.x=-.88;}
    else if(person.activity==='garden'){shoulder.rotation.x=-.48+Math.sin(t*.75+phase)*.13;elbow.rotation.x=-.26;}
    else if(person.activity==='chat'){shoulder.rotation.x=Math.sin(t*.6+phase+side)*.08;elbow.rotation.x=-.12-Math.max(0,Math.sin(t*.8+phase))*((side===1)?.25:.06);}
   }
   if(person.tool)person.tool.rotation.x=-.22+Math.sin(t*.75+phase)*.09;
   for(const foot of person.feet)foot.group.position.y=foot.restY;
   person.group.updateMatrixWorld(true);
   // Plant each bare foot on its own terrain sample, including uneven paths.
   for(const foot of person.feet){foot.group.getWorldPosition(feetPosition);const ground=terrain.height(feetPosition.x,feetPosition.z),footBottom=feetPosition.y-.051*person.group.scale.y;if(footBottom<ground+.008){foot.group.position.y+=(ground+.008-footBottom)/person.group.scale.y;}}
   person.focus[0]=x;person.focus[1]=base+person.height*.8;person.focus[2]=z;
  }
 }
 function dispose(){if(disposed)return;disposed=true;for(const person of people)scene.remove(person.group);for(const resource of resources)resource.dispose();resources.clear();}
 update(0);
 return{count:people.length,people,update,dispose,metadata:{type:'fully-geometric-articulated-hobbits',heightRange:[.99,1.15],bareFeet:true,curlyHair:true,imageBased:false,quality,anatomicalFaces:true,adultHeadScale:.85,separateSkinEyeHairMaterials:true,activities:[...new Set(people.map(p=>p.activity))]}};
}
