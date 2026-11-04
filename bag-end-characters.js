import {applyOrganicSurface} from './organic-surface.js';
import * as THREE from './assets/vendor/three.module.js';
import {createHobbitVillagePeople} from './hobbit-characters.js';
import {BAG_END_LAYOUT as L} from './bag-end-layout.js';
import {clamp} from './atlas-terrain.js';

function wool(color){
 const m=new THREE.MeshPhysicalMaterial({color,roughness:.96,sheen:.32,sheenColor:0xb8b2a6,sheenRoughness:.9});
 m.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vWizardCloth;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWizardCloth=position;');shader.fragmentShader='varying vec3 vWizardCloth;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat fibre=sin(vWizardCloth.x*1250.)*sin(vWizardCloth.y*1150.);float weaveLod=1.-smoothstep(.5,2.,length(fwidth(vWizardCloth.xy*1250.)));diffuseColor.rgb*=1.+fibre*.035*weaveLod;');};m.customProgramCacheKey=()=> 'bag-end-wizard-wool-v1';return m;
}
function buildWizard(resources){
 const root=new THREE.Group();root.name='Gandalf the Grey';root.userData={kind:'wizard',height:2.32,greyCloak:true,staff:true};
 const robe=wool(0x77786f),cloak=wool(0x666b67),hatMat=wool(0x757970),skin=applyOrganicSurface(new THREE.MeshPhysicalMaterial({color:0xc0a48d,roughness:.64}),'skin'),hair=new THREE.MeshStandardMaterial({color:0xd0cbbd,roughness:.85}),boot=new THREE.MeshStandardMaterial({color:0x423b31,roughness:.88}),wood=new THREE.MeshStandardMaterial({color:0x65513c,roughness:.94});
 for(const m of[robe,cloak,hatMat,skin,hair,boot,wood])resources.add(m);
 const mesh=(geometry,material,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0])=>{resources.add(geometry);const o=new THREE.Mesh(geometry,material);o.position.set(...position);o.scale.set(...scale);o.rotation.set(...rotation);o.castShadow=o.receiveShadow=true;root.add(o);return o;};
 const sphere=(position,scale,material)=>mesh(new THREE.SphereGeometry(1,24,18),material,position,scale);
 const tube=(points,radius,material,segments=20)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,radius,7,false),material);
 const rg=new THREE.LatheGeometry([[.24,.07],[.39,.14],[.35,.45],[.30,.85],[.28,1.12],[.25,1.45],[.32,1.67],[.22,1.79]].map(p=>new THREE.Vector2(...p)),56);
 const rp=rg.attributes.position;for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),a=Math.atan2(z,x),fold=Math.sin(a*18+y*.7)*(.014+.014*(1-y/1.9));rp.setXYZ(i,x+Math.cos(a)*fold,y,z+Math.sin(a)*fold);}rg.computeVertexNormals();mesh(rg,robe);
 const positions=[],uv=[],indices=[],rows=46,columns=54;
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const t=j/rows,a=.58+(Math.PI*2-1.16)*i/columns,r=.25+t*.26+Math.sin(a*14+t*1.5)*(.012+t*.026),y=1.83-t*1.75;
  positions.push(Math.sin(a)*r,y+.035*Math.sin(a*3)*t,Math.cos(a)*r-.035);uv.push(i/columns,t);if(i<columns&&j<rows){const k=j*(columns+1)+i;indices.push(k,k+columns+1,k+1,k+1,k+columns+1,k+columns+2);}
 }
 const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));cg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));cg.setIndex(indices);cg.computeVertexNormals();cloak.side=THREE.DoubleSide;const cloakMesh=mesh(cg,cloak);
 const sleeves=[];for(const side of[-1,1]){
  sleeves.push(mesh(new THREE.CapsuleGeometry(.115,.55,8,24),robe,[side*.32,1.46,.02],[1,1,1],[0,0,side*.16]));
  sphere([side*.37,1.14,.08],[.07,.1,.065],skin);for(let finger=0;finger<4;finger++)sphere([side*.37+(finger-1.5)*.023,1.09,.105],[.013,.045,.014],skin);
  sphere([side*.13,.09,.1],[.1,.1,.21],boot);
 }
 sphere([0,1.91,0],[.105,.14,.10],skin);sphere([0,2.075,.015],[.145,.2,.132],skin);mesh(new THREE.SphereGeometry(1,36,24,Math.PI,Math.PI,0,Math.PI*.86),hair,[0,2.075,.009],[.152,.207,.142]);mesh(new THREE.SphereGeometry(1,32,20,Math.PI,Math.PI,Math.PI*.25,Math.PI*.7),hair,[0,1.98,-.035],[.18,.31,.142]);
 sphere([0,2.07,.149],[.036,.073,.047],skin);sphere([0,2.018,.174],[.029,.024,.025],skin);
 const eyeMat=new THREE.MeshPhysicalMaterial({color:0x7f8c8b,roughness:.2});resources.add(eyeMat);
 for(const side of[-1,1]){
  sphere([side*.052,2.111,.132],[.017,.010,.009],eyeMat);
  tube([[side*.03,2.138,.132],[side*.055,2.147,.137],[side*.083,2.139,.12]],.01,hair,10);
  sphere([side*.147,2.064,.005],[.025,.047,.03],skin);
 }
 const beardParts=[],beardNormals=[];
 const appendHair=(points,radius)=>{const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),18,radius,5,false),index=g.index,p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<index.count;i++){const k=index.getX(i);beardParts.push(p.getX(k),p.getY(k),p.getZ(k));beardNormals.push(n.getX(k),n.getY(k),n.getZ(k));}g.dispose();};
 for(let i=0;i<72;i++){
  const f=i/71,x=(f-.5)*.245,length=.29+(1-Math.abs(f-.5)*1.6)*.23;
  appendHair([[x,2.025-Math.abs(x)*.45,.13],[x*.92+Math.sin(i)*.009,1.88,.19],[x*.55+Math.sin(i*2)*.015,2.0-length,.145],[x*.38,1.98-length,.12]],.0035+(i%3)*.0011);
 }
 for(let i=0;i<28;i++)for(const side of[-1,1]){const f=i/28;appendHair([[side*.12,2.16-f*.19,-.025],[side*(.16+f*.025),1.98-f*.15,-.05],[side*.18,1.74-f*.1,-.025]],.0038);}
 const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(beardParts,3));bg.setAttribute('normal',new THREE.Float32BufferAttribute(beardNormals,3));mesh(bg,hair);
 const brim=new THREE.TorusGeometry(.29,.075,10,64);const bp=brim.attributes.position;for(let i=0;i<bp.count;i++)bp.setZ(i,bp.getZ(i)+Math.sin(bp.getX(i)*9)*.018);brim.computeVertexNormals();mesh(brim,hatMat,[0,2.263,-.01],[1,1,1],[Math.PI/2,0,0]);
 const hg=new THREE.LatheGeometry([[.27,0],[.22,.12],[.14,.39],[.065,.66],[.012,.78],[0,.79]].map(p=>new THREE.Vector2(...p)),48),hp=hg.attributes.position;
 for(let i=0;i<hp.count;i++)hp.setX(i,hp.getX(i)+Math.pow(hp.getY(i),2)*.16);hg.computeVertexNormals();mesh(hg,hatMat,[0,2.255,-.01]);
 const belt=new THREE.MeshStandardMaterial({color:0x51473b,roughness:.84});resources.add(belt);mesh(new THREE.TorusGeometry(.277,.025,7,48),belt,[0,1.12,0],[1,1,.78],[Math.PI/2,0,0]);
 const staff=new THREE.Group();staff.name='Gandalf’s wooden staff';root.add(staff);
 const staffMesh=tube([[-.44,.03,.14],[-.47,.65,.15],[-.42,1.3,.16],[-.46,2.1,.14],[-.41,2.8,.16],[-.49,3.12,.12]],.029,wood,48);root.remove(staffMesh);staff.add(staffMesh);
 for(const side of[-1,1]){const twig=tube([[-.42,2.78,.15],[-.42+side*.075,2.99,.18],[-.4+side*.11,3.09,.13]],.014,wood);root.remove(twig);staff.add(twig);}
 return{group:root,cloak:cloakMesh,sleeves,staff};
}

