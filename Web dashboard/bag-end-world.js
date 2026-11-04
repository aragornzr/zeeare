import {THREE} from './atlas-realism.js?v=bag-end-20261031';
import {HobbitonWorld} from './hobbiton-world.js?v=bag-end-20261031';
import {HobbitonBotany} from './hobbiton-botany.js?v=20261031-cinematic';
import {BagEndTerrain,BAG_END_LAYOUT as L,BAG_END_TOUR} from './bag-end-layout.js';
import {createBagEndCast} from './bag-end-characters.js';
import {terrainGeometry} from './terrain-surface.js';
import {addLandscapeDetail} from './landscape-detail.js';
import {randomOf,noise2,clamp} from './atlas-terrain.js';

export class BagEndWorld extends HobbitonWorld{
 constructor(...args){super(...args);this.terrain=new BagEndTerrain(this.profile);this.isBagEnd=true;this.isHobbiton=true;this.story=null;}
 async build(){
  const [wood,woodN,woodR,plaster,plasterN,plasterR]=await Promise.all([
   this.assets.texture('assets/hobbiton/materials/wood_planks_diff.jpg'),this.assets.texture('assets/hobbiton/materials/wood_planks_nor_gl.jpg',{srgb:false}),this.assets.texture('assets/hobbiton/materials/wood_planks_rough.jpg',{srgb:false}),
   this.assets.texture('assets/hobbiton/materials/plastered_wall_diff.jpg'),this.assets.texture('assets/hobbiton/materials/plastered_wall_nor_gl.jpg',{srgb:false}),this.assets.texture('assets/hobbiton/materials/plastered_wall_rough.jpg',{srgb:false})
  ]);
  this.joineryMaps={map:wood,normalMap:woodN,roughnessMap:woodR};
  this.wood=this.ownedMaterial({...this.joineryMaps,color:0xb7a78a,roughness:.87,normalScale:new THREE.Vector2(.5,.5)});
  this.lime=this.ownedMaterial({map:plaster,normalMap:plasterN,roughnessMap:plasterR,color:0xf4e6c5,roughness:.94,normalScale:new THREE.Vector2(.6,.6)});
  this.grass=this.assets.material('grass',0x9faf7f);this.baseY=this.at(0,-10);this.flat(0,-7,11.8,this.baseY,8);this.flat(L.gate.x,L.gate.z,5.5,this.baseY-1,8);
  this.botany=new HobbitonBotany(this.scene,this.assets,this.terrain,this.quality,{village:true,exclude:(x,z)=>this.groundOccupied(x,z)||(Math.abs(x)<14&&z<-8.7&&z>-38)||this.smialPositions.some(h=>Math.abs(x-h.x)<6&&z>h.z-8&&z<h.z+4)||this.gardenBeds.some(b=>Math.hypot(x-b.x,z-b.z)<b.r)});
  this.gardenBeds=[];this.bilbosHouse();this.gardenAndGate();
  for(const home of L.neighbours)this.smial({...home,name:'A neighbouring hobbit home'},.86);
  this.woodedHills();this.buildBagEndTerrain();addLandscapeDetail(this);this.botany.commit();this.plantRoofGrass();this.batch.commit();
  this.people=createBagEndCast(this.scene,this.terrain,{quality:this.quality});this.story=this.people;this.peopleCount=3;this.chimneySmoke=new THREE.Points(this.story.smoke.geometry.clone(),this.story.smoke.material.clone());this.chimneySmoke.name='Smoke from Bilbo’s chimney';this.chimneySmoke.position.set(6,this.at(6,-23)+4.3,-23);this.chimneySmoke.scale.set(2.1,2.8,2.1);this.chimneySmoke.frustumCulled=false;this.scene.add(this.chimneySmoke);this.resources.push(this.chimneySmoke);
  this.markAt('Bilbo · a cigar on the doorstep',L.bilbo.x,L.bilbo.z,1,'Bilbo lights his cigar outside the round green door; an ember, match flame and curling smoke animate with the scene.',6);
  this.markAt('Gandalf · at the garden gate',L.gandalf.x,L.gandalf.z,1.6,'Gandalf arrives at the open gate in a long grey cloak, carrying his crooked wooden staff.',9);
  this.markAt('Frodo · off down the lane',-4,2,1,'Frodo runs out from Bag End, his bare feet following the sloping lane and his travelling satchel moving with him.',12);
  this.markAt('The old oak & wooded Hill',L.oak.x,L.oak.z,12,'Layered trees and rolling wooded hills frame the house beneath its mature oak.',46);
  this.markAt('Cottage gardens & neighbouring smials',-30,8,3,'Flowering borders, worn stonework and smaller round-door homes descend into the surrounding countryside.',36);
  const eyes=[],targets=[];BAG_END_TOUR.forEach((shot,i)=>{
   const e=new THREE.Vector3(...shot.eye),t=new THREE.Vector3(...shot.target);e.y+=this.at(e.x,e.z);t.y+=this.at(t.x,t.z);eyes.push(e);targets.push(t);
  });
  this.eyeCurve=new THREE.CatmullRomCurve3(eyes,true,'centripetal');this.targetCurve=new THREE.CatmullRomCurve3(targets,true,'centripetal');
  return this;
 }
 markAt(title,x,z,dy,description,distance){this.mark(title,x,this.at(x,z)+dy,z,description);this.landmarks.at(-1).distance=distance;}
 bilbosHouse(){
  const y=this.baseY,{width:w,height:h,z,doorX:dx,doorRadius:r}=L.home;
  const facade=new THREE.Shape();facade.moveTo(-w/2,0);facade.lineTo(w/2,0);facade.lineTo(w/2,h*.46);facade.bezierCurveTo(w*.48,h*.85,w*.27,h*1.04,0,h);facade.bezierCurveTo(-w*.25,h*1.03,-w*.47,h*.85,-w/2,h*.47);facade.closePath();
  const opening=(x,yy,rr)=>{const hole=new THREE.Path();hole.absarc(x,yy,rr,0,Math.PI*2,true);facade.holes.push(hole);};opening(dx,1.4,r*1.04);
  const windows=[{x:-6.1,y:1.95,r:.72},{x:2.6,y:2.2,r:.82},{x:6,y:1.85,r:.68}];windows.forEach(v=>opening(v.x,v.y,v.r));
  this.mesh(new THREE.ExtrudeGeometry(facade,{depth:.55,bevelEnabled:true,bevelSize:.045,bevelThickness:.045,bevelSegments:3,curveSegments:48}),this.lime,[0,y,z]);
  this.box(0,y-.1,z+.08,w+.4,.35,.75,this.stone);
  for(let i=0;i<46;i++){const x=-w*.5+i*w/45;for(let row=0;row<2;row++){if(Math.abs(x-dx)<r+.12)continue;this.batch.add('rock',this.stone,[x,y+.13+row*.22,z+.47],[.3+(i%3)*.035,.095,.22],[0,i*.3,0]);}}
  const hallMat=this.assets.material('flat',0x392d1e),warm=this.assets.material('glow',0xf3c57c);
  this.box(dx,y+.015,z-2.4,3.8,.08,4.8,hallMat);for(const side of[-1,1])this.box(dx+side*2,y,z-2.4,.2,3.3,4.8,hallMat);this.box(dx,y,z-4.9,4.1,3.3,.15,hallMat);this.box(dx,y+.7,z-4.9,1.4,1.7,.1,warm);
  // A real circular door has a hinge, inset face, individual plank seams and warm hall behind.
  const green=this.ownedMaterial({...this.joineryMaps,color:0x2e5032,roughness:.64,normalScale:new THREE.Vector2(.5,.5)}),pivot=new THREE.Group();pivot.name='Bilbo’s round green door';pivot.position.set(dx+r,y+1.4,z+.6);pivot.rotation.y=.34;this.scene.add(pivot);this.doorPivot=pivot;
  const doorG=new THREE.CylinderGeometry(r,r,.13,96);doorG.rotateX(Math.PI/2);const door=new THREE.Mesh(doorG,green);door.position.x=-r;door.castShadow=door.receiveShadow=true;pivot.add(door);this.resources.push(door);
  const detail=(geometry,material,pos)=>{const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.castShadow=true;pivot.add(m);this.resources.push(m);return m;};
  detail(new THREE.SphereGeometry(.075,24,16),this.brass,[-r,0,.14]);
  for(let i=-6;i<=6;i++){const x=i*r*.14,height=2*Math.sqrt(r*r-x*x);detail(new THREE.BoxGeometry(.012,height,.012),this.assets.material('flat',0x1e3623),[-r+x,0,.073]);}
  const iron=this.assets.material('metal',0x555047);for(const yy of[-.5,.5]){detail(new THREE.BoxGeometry(.48,.065,.045),iron,[-.27,yy,.1]);for(const bx of[-.44,-.17])detail(new THREE.SphereGeometry(.018,10,8),this.brass,[bx,yy,.133]);}
  for(let i=0;i<34;i++){const a=i/34*Math.PI*2;this.batch.add('box',this.stone,[dx+Math.cos(a)*(r+.18),y+1.4+Math.sin(a)*(r+.18),z+.4],[.25,.2,.4],[0,0,a]);}
  this.batch.add('ring',this.wood,[dx,y+1.4,z+.61],[r*1.06,r*1.06,.8]);
  const glass=this.ownedMaterial({color:0xabbeb0,metalness:.18,roughness:.22,transparent:true,opacity:.73});
  for(const v of windows){
   this.batch.add('cylinder',hallMat,[v.x,y+v.y,z+.04],[v.r,.2,v.r],[Math.PI/2,0,0]);
   this.batch.add('cylinder',glass,[v.x,y+v.y,z+.26],[v.r*.94,.055,v.r*.94],[Math.PI/2,0,0]);
   this.batch.add('ring',this.wood,[v.x,y+v.y,z+.52],[v.r*1.04,v.r*1.04,.7]);
   for(const t of[-.34,.34]){const span=2*Math.sqrt(1-t*t)*v.r;this.box(v.x+t*v.r,y+v.y-span/2,z+.54,.035,span,.07,this.wood);this.box(v.x,y+v.y+t*v.r,z+.54,span,.035,.07,this.wood);}
   this.box(v.x,y+v.y-v.r-.17,z+.65,v.r*2.3,.2,.5,this.stone);this.box(v.x,y+v.y-v.r-.05,z+.72,v.r*2.1,.16,.36,this.wood);
   for(let i=0;i<12;i++){const xx=v.x+(i-5.5)*v.r*.16;this.batch.add('leaf',this.green,[xx,y+v.y-v.r+.13+Math.sin(i)*.05,z+.83],[.28,.26,1],[.15,i*.7,0]);this.batch.add('sphere',this.assets.material('flat',[0xd3abc8,0xe7c98a,0xe3d6be][i%3]),[xx,y+v.y-v.r+.29,z+.85],[.065,.05,.065]);}
  }
  // Front turf profile follows the facade and blends back into the actual hillside.
  const depth=27,roof=new THREE.PlaneGeometry(w+3.5,depth,128,this.quality==='4k'?100:60);roof.rotateX(-Math.PI/2);const p=roof.attributes.position,uv=roof.attributes.uv;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),back=(depth/2-p.getZ(i))/depth,zz=z-back*depth,edge=clamp(1-(x/((w+3.5)*.5))**2,0,1),front=y+h*Math.pow(edge,.38)+.24;
   const blend=THREE.MathUtils.smoothstep(back,.03,.94),natural=this.at(x,zz)+.07,yy=THREE.MathUtils.lerp(front,natural,blend)+Math.sin(x*3+zz*4)*.035*(1-blend);
   p.setXYZ(i,x,yy,zz);uv.setXY(i,x*.35,zz*.35);
  }roof.computeVertexNormals();const roofMesh=this.mesh(roof,this.grass);roofMesh.name='Living turf joined to the Hill';roofMesh.castShadow=false;
  const chimneyY=this.at(6,-23)+.3;this.box(6,chimneyY,-23,.95,3.8,1.05,this.stone);this.box(6,chimneyY+3.8,-23,1.22,.18,1.3,this.stone);this.box(6,chimneyY+3.97,-23,.78,.1,.84,hallMat);
  // Mossy turf edging and small leafy roots break the geometric roof outline.
  for(let i=0;i<90;i++){const x=(i/89-.5)*(w+2.5),edge=clamp(1-(x/((w+3.5)*.5))**2,0,1),yy=y+h*Math.pow(edge,.38)+.22;this.batch.add('leaf',this.green,[x,yy,z+.02],[.38,.18,1],[.45,i*.37,0]);}
  const eavePoints=[];for(let i=0;i<=30;i++){const x=(i/30-.5)*w,edge=clamp(1-(x/(w*.58))**2,0,1);eavePoints.push(new THREE.Vector3(x,y+h*Math.pow(edge,.38)+.06,z+.64));}this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(eavePoints),80,.07,9,false),this.wood);
  for(let i=0;i<190;i++){const side=i%2?1:-1,xx=side*(w*.43+Math.sin(i*.7)*.55),yy=y+.4+(i%47)*.075,zz=z+.61;this.batch.add('leaf',this.green,[xx,yy,zz],[.28,.31,1],[.12,Math.sin(i)*.3,i*.35]);}
  this.smialPositions.push({x:0,y,z,doorR:r,name:'Bilbo’s home'});this.buildings++;
  this.markAt('Bag End · Bilbo’s home',dx,z+1,2,'Bilbo’s prominent green-door smial has deep round windows, a warm hall, flower boxes and a turf roof joined to the wooded Hill.',28);
 }
 gardenAndGate(){
  const path=new THREE.CatmullRomCurve3(L.path.map(p=>new THREE.Vector3(p[0],0,p[1])),false,'centripetal');this.road(path.getPoints(40).map(p=>[p.x,p.z]),1.8);
  for(let i=0;i<115;i++){
   const f=i/114,point=path.getPointAt(f),tangent=path.getTangentAt(f),a=Math.atan2(tangent.x,tangent.z);for(const side of[-1,0,1]){const x=point.x+Math.cos(a)*side*.54,z=point.z-Math.sin(a)*side*.54;this.batch.add('rock',this.stone,[x,this.at(x,z)+.035,z],[.32,.045,.22],[0,a+Math.sin(i)*.15,0]);}
  }
  const fence=(x1,z1,x2,z2,gate=false)=>{
   const length=Math.hypot(x2-x1,z2-z1),steps=Math.ceil(length/.55),angle=Math.atan2(z2-z1,x2-x1);
   for(let i=0;i<=steps;i++){const t=i/steps,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t,y=this.at(x,z);this.box(x,y,z,.075,.9,.1,this.wood,-angle);if(i%3===0)this.batch.add('cone',this.wood,[x,y+.98,z],[.065,.16,.075]);}
   for(let i=0;i<steps;i++){const t=(i+.5)/steps,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t,y=this.at(x,z);for(const h of[.3,.7])this.box(x,y+h,z,length/steps+.06,.065,.08,this.wood,-angle);}
  };
  const {x:gx,z:gz,width}=L.gate;fence(-17,gz,gx-width/2,gz);fence(gx+width/2,gz,16,gz);fence(-17,gz,-17,-9);fence(16,gz,16,-8);
  for(const side of[-1,1]){const x=gx+side*width/2,y=this.at(x,gz);this.box(x,y,gz,.18,1.3,.18,this.wood);this.batch.add('sphere',this.wood,[x,y+1.35,gz],[.13,.13,.13]);}
  // An open picket gate swings toward the inside of the garden.
  const gate=new THREE.Group();gate.name='Open garden gate';gate.position.set(gx-width/2,this.at(gx-width/2,gz),gz);gate.rotation.y=-1.06;this.scene.add(gate);this.gate=gate;
  const gatePart=(x,y,w,h,d)=>{const g=new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(g,this.wood);m.position.set(x,y,0);m.castShadow=true;gate.add(m);this.resources.push(m);};
  for(let i=0;i<8;i++)gatePart(.12+i*.32,.51,.09,.98,.08);for(const y of[.27,.76])gatePart(1.25,y,2.55,.07,.1);const braceG=new THREE.BoxGeometry(2.6,.06,.09),brace=new THREE.Mesh(braceG,this.wood);brace.position.set(1.25,.52,.04);brace.rotation.z=.19;gate.add(brace);this.resources.push(brace);
  for(const b of[{x:-8,z:-4,r:2.4},{x:5,z:-5,r:2.8},{x:10,z:-3,r:2.1},{x:-12,z:1,r:2},{x:11,z:5,r:2.6},{x:-11,z:5,r:1.8}]){
   this.gardenBeds.push(b);this.flowerBorder(b.x,b.z,b.r*1.8,1);
   for(let i=0;i<22;i++){const a=i/22*Math.PI*2,x=b.x+Math.cos(a)*b.r,z=b.z+Math.sin(a)*b.r*.55;this.batch.add('rock',this.stone,[x,this.at(x,z)+.09,z],[.25,.16,.23],[0,a,0]);}
   // Tall flowering stems give cottage borders depth and an irregular silhouette.
   for(let i=0;i<16;i++){const a=i*2.399,x=b.x+Math.sin(a)*b.r*.6,z=b.z+Math.cos(a)*b.r*.35,y=this.at(x,z),h=.65+(i%5)*.13;this.cylinder(x,y,z,.013,h,this.assets.material('flat',0x58754b));for(let k=0;k<6;k++){this.batch.add('leaf',this.green,[x,y+.15+k*.1,z],[.19,.12,1],[.3,a+k,0]);const tint=this.assets.material('flat',[0xa24c78,0x845394,0xd4a353,0xe6dfd2][i%4]);this.batch.add('sphere',tint,[x+Math.sin(k)*.035,y+h-k*.09,z],[.05,.065,.045]);}}
  }
  for(let i=0;i<80;i++){const side=i%2?1:-1,x=side*(15.8+Math.sin(i)*.2),z=-8+(i/80)*17,y=this.at(x,z);this.batch.add('leaf',this.green,[x,y+.6,z],[.9,.8,1],[0,side*.35+i,0]);}
  // A worn wooden seat and a modest round table on Bilbo's stone terrace.
  const bx=5.6,bz=-7,y=this.at(bx,bz);for(const x of[-.65,.65])for(const z of[-.2,.2])this.box(bx+x,y,bz+z,.09,.48,.09,this.wood);for(let i=0;i<4;i++)this.box(bx,y+.49,bz+(i-1.5)*.12,1.6,.06,.1,this.wood);this.box(bx,y+.8,bz-.3,1.65,.28,.08,this.wood);
 }
 woodedHills(){
  const r=randomOf(this.profile.seed^0x37ba91),count=this.quality==='4k'?1000:this.quality==='high'?720:360;
  this.botany.tree(L.oak.x,L.oak.z,L.oak.scale,0,false);this.botany.groups[0].at(-1).width=1.8;this.trees++;
  for(let i=0;i<count;i++){
   const dense=i%3!==0,x=(r()-.5)*(dense?290:680),z=-35-r()*(dense?170:420),near=Math.hypot(x,z+25)<65;
   if(Math.abs(x)<26&&z>-48||Math.hypot(x-L.oak.x,z-L.oak.z)<13)continue;
   if(near&&Math.abs(x)<30&&z>-36)continue;
   this.botany.tree(x,z,near?.8+r()*.85:.9+r()*1.15,i%3,!near);this.trees++;
  }
  for(let i=0;i<70;i++){const side=i%2?1:-1,x=side*(27+r()*140),z=4+r()*170;if(L.neighbours.some(h=>Math.hypot(x-h.x,z-h.z)<8))continue;this.botany.tree(x,z,.5+r()*.8,i%3,Math.hypot(x,z)>130);this.trees++;}
 }
 buildBagEndTerrain(){
  const material=this.assets.terrainMaterial(this.profile),near=terrainGeometry(this.terrain,{size:480,segments:this.quality==='4k'?640:this.quality==='high'?420:220,edgeStep:12}),p=near.attributes.position,indices=[],old=near.index.array;
  // The house occupies a real terrain opening; hillside grass does not fill its hall.
  for(let i=0;i<old.length;i+=3){const a=old[i],b=old[i+1],c=old[i+2],x=(p.getX(a)+p.getX(b)+p.getX(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;if(Math.abs(x)<L.home.width*.43&&z<-10&&z>-32)continue;indices.push(a,b,c);}near.setIndex(indices);near.computeVertexNormals();
  this.terrainMesh=this.mesh(near,material);this.terrainMesh.castShadow=false;this.distantTerrain=this.mesh(terrainGeometry(this.terrain,{size:2400,segments:200,cutout:240}),material);this.distantTerrain.castShadow=false;
 }
 animate(time,tourTime=null){super.animate(time,tourTime);if(this.chimneySmoke)this.chimneySmoke.material.uniforms.uTime.value=time*.55;}
 plantRoofGrass(){
  if(!this.botany.grassGeometry)return;const count=this.quality==='4k'?15000:this.quality==='high'?7000:1800,g=this.botany.grassGeometry.clone(),m=this.botany.grassMaterial.clone();m.onBeforeCompile=this.botany.grassMaterial.onBeforeCompile;m.customProgramCacheKey=this.botany.grassMaterial.customProgramCacheKey;this.customMaterials.push(m);
  const mesh=new THREE.InstancedMesh(g,m,count),dummy=new THREE.Object3D(),r=randomOf(this.profile.seed+714),w=L.home.width+3.5;
  for(let i=0;i<count;i++){
   const x=(r()-.5)*(w-.25),back=r()*.99,zz=L.home.z-back*27,edge=clamp(1-(x/(w*.5))**2,0,1),front=this.baseY+L.home.height*Math.pow(edge,.38)+.24,blend=THREE.MathUtils.smoothstep(back,.03,.94),y=THREE.MathUtils.lerp(front,this.at(x,zz)+.07,blend)+Math.sin(x*3+zz*4)*.035*(1-blend);
   dummy.position.set(x,y-.02,zz);dummy.rotation.set(0,r()*Math.PI*2,0);dummy.scale.setScalar(.55+r()*.7);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.name='Living grass on the turf roof';mesh.receiveShadow=true;mesh.computeBoundingSphere();this.scene.add(mesh);this.resources.push(mesh);
 }
 getCinematicCamera(time){const t=(((time%40)+40)%40)/40,eye=this.eyeCurve.getPoint(t),target=this.targetCurve.getPoint(t);eye.y=Math.max(eye.y,this.at(eye.x,eye.z)+1.25);return{eye,target,chapter:BAG_END_TOUR[Math.floor(t*BAG_END_TOUR.length)].title};}
 dispose(){if(this.doorPivot)this.scene.remove(this.doorPivot);if(this.gate)this.scene.remove(this.gate);super.dispose();}
}
