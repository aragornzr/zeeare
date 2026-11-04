import {THREE} from './atlas-realism.js?v=20261031-cinematic';
import {DestinationWorld} from './destination-world.js?v=20261031-cinematic';
import {HobbitonTerrain,HOBBITON_LAYOUT as L,HOBBITON_TOUR} from './hobbiton-layout.js?v=20261031-cinematic';
import {createHobbitVillagePeople} from './hobbit-characters.js';
import {HobbitonBotany} from './hobbiton-botany.js?v=20261031-cinematic';
import {buildLivingGardens} from './hobbiton-gardens.js';
import {terrainGeometry} from './terrain-surface.js?v=20261031-cinematic';
import {addLandscapeDetail} from './landscape-detail.js';
import {Water} from './assets/vendor/Water.js';
export class HobbitonWorld extends DestinationWorld{
 constructor(...args){super(...args);this.terrain=new HobbitonTerrain(this.profile);this.people=null;this.isHobbiton=true;this.customMaterials=[];this.grass=this.assets.material('grass',0x9cae7a);this.lime=this.assets.material('flat',0xd9ceb2);this.smialPositions=[];}
 async build(){
  const [wood,woodN,woodR,plaster,plasterN,plasterR,vegetableLeaf]=await Promise.all([this.assets.texture('assets/hobbiton/materials/wood_planks_diff.jpg'),this.assets.texture('assets/hobbiton/materials/wood_planks_nor_gl.jpg',{srgb:false}),this.assets.texture('assets/hobbiton/materials/wood_planks_rough.jpg',{srgb:false}),this.assets.texture('assets/hobbiton/materials/plastered_wall_diff.jpg',{repeat:.5}),this.assets.texture('assets/hobbiton/materials/plastered_wall_nor_gl.jpg',{repeat:.5,srgb:false}),this.assets.texture('assets/hobbiton/materials/plastered_wall_rough.jpg',{repeat:.5,srgb:false}),this.assets.texture('assets/hobbiton/materials/cabbage-leaf.png')]);
  this.joineryMaps={map:wood,normalMap:woodN,roughnessMap:woodR};this.wood=this.ownedMaterial({...this.joineryMaps,color:0xc6b79b,roughness:.86,normalScale:new THREE.Vector2(.38,.38)});this.lime=this.ownedMaterial({map:plaster,normalMap:plasterN,roughnessMap:plasterR,color:0xf1e4cc,roughness:.95,normalScale:new THREE.Vector2(.35,.35)});this.vegetableLeaf=vegetableLeaf;this.botany=new HobbitonBotany(this.scene,this.assets,this.terrain,this.quality,{village:true,exclude:(x,z)=>this.groundOccupied(x,z)||this.smialPositions.some(h=>Math.abs(x-h.x)<5.7&&z>h.z-8&&z<h.z+3)});
  if(this.quality==='4k'){const [grass,grassN]=await Promise.all([this.assets.texture('assets/materials/aerial_grass_rock_diff_4k.jpg'),this.assets.texture('assets/materials/aerial_grass_rock_nor_gl_4k.jpg',{srgb:false})]);this.highMaps={...this.assets.maps,grass,grassN};this.grass=this.ownedMaterial({map:grass,normalMap:grassN,color:0x9cae7a,roughness:.9,normalScale:new THREE.Vector2(.8,.8)});}
  this.smial(L.bagEnd,1.2,true);for(const house of L.bagshotRow)this.smial({...house,name:'Bagshot Row'},.76);for(const house of L.villageSmials)this.smial({...house,name:'Village smial'},.72);
  const millY=this.flat(L.mill.x,L.mill.z,5,Math.max(1.8,this.at(L.mill.x,L.mill.z)),4);this.mill(millY);this.stoneBridge();
  this.house(L.grange.x,L.grange.z,1.12,.1,'vernacular');this.mark('The Old Grange',L.grange.x,this.at(L.grange.x,L.grange.z)+5,L.grange.z,'The grange stands west of the lane linking the bridge and the Hill.');
  this.villagePaths();this.gardens();this.hedgesAndField();this.tree(L.partyTree.x,L.partyTree.z,2.1);this.tree(-8,-77,1.7);this.mark('The party tree & field',L.partyTree.x,this.at(L.partyTree.x,L.partyTree.z)+10,L.partyTree.z,'A broad tree and open field; planting and exact local dimensions are interpreted.');
  this.buildTerrain();await this.addWater();this.nature();addLandscapeDetail(this);this.botany.commit();this.batch.commit();
  // Bridge pedestrians walk over its deck, while others follow the eroded ground.
  const characterTerrain={height:(x,z)=>Math.abs(x-2)<2.1&&z>18&&z<35?this.bridgeY+Math.sin((z-18)/17*Math.PI)*.22:this.at(x,z)};
  this.people=createHobbitVillagePeople(this.scene,characterTerrain,{quality:this.quality,placements:L.people});this.peopleCount=this.people.count;
  this.mark('The kitchen gardens & hobbits',L.garden.x,this.at(L.garden.x,L.garden.z)+1.5,L.garden.z,'Barefoot hobbit neighbours tend vegetables, carry produce, chat and walk.');
  const eyePoints=HOBBITON_TOUR.map(s=>new THREE.Vector3(...s.eye)),targetPoints=HOBBITON_TOUR.map(s=>new THREE.Vector3(...s.target));this.eyeCurve=new THREE.CatmullRomCurve3(eyePoints,true,'catmullrom',.16);this.targetCurve=new THREE.CatmullRomCurve3(targetPoints,true,'catmullrom',.12);
  return this;
 }
 ownedMaterial(parameters){const m=new THREE.MeshStandardMaterial(parameters);this.customMaterials.push(m);return m;}
 mesh(g,m,position=[0,0,0]){const mesh=new THREE.Mesh(g,m);mesh.position.set(...position);mesh.castShadow=mesh.receiveShadow=true;this.scene.add(mesh);this.resources.push(mesh);return mesh;}
 smial(data,scale=1,bagEnd=false){
  const {x,z,color}=data,y=this.at(x,z),w=8.5*scale,h=3.1*scale;
  this.flat(x,z+1.4,3.5*scale,y,3.5);
  const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h*.6);shape.quadraticCurveTo(w*.35,h*1.03,0,h*1.05);shape.quadraticCurveTo(-w*.35,h*1.03,-w/2,h*.6);shape.closePath();
  const wall=this.mesh(new THREE.ExtrudeGeometry(shape,{depth:.42*scale,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.05,bevelThickness:.06}),bagEnd?this.lime:this.stone,[x,y,z]);
  // A meshed turf roof merges into the Hill rather than a floating oval dome.
  const roofG=new THREE.PlaneGeometry(w*1.3,9*scale,44,34);roofG.rotateX(-Math.PI/2);const p=roofG.attributes.position,u=roofG.attributes.uv;
  for(let i=0;i<p.count;i++){const xx=p.getX(i),zz=p.getZ(i)-4.45*scale,arch=Math.pow(Math.max(0,1-(xx/(w*.64))**2),.65);p.setXYZ(i,xx,(h+.26*scale)*arch*(.98+.06*Math.sin(-zz*.3))+.055*Math.sin(xx*6+zz*4)*arch,zz);u.setXY(i,xx*.35,zz*.35);}roofG.computeVertexNormals();this.mesh(roofG,this.grass,[x,y,z]);
  const doorR=1.05*scale,doorY=y+1.12*scale,doorMat=this.ownedMaterial({...this.joineryMaps,color,roughness:.67,normalScale:new THREE.Vector2(.3,.3)});
  this.batch.add('cylinder',this.dark,[x,doorY,z+.47*scale],[doorR*1.06,.09,doorR*1.06],[Math.PI/2,0,0]);this.batch.add('cylinder',doorMat,[x,doorY,z+.52*scale],[doorR,.1,doorR],[Math.PI/2,0,0]);
  this.batch.add('ring',this.wood,[x,doorY,z+.6*scale],[doorR*1.05,doorR*1.05,.75]);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,xx=x+Math.cos(a)*doorR*1.18,yy=doorY+Math.sin(a)*doorR*1.18;this.batch.add('box',this.stone,[xx,yy,z+.42*scale],[.25*scale,.18*scale,.28*scale],[0,0,a]);}
  this.batch.add('sphere',this.brass,[x,doorY,z+.68*scale],[.075*scale,.075*scale,.075*scale]);
  for(let j=-4;j<=4;j++){const xx=j*doorR*.2,length=2*Math.sqrt(Math.max(0,doorR*doorR-xx*xx));this.batch.add('box',this.assets.material('flat',0x243b26),[x+xx,doorY,z+.58*scale],[.012*scale,length,.008]);}
  for(const side of[-1,1]){
   const xx=x+side*w*.28,wy=y+h*.54,r=.52*scale;this.batch.add('cylinder',this.window,[xx,wy,z+.47*scale],[r,.07,r],[Math.PI/2,0,0]);this.batch.add('ring',this.wood,[xx,wy,z+.55*scale],[r,r,.6]);this.box(xx,wy-r,z+.59*scale,r*2,.11*scale,.3*scale,this.stone);this.box(xx,wy-r,z+.59*scale,.045*scale,r*2,.06,this.wood);this.box(xx,wy,z+.6*scale,r*2,.045*scale,.05,this.wood);
   this.box(x+side*w*.44,y,z+.1,.18*scale,h*.73,.22,this.wood);
  }
  for(let i=0;i<4;i++)this.box(x,y-.12+i*.04,z+1+i*.3,2.6*scale,.12,.34,this.stone);
  this.box(x+w*.24,y+h*.55,z-3*scale,.65*scale,2.7*scale,.72*scale,this.stone);this.box(x+w*.24,y+h*.55+2.7*scale,z-3*scale,.82*scale,.15,.88*scale,this.stone);
  for(const side of[-1,1])this.flowerBorder(x+side*3.6*scale,z+1.4,2.2*scale,side);
  this.fence(x-5.2*scale,z+4.4,4.1*scale,0);this.fence(x+1.5*scale,z+4.4,4.1*scale,0);
  this.box(x+4.7*scale,y+.2,z+3,.4*scale,1.1,.4*scale,this.wood);this.box(x+4.7*scale,y+1.1,z+3,.7,.28,.5,doorMat);
  for(let i=0;i<18;i++){const a=(i/17)*Math.PI,xx=x+Math.cos(a)*w*.49,yy=y+Math.sin(a)*(h+.1);this.batch.add('rock',this.assets.material('earth',0x77704e),[xx,yy,z+.05],[.22*scale,.12*scale,.28*scale],[0,i*.9,a]);}
  if(bagEnd){for(let i=0;i<24;i++){const xx=x+(i%4-1.5)*.57*scale+(this.random()-.5)*.08,zz=z+2.1+Math.floor(i/4)*.55;this.batch.add('rock',this.stone,[xx,this.at(xx,zz)+.045,zz],[.31*scale,.055,.3*scale],[0,this.random()*.2,0]);}}
  this.smialPositions.push({name:data.name,x,y,z,doorR});this.buildings++;this.smialDetails(x,y,z,w,h,scale,doorR,doorY);
  if(bagEnd)this.mark('Bag End · the green door',x,y+2,z+1,'Bag End overlooks the Water from the Hill. Its round green door has a central brass knob.');
 }
 flowerBorder(x,z,length,seed){const stem=this.assets.material('flat',0x4c7440);for(let i=0;i<28;i++){const xx=x+(this.random()-.5)*length,zz=z+(this.random()-.5)*.8,y=this.at(xx,zz),height=.18+this.random()*.35;this.cylinder(xx,y,zz,.015,height,stem);const petal=this.assets.material('flat',[0xe6d9bc,0xd0b04d,0xa47eb7,0xcf8a8b][i%4]);for(let j=0;j<5;j++){const a=j/5*Math.PI*2;this.batch.add('sphere',petal,[xx+Math.cos(a)*.055,y+height,zz+Math.sin(a)*.055],[.065,.025,.055]);}}}
 fence(x,z,length,angle=0){const c=Math.cos(angle),s=Math.sin(angle),y=this.at(x,z);for(let i=0;i<=Math.floor(length/.7);i++){const d=i*.7;this.box(x+d*c,y,z-d*s,.09,.85,.09,this.wood,angle);}for(const h of[.3,.65])this.box(x+length*.5*c,y+h,z-length*.5*s,length,.07,.08,this.wood,angle);}
 mill(y){
  const {x,z}=L.mill;this.house(x,z,1.35,0,'vernacular',y);this.box(x+3.9,y,z+1,2.3,3.8,4.3,this.stone);this.box(x+5.15,y,z+1,.18,3.4,4.6,this.wood);
  const wheel=new THREE.Group();wheel.position.set(x+5.55,L.waterLevel+2.05,z+4.5);this.scene.add(wheel);this.wheel=wheel;
  const wood=this.wood,r=2.25;const ringGeometry=new THREE.TorusGeometry(r,.13,7,48),ring=new THREE.Mesh(ringGeometry,wood);ring.rotation.y=Math.PI/2;wheel.add(ring);this.resources.push(ring);
  const ring2=new THREE.Mesh(ringGeometry.clone(),wood);ring2.rotation.y=Math.PI/2;ring2.position.x=.7;wheel.add(ring2);this.resources.push(ring2);
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2,g=new THREE.BoxGeometry(.8,.22,.7),paddle=new THREE.Mesh(g,wood);paddle.position.set(.35,Math.sin(a)*r,Math.cos(a)*r);paddle.rotation.x=-a;wheel.add(paddle);this.resources.push(paddle);const spoke=new THREE.Mesh(new THREE.BoxGeometry(.12,r*2,.12),wood);spoke.rotation.x=a;spoke.position.x=.35;wheel.add(spoke);this.resources.push(spoke);}
  this.mark('Sandyman’s old mill',x,y+4,z,'The old mill stands on the north bank of the Water near the bridge.');
 }
 stoneBridge(){
  const {x,z}=L.bridge;const y=2.35;this.bridgeY=y;
  for(let i=0;i<22;i++){const zz=z-8.5+i*.8,arch=Math.sin(i/21*Math.PI)*.26;this.box(x,y+arch,zz,3.5,.45,.82,this.stone);for(const side of[-1,1]){this.box(x+side*1.65,y+.45+arch,zz,.35,.72,.82,this.stone);if(i%2===0)this.box(x+side*1.65,y+1.16+arch,zz,.46,.12,.86,this.stone);}}
  for(const side of[-1,1]){this.batch.add('arch',this.stone,[x+side*1.7,y-2.4,z],[7.9,2.4,1.5],[0,Math.PI/2,0]);this.box(x+side*1.5,.15,z-8,.5,2.4,1.2,this.stone);this.box(x+side*1.5,.15,z+8,.5,2.4,1.2,this.stone);}
  this.mark('The bridge across the Water',x,y+1,z,'A village crossing links the north-bank mill with dwellings south of the Water.');
 }
 villagePaths(){
  this.road([[2,48],[2,36],[2,18],[-2,6],[-5,-8],[-2,-24],[0,-42],[0,-55]],2.2);this.road([[-50,8],[-35,6],[-24,2],[-7,4],[12,7],[30,11],[46,4]],1.6);this.road([[-25,-26],[-13,-25],[0,-24],[14,-25],[27,-30]],1.7);this.road([[2,35],[15,40],[36,49]],1.8);
 }
 gardens(){buildLivingGardens(this,this.vegetableLeaf);}
 hedgesAndField(){
  for(let i=0;i<80;i++){const a=i/80*Math.PI*2,x=Math.cos(a)*96,z=Math.sin(a)*74-15,y=this.at(x,z);this.batch.add('leaf',this.green,[x,y+1,z],[3.3,2.2,1],[0,a,0]);}
  for(const side of[-1,1])this.fence(side*34,47,20,side*.2);
  // Linen between posts near the south-bank homes, with slack fabric geometry.
  const x=-32,z=42,y=this.at(x,z),cloth=this.assets.material('flat',0xd6d0bb);this.cylinder(x,y,z,.06,2,this.wood);this.cylinder(x+6,y,z,.06,2,this.wood);this.box(x+3,y+1.8,z,6,.025,.025,this.wood);for(let i=0;i<4;i++)this.batch.add('leaf',cloth,[x+1+i*1.3,y+1.25,z],[1,1.1,1],[0,.03*i,0]);
 }
 buildTerrain(){
  const local=terrainGeometry(this.terrain,{size:320,segments:this.quality==='4k'?420:this.quality==='high'?320:200,edgeStep:40}),distant=terrainGeometry(this.terrain,{size:8000,segments:200,cutout:160}),material=this.assets.terrainMaterial(this.profile,this.highMaps||this.assets.maps);if(this.highMaps)material.normalMap=this.highMaps.grassN;const a=this.mesh(local,material),b=this.mesh(distant,material);a.castShadow=b.castShadow=false;this.terrainMesh=a;this.distantTerrain=b;
 }
 async addWater(){
  const points=[],uv=[],idx=[];for(let i=0;i<=240;i++){const x=-600+i*5,z=this.terrain.streamZ(x);points.push(x,0,z-3.9,x,0,z+3.9);uv.push(i*.1,0,i*.1,1);if(i<240){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.rotateX(Math.PI/2);
  const normal=await this.assets.texture('assets/realism/water-normal.jpg',{srgb:false});this.water=new Water(g,{textureWidth:this.quality==='4k'?1024:512,textureHeight:this.quality==='4k'?1024:512,waterNormals:normal,sunDirection:this.sun,waterColor:0x315f51,sunColor:0xffe8bf,distortionScale:.38,fog:true});this.water.rotation.x=-Math.PI/2;this.water.position.y=L.waterLevel;this.scene.add(this.water);this.resources.push(this.water);
 }
 tree(x,z,scale=1,golden=false){this.botany.tree(x,z,scale,golden?1:0);this.trees++;}
 nature(){
  const random=this.random;
  for(let i=0;i<(this.quality==='4k'?760:this.quality==='high'?470:310);i++){const x=(random()-.5)*620,z=(random()-.5)*540;if(Math.abs(x)<75&&z>-105&&z<75)continue;this.botany.tree(x,z,.55+random()*.75,i%3,true);this.trees++;}
  for(let i=0;i<28;i++){const x=-92+i*7,z=this.terrain.streamZ(x)+(i%2?12:-13);if(Math.abs(x)<29)continue;this.botany.tree(x,z,.7+random()*.35,i%3);this.trees++;}
  for(let row=0;row<3;row++)for(let i=0;i<7;i++){const x=-67+i*7,z=-3+row*7;if(Math.abs(x)<28)continue;this.botany.tree(x,z,.65,1);this.trees++;for(let fruit=0;fruit<10;fruit++){const a=fruit*.628;this.batch.add('sphere',this.assets.material('flat',fruit%3?0xaa4b35:0xc0aa52),[x+Math.sin(a)*1.1,this.at(x,z)+3.2+Math.cos(a)*.3,z+Math.cos(a)*1.1],[.085,.09,.085]);}}
  for(let i=0;i<180;i++){const x=(random()-.5)*210,z=this.terrain.streamZ(x)+(i%2?1:-1)*(4+random()*2.5),y=this.at(x,z),size=.12+random()*.35;this.batch.add('rock',this.rock,[x,y,z],[size,size*.5,size],[0,random()*6,0]);}
  this.mark('The orchard & wooded meadows',-48,this.at(-48,7)+3,7,'Layered trees, fruit-bearing orchard rows, hedgerows and grassy stream banks add depth beyond the village.');
 }
 smialDetails(x,y,z,w,h,scale,doorR,doorY){
  const iron=this.assets.material('metal',0x4a4b42),clay=this.assets.material('flat',0x98674b),leaf=this.green;
  for(const side of[-1,1]){
   for(let i=0;i<7;i++){const xx=x+side*(doorR*1.45+i*.35*scale);this.batch.add('rock',this.stone,[xx,y+.1,z+.3*scale],[.26*scale,.18*scale,.2*scale],[0,i*.6,0]);}
   const wx=x+side*w*.28;this.box(wx,y+h*.4,z+.76*scale,1.45*scale,.24*scale,.4*scale,this.wood);for(let i=0;i<5;i++){this.batch.add('leaf',leaf,[wx+(i-2)*.25*scale,y+h*.4+.26*scale,z+.8*scale],[.5*scale,.45*scale,1],[0,i*.7,0]);}
   for(let i=0;i<12;i++){this.batch.add('leaf',leaf,[x+side*(w*.43+Math.sin(i)*.1*scale),y+.3+i*.18*scale,z+.46*scale],[.36*scale,.42*scale,1],[.1,side*.2,i*.22]);}
   const px=x+side*1.7*scale,pz=z+1.4*scale,py=this.at(px,pz);this.cylinder(px,py,pz,.21*scale,.36*scale,clay);this.batch.add('ring',clay,[px,py+.36*scale,pz],[.22*scale,.22*scale,.5],[Math.PI/2,0,0]);this.batch.add('leaf',leaf,[px,py+.57*scale,pz],[.55*scale,.62*scale,1],[.1,side,0]);
  }
  for(const dy of[-.4,.4]){this.box(x-doorR*.6,doorY+dy*scale,z+.69*scale,.5*scale,.06*scale,.035,iron);for(const dx of[-.18,.18])this.batch.add('sphere',iron,[x-doorR*.6+dx*scale,doorY+dy*scale,z+.72*scale],[.025*scale,.025*scale,.02]);}
  const pipe=new THREE.CatmullRomCurve3([new THREE.Vector3(x-w*.45,y+h*.7,z+.15),new THREE.Vector3(x-w*.49,y+h*.6,z+.1),new THREE.Vector3(x-w*.49,y+.1,z+.1)]);this.mesh(new THREE.TubeGeometry(pipe,12,.04*scale,7,false),iron);
  for(let i=0;i<4;i++)this.box(x+(i-1.5)*.33*scale,y+.05,z+1.9*scale,.29*scale,.025,.6*scale,this.wood);
 }
 getCinematicCamera(time){const t=((time%40)+40)%40/40,eye=this.eyeCurve.getPoint(t),target=this.targetCurve.getPoint(t);eye.y=Math.max(eye.y,this.at(eye.x,eye.z)+1.5);return{eye,target,chapter:HOBBITON_TOUR[Math.floor(t*HOBBITON_TOUR.length)%HOBBITON_TOUR.length].title};}
 animate(time,tourTime=null){super.animate(time);this.botany?.update(time);this.people?.update(tourTime??time);if(this.wheel)this.wheel.rotation.x=-time*.19;}
 dispose(){this.botany?.dispose();this.botany=null;if(this.wheel)this.scene.remove(this.wheel);this.people?.dispose();this.people=null;super.dispose();for(const m of this.customMaterials)m.dispose();this.customMaterials=[];}
}