export function createBagEndCast(scene,terrain,{quality='high'}={}){
 const resources=new Set(),village=createHobbitVillagePeople(scene,terrain,{quality,placements:[
  {name:'Bilbo Baggins',...L.bilbo,activity:'smoke',height:1.12,hair:0xa9a18c,skin:0xc9aa8a,shirt:0xe8ddc4,waistcoat:0x773b31},
  {name:'Frodo Baggins',x:-1.8,z:-6,activity:'run',height:1.07,hair:0x32271f,shirt:0xe5d7b7,waistcoat:0x536744}
 ]});
 const [bilbo,frodo]=village.people,wizard=buildWizard(resources);scene.add(wizard.group);
 const cigarMat=new THREE.MeshStandardMaterial({color:0x59422c,roughness:.94}),emberMat=new THREE.MeshStandardMaterial({color:0xd44b13,emissive:0xed6522,emissiveIntensity:1.7});resources.add(cigarMat);resources.add(emberMat);
 const cigarG=new THREE.CylinderGeometry(.008,.009,.105,12),emberG=new THREE.SphereGeometry(.009,12,8);resources.add(cigarG);resources.add(emberG);
 const cigar=new THREE.Mesh(cigarG,cigarMat);cigar.rotation.x=Math.PI/2;cigar.position.set(.12,.78,.225);cigar.name='Bilbo’s cigar';bilbo.group.add(cigar);
 const ember=new THREE.Mesh(emberG,emberMat);ember.position.set(.12,.78,.28);bilbo.group.add(ember);
 const matchG=new THREE.CylinderGeometry(.002,.002,.15,6);resources.add(matchG);const match=new THREE.Mesh(matchG,cigarMat);match.position.set(.045,.755,.275);match.rotation.z=-1.13;bilbo.group.add(match);
 const flameMat=new THREE.MeshBasicMaterial({color:0xffcc79,transparent:true,opacity:.9}),flameG=new THREE.SphereGeometry(1,10,8);resources.add(flameMat);resources.add(flameG);const flame=new THREE.Mesh(flameG,flameMat);flame.scale.set(.009,.024,.009);flame.position.set(.12,.792,.28);bilbo.group.add(flame);
 const glow=new THREE.PointLight(0xffac51,.7,.65,2);glow.position.copy(flame.position);bilbo.group.add(glow);
 const positions=[],phases=[];for(let i=0;i<30;i++){positions.push(0,0,0);phases.push(i/30);}
 const smokeG=new THREE.BufferGeometry();smokeG.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));smokeG.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));resources.add(smokeG);
 const smokeM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0}},vertexShader:`attribute float aPhase;uniform float uTime;varying float vAge;void main(){float t=fract(aPhase+uTime*.12);vAge=t;vec3 p=position+vec3(sin(t*8.+aPhase*13.)*.055*t+.12*t,t*.95,cos(t*7.+aPhase*11.)*.045*t);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((.055+t*.13)*1100./max(1.,-mv.z),1.,64.);}`,fragmentShader:`varying float vAge;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.15,1.,r))*sin(vAge*3.14159)*.13;gl_FragColor=vec4(vec3(.61,.65,.67),a);}`});resources.add(smokeM);const smoke=new THREE.Points(smokeG,smokeM);smoke.frustumCulled=false;smoke.name='Cigar smoke';scene.add(smoke);
 const path=new THREE.CatmullRomCurve3(L.path.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal'),eye=new THREE.Vector3();let disposed=false;
 // Small satchel moves with Frodo's body and remains readable in the departure shot.
 const bagMat=new THREE.MeshStandardMaterial({color:0x72543b,roughness:.91}),bagG=new THREE.BoxGeometry(.14,.17,.09);resources.add(bagMat);resources.add(bagG);const bag=new THREE.Mesh(bagG,bagMat);bag.position.set(.17,.11,-.03);frodo.bodyPivot.add(bag);
 function update(time=0){
  if(disposed)return;const t=Number.isFinite(time)?time:0;village.update(0);
  const lightPhase=((t%9)+9)%9,lighting=lightPhase<3.2;
  bilbo.group.position.set(L.bilbo.x,terrain.height(L.bilbo.x,L.bilbo.z)+.015,L.bilbo.z);bilbo.group.rotation.y=L.bilbo.yaw;bilbo.bodyPivot.rotation.x=-.02;bilbo.bodyPivot.position.y=.38+Math.sin(t*1.3)*.003;
  for(const a of bilbo.arms){a.shoulder.rotation.set(-1.35,0,a.side*.25);a.elbow.rotation.x=-1.55+(a.side===-1?Math.sin(t*1.2)*.06:0);}
  flame.visible=match.visible=lighting;glow.intensity=lighting?.65+Math.sin(t*22)*.15:0;flame.scale.y=.02+Math.sin(t*21)*.004;emberMat.emissiveIntensity=lighting?2.3:1.1+Math.sin(t*1.2)*.25;
  bilbo.group.updateMatrixWorld(true);ember.getWorldPosition(eye);smoke.position.copy(eye);smokeM.uniforms.uTime.value=t;
  const phase=(((t+1.5)%19)+19)%19,f=clamp(phase/12.8,0,1),point=path.getPointAt(f),tangent=path.getTangentAt(f),stride=Math.sin(t*11.8);
  frodo.group.visible=phase<13.5;frodo.group.position.set(point.x,terrain.height(point.x,point.z)+.025+Math.abs(stride)*.035,point.z);frodo.group.rotation.y=Math.atan2(tangent.x,tangent.z);frodo.bodyPivot.rotation.set(.13,0,stride*.035);
  for(const leg of frodo.legs){const s=stride*leg.side;leg.hip.rotation.x=s*.65;leg.knee.rotation.x=.1+Math.max(0,-s)*.9;}
  for(const arm of frodo.arms){arm.shoulder.rotation.set(-stride*arm.side*.55,0,arm.side*.08);arm.elbow.rotation.x=-.95;}
  bag.rotation.z=stride*.15;
  const arrival=Math.min(1,((((t%40)+40)%40)+5)/7),gx=L.gandalf.x-1.4*(1-arrival),gz=L.gandalf.z+2.1*(1-arrival);wizard.group.position.set(gx,terrain.height(gx,gz)+.015,gz);wizard.group.rotation.y=Math.PI+L.gandalf.yaw;wizard.cloak.rotation.z=Math.sin(t*.7)*.005;for(let i=0;i<wizard.sleeves.length;i++)wizard.sleeves[i].rotation.x=arrival<1?Math.sin(t*3+i*Math.PI)*.045:0;
  frodo.group.updateMatrixWorld(true);for(const foot of frodo.feet){foot.group.getWorldPosition(eye);const bottom=eye.y-.051*frodo.group.scale.y,ground=terrain.height(eye.x,eye.z);if(bottom<ground+.01)foot.group.position.y+=(ground+.01-bottom)/frodo.group.scale.y;}
 }
 function dispose(){if(disposed)return;disposed=true;village.dispose();scene.remove(wizard.group,smoke);glow.dispose();for(const resource of resources)resource.dispose();resources.clear();}
 update(0);return{count:3,hobbits:village,people:[bilbo,frodo],wizard,bilbo,frodo,smoke,update,dispose,metadata:{names:['Bilbo Baggins','Gandalf the Grey','Frodo Baggins'],imageBased:false,activities:['lighting a cigar','arriving at the gate with a staff','running out of Bag End']}};
}
