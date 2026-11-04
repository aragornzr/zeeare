import {THREE,ArchitectureBatch} from './atlas-realism.js?v=20261031-cinematic';
import {TerrainModel,clamp,randomOf,seedOf,fbm,noise2} from './atlas-terrain.js';
import {terrainGeometry} from './terrain-surface.js?v=20261031-cinematic';
import {graphicsLevel} from './graphics-quality.js';
import {addLandscapeDetail} from './landscape-detail.js';
import {Water} from './assets/vendor/Water.js';
import {HobbitonBotany} from './hobbiton-botany.js?v=20261031-cinematic';
import {createHallOfDurinScene} from './moria-fellowship.js';
// Physical, local scene layouts. All embellished plans remain fan interpretations.
export class DestinationWorld{
 constructor(scene,assets,profile,quality='high'){
  this.scene=scene;this.assets=assets;this.profile=profile;this.quality=quality;this.terrain=new TerrainModel(profile);this.random=randomOf(profile.seed||seedOf(profile.name));this.batch=new ArchitectureBatch(scene,assets,quality);this.resources=[];this.animations=[];this.landmarks=[];this.pathSegments=[];this.buildings=0;this.trees=0;
  const a=assets,p=profile.palette;this.stone=a.material('stone',profile.architecture==='gondorian'?0xd2d0bd:profile.architecture==='elven'?0xd3d6c1:profile.architecture==='dark'?0x57555a:0xb2a591);this.rock=a.material('rock',p.rock);this.wood=a.material(assets.portrait?'timber':'wood',0x9f8e72);this.roof=a.material('roof',profile.architecture==='rohan'?0xc8aa68:profile.architecture==='dark'?0x39383d:0x9fa8aa);this.dark=a.material('flat',0x101c21);this.window=a.material('window');this.light=a.material('glow',0xe5b875);this.green=a.material('leaf',p.foliage===0xb0a64d||p.foliage===0xb3a450?0xd2b64b:0x7f976f);this.brass=a.material('metal',0x9f8257);
 }
 mark(title,x,y,z,description){this.landmarks.push({title,position:[x,y,z],description});}
 box(...args){this.batch.box(...args);}cylinder(...args){this.batch.cylinder(...args);}
 at(x,z){return this.terrain.height(x,z);}
 flat(x,z,radius,y,edge){return this.terrain.flatten(x,z,radius,y,edge);}
 async build(){
  const p=this.profile,k=p.kind,n=p.name;
  if(['city','village','fortress','ruins'].includes(k)&&n!=='Lake-town')this.baseY=this.flat(0,0,k==='city'?85:k==='fortress'?65:45,Math.max(p.terrain.waterLevel+2,this.at(0,0)),28);else this.baseY=this.at(0,0);
  // Distinctive landmark builders run before terrain tessellation so foundations fit.
  if(p.landmark==='hidden-waterfall')this.hiddenRefuge();
  else if(n==='Minas Tirith')this.whiteCity();
  else if(n==='Isengard')this.isengard();
  else if(n==='Helm’s Deep')this.helmsDeep();
  else if(n==='Argonath')this.argonath();
  else if(n==='Edoras')this.edoras();
  else if(n==='Lake-town')this.lakeTown();
  else if(p.architecture==='hobbit')this.hobbitCountry();
  else if(['elven-waterfall','hidden-city','tree-city','golden-wood','woodland-gate'].includes(p.landmark)||['Rivendell','Gondolin','Doriath','Lothlórien','Caras Galadhon','Woodland Realm'].includes(n))this.elvenRealm();
  else if(['cave','mountain'].includes(k)&&['dwarven','dark'].includes(p.architecture))this.dwarvenGate();
  else if(/harbour|haven|port/.test(p.landmark)||['Grey Havens','Umbar','Pelargir','Dol Amroth','Havens of Sirion'].includes(n))this.harbour();
  else if(n==='Black Gate')this.blackGate();
  else if(k==='ruins')this.ruins();
  else if(['city','village','fortress'].includes(k))this.settlement();
  else if(k==='road'||(k==='mountain'&&/pass|redhorn/.test(p.landmark)))this.roadScene();
  else if(k==='volcano'||n==='Thangorodrim')this.volcano();
  else if(p.architecture==='elven'&&k!=='forest')this.elvenOutpost();
  else if(k==='river'||k==='valley')this.valleyDetails();
  this.buildTerrain();await this.addWater();this.nature();addLandscapeDetail(this);this.botany?.commit();this.batch.commit();
  if(n==='Moria')await this.moriaHall();
  if(!this.landmarks.length)this.mark(p.features[0].split(' ').slice(0,7).join(' '),0,this.at(0,0)+4,0,p.features.join('. '));
  return this;
 }
 buildTerrain(){
  // Concentrate triangles around explorable landmarks, retaining a seamless distant horizon.
  const material=this.assets.terrainMaterial(this.profile);
  for(const [size,segments,cutout]of [[600,graphicsLevel(this.quality).terrainSegments,0],[1800,180,300]]){const mesh=new THREE.Mesh(terrainGeometry(this.terrain,{size,segments,cutout,edgeStep:cutout?0:10}),material);mesh.receiveShadow=true;this.scene.add(mesh);this.resources.push(mesh);if(!cutout)this.terrainMesh=mesh;}
 }
 async addWater(){
  const p=this.profile,k=p.kind;const use=p.landmark==='hidden-waterfall'||['river','lake','coast','marsh','valley'].includes(k)||['Lake-town','Osgiliath','Argonath','Annúminas','Pelargir'].includes(p.name);if(!use)return;
  let geometry;
  if(['river','valley'].includes(k)||['Osgiliath','Argonath'].includes(p.name)){
   const pts=[],indices=[],width=k==='river'?22:14;for(let i=0;i<=180;i++){const z=-900+i*10,x=this.terrain.riverX(z);pts.push(x-width,0,z,x+width,0,z);if(i<180){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.rotateX(Math.PI/2);
  }else{geometry=new THREE.PlaneGeometry(1600,1600);}
  const normal=await this.assets.texture('assets/realism/water-normal.jpg',{srgb:false});
  const water=new Water(geometry,{textureWidth:graphicsLevel(this.quality).reflectionSize,textureHeight:graphicsLevel(this.quality).reflectionSize,waterNormals:normal,sunDirection:this.sun||new THREE.Vector3(-.4,.8,.5),sunColor:0xffe6bd,waterColor:p.palette.water,distortionScale:1.15,alpha:1,fog:true});
  water.rotation.x=-Math.PI/2;water.position.y=p.terrain.waterLevel;
  if(k==='coast')water.position.x=-650;
  this.scene.add(water);this.water=water;this.resources.push(water);
 }
 house(x,z,scale=1,angle=0,style=this.profile.architecture,yOverride){
  const r=this.random,w=(4+r()*2.5)*scale,d=(5+r()*3)*scale,h=(3+r()*2.8)*scale,y=yOverride??this.at(x,z),c=Math.cos(angle),s=Math.sin(angle);
  const place=(dx,dy,dz,bw,bh,bd,mat)=>this.box(x+dx*c+dz*s,y+dy,z-dx*s+dz*c,bw,bh,bd,mat,angle);
  place(0,-.4,0,w+.35,.6,d+.35,this.stone);const wall=this.assets.portrait&&['vernacular','rohan','harad'].includes(style)?this.assets.material('plaster',style==='harad'?0xd7bb8c:0xd3c6aa):this.stone;place(0,0,0,w,h,d,wall);
  this.batch.add('roof',this.roof,[x,y+h,z],[w*1.22,w*.72,d*1.2],[0,angle,0]);
  // Recessed glazing, stone sills, timber mullions, warm interior hearth glow and shutters remain real geometry.
  for(const side of[-1,1])for(let level=0;level<2;level++){
   const dx=side*w*.29,dy=h*(.38+level*.35);place(dx,dy,d*.504,.82*scale,.95*scale,.08*scale,level===0&&r()>.55?this.light:this.window);place(dx,dy-.1,d*.54,1.04*scale,.13*scale,.35*scale,this.stone);
   for(const edge of[-1,1])place(dx+edge*.48*scale,dy,d*.53,.13*scale,.95*scale,.12*scale,this.wood);place(dx,dy,d*.53,.06*scale,.95*scale,.14*scale,this.wood);place(dx,dy+.44*scale,d*.53,.9*scale,.07*scale,.12*scale,this.wood);
  }
  place(0,0,d*.51,w*.19,h*.46,.15,this.wood);place(0,h*.46,d*.53,w*.26,.14*scale,.22*scale,this.stone);place(0,0,d*.63,w*.3,.15,.6*scale,this.stone);place(0,.45,d*.61,.08,.08,.08,this.brass);
  for(const dx of[-w*.47,w*.47])place(dx,0,d*.53,.16,h,.18,this.wood);
  if(style==='rohan'||style==='vernacular'){place(0,h*.68,d*.54,w,.16,.12,this.wood);for(const dx of[-w*.23,w*.23])place(dx,0,d*.53,.1,h,.1,this.wood);}
  if(r()>.35){place(w*.27,h,0,.62*scale,w*.48,.7*scale,this.stone);place(w*.27,h+w*.48,0,.8*scale,.2,.86*scale,this.dark);}
  if(style==='elven'){for(const dx of[-w*.55,w*.55]){place(dx,0,0,.18,h+1,.3,this.stone);this.batch.add('cone',this.roof,[x+dx*c,y+h+2,z-dx*s],[.45,3,.45]);}}
  if(style==='harad')this.cylinder(x,y+h+w*.1,z,w*.42,w*.4,this.stone);
  if(this.quality!=='standard'){
   place(0,h+w*.36,0,.14*scale,.14*scale,d*1.22,this.roof);
   for(const edge of[-1,1])place(edge*w*.57,h-.08*scale,0,.12*scale,.18*scale,d*1.23,this.wood);
   for(let course=0;course<Math.ceil(h/.55);course++)for(const edge of[-1,1])place(edge*w*.47,course*.55,d*.505,.43*scale,.23*scale,.15*scale,this.stone);
  }
  this.buildings++;
 }
 groundOccupied(x,z){
  if(!this.isHobbiton&&['city','fortress','village'].includes(this.profile.kind)&&Math.hypot(x,z)<(this.profile.kind==='village'?55:105))return true;
  return this.pathSegments.some(({a,b,width})=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)<width*.65;});
 }
 road(points,width=3){
  for(let i=1;i<points.length;i++)this.pathSegments.push({a:points[i-1],b:points[i],width});
  const sampled=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(this.isHobbiton?.65:2)));for(let j=0;j<steps;j++){const f=j/steps;sampled.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);}}sampled.push(points.at(-1));points=sampled;
  const vertices=[],uv=[],indices=[];
  for(let i=0;i<points.length;i++){const [x,z]=points[i],[px,pz]=points[Math.max(0,i-1)],[nx,nz]=points[Math.min(points.length-1,i+1)],len=Math.hypot(nx-px,nz-pz)||1,dx=(nz-pz)/len*width/2,dz=-(nx-px)/len*width/2;vertices.push(x-dx,this.at(x-dx,z-dz)+.08,z-dz,x+dx,this.at(x+dx,z+dz)+.08,z+dz);uv.push(0,i*.4,1,i*.4);if(i<points.length-1){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,this.assets.material('earth',0xafa58d));m.receiveShadow=true;this.scene.add(m);this.resources.push(m);
 }
 tree(x,z,scale=1,golden=false){
  if(!this.botany)this.botany=new HobbitonBotany(this.scene,this.assets,this.terrain,this.quality,{groundCover:!['snow','arid','ash'].includes(this.profile.biome),golden,exclude:(x,z)=>this.groundOccupied(x,z)});
  this.botany.tree(x,z,scale,golden?1:this.trees%3,Math.hypot(x,z)>180);this.trees++;
 }
 nature(){
  const p=this.profile,r=this.random,k=p.kind,forest=k==='forest',empty=['snow','arid','ash'].includes(p.biome),count=empty?12:forest?graphicsLevel(this.quality).trees:k==='mountain'?120:170;
  for(let i=0;i<count;i++){const x=(r()-.5)*680,z=(r()-.5)*680,y=this.at(x,z);if(y<p.terrain.waterLevel+.5||Math.hypot(x,z)<(forest?15:['city','fortress'].includes(k)?100:k==='village'?55:35))continue;if(p.biome==='snow'&&y>40)continue;if(this.assets.portrait){const dx=(this.at(x+.5,z)-this.at(x-.5,z)),dz=(this.at(x,z+.5)-this.at(x,z-.5));if(Math.hypot(dx,dz)>.85||(p.biome==='alpine'&&y>85))continue;}this.tree(x,z,.45+r()*1.0,/lórien|Galadhon/.test(p.name));}
  const rockCount=graphicsLevel(this.quality).rocks;
  for(let i=0;i<rockCount;i++){const x=(r()-.5)*600,z=(r()-.5)*600;if(Math.hypot(x,z)<35&&['city','village','fortress'].includes(k))continue;const y=this.at(x,z);if(y<p.terrain.waterLevel-.5)continue;if(noise2(x*.045,z*.045,p.seed)<.42)continue;const s=.08+Math.pow(r(),2.8)*1.9;this.batch.add('rock',this.rock,[x,y+s*.18,z],[s,s*(.3+r()*.5),s],[r()*2,r()*6,r()]);}
  // Fine meadow blades and low leaf clumps use the same botanical alpha geometry.
  if(!empty)for(let i=0;i<(this.quality==='standard'?500:this.quality==='4k'?2400:1400);i++){const x=(r()-.5)*280,z=(r()-.5)*280,y=this.at(x,z);if(y<=p.terrain.waterLevel+.3||Math.hypot(x,z)<25)continue;const s=.2+r()*.45;this.batch.add('leaf',this.green,[x,y+s*.35,z],[s*1.3,s,1],[0,r()*6,0]);}
  if(k==='forest'){
   this.road(Array.from({length:60},(_,i)=>{const z=-180+i*6;return[Math.sin(z*.025)*9,z];}),2);
   this.mark(p.name.includes('Galadhon')?'Canopy walk':'The woodland path',0,this.at(0,0)+5,0,p.features[0]);
  }
 }
 settlement(){
  const p=this.profile,r=this.random,k=p.kind,count=k==='city'?185:k==='fortress'?55:38;
  for(let row=-5;row<=5;row++)this.road(Array.from({length:40},(_,i)=>[-95+i*5,row*16+Math.sin(i*.14)*2]),k==='city'?3.2:2);
  for(let i=0;i<count;i++){const x=(i%14-6.5)*12+(r()-.5)*2,z=(Math.floor(i/14)-count/28)*13;if(Math.abs(x)<7)continue;this.house(x,z,.7+r()*.3,(r()-.5)*.18);}
  if(k==='city'||k==='fortress'){this.wallRing(0,0,92,7);this.hall(0,-22,1.8);this.mark(p.name+' · central hall',0,this.at(0,-22)+15,-22,p.features[0]);}
  else this.mark('Village crossing',0,this.at(0,0)+5,0,p.features[0]);
  if(p.architecture==='dark')this.darkTower(0,-28,45);
 }
 wallRing(cx,cz,radius,height=6,baseY){
  const segments=Math.round(radius*2.4),stone=this.stone;
  for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,x=cx+Math.sin(a)*radius,z=cz+Math.cos(a)*radius;if(Math.abs(x-cx)<4&&z>cz)continue;const y=baseY??this.at(x,z);this.box(x,y,z,Math.PI*2*radius/segments+.15,height,1.4,stone,a);if(i%2===0)this.box(x,y+height,z,.7,.9,1.6,stone,a);if(i%22===0){this.cylinder(x,y,z,2.5,height+3,stone);for(let j=0;j<8;j++){const b=j/8*Math.PI*2;this.box(x+Math.sin(b)*2.2,y+height+3,z+Math.cos(b)*2.2,.6,.9,.6,stone);}}}
 }
 hall(x,z,scale=1,yOverride){this.house(x,z,scale,0,this.profile.architecture,yOverride);const y=yOverride??this.at(x,z);for(const side of[-1,1])for(let i=0;i<4;i++){this.cylinder(x+side*4*scale,y,z-3*scale+i*2*scale,.22*scale,5.5*scale,this.stone);this.box(x+side*4*scale,y+5.4*scale,z-3*scale+i*2*scale,.8*scale,.3,.8*scale,this.stone);}}
 whiteCity(){
  const cy=this.baseY,r=this.random;
  for(let ring=6;ring>=0;ring--){const radius=19+ring*11,y=cy+(6-ring)*6;this.flat(0,-20,radius,y,4);this.wallRing(0,-20,radius,5,y);const count=Math.floor(radius*.65);for(let i=0;i<count;i++){const a=i/count*Math.PI*2;if(Math.abs(Math.sin(a))<.1&&Math.cos(a)>0)continue;this.house(Math.sin(a)*(radius-5),-20+Math.cos(a)*(radius-5),.6, a, 'gondorian',y);}}
  const top=cy+36;this.hall(0,-23,1.8,top);this.cylinder(0,top,-24,2.6,28,this.stone);this.cylinder(0,top+28,-24,3.1,1,this.stone);this.batch.add('cone',this.roof,[0,top+32,-24],[2.8,6,2.8]);
  this.tree(9,-12,.65,true);this.cylinder(8,top,-7,3.3,.6,this.stone);this.cylinder(8,top+.6,-7,2.8,.1,this.assets.material('metal',0x5f9fa5));
  // The great rock spur divides the terraces and projects over the lower city.
  this.batch.add('rock',this.rock,[0,cy+23,-13],[4,25,58],[0,0,0]);
  this.mark('The Citadel & White Tower',0,top+24,-24,'Seven descending fortified terraces and the high citadel.');this.mark('Great Gate',0,cy+7,71,'Lower stone gate opening toward the Pelennor.');
 }
 isengard(){const y=this.baseY;this.wallRing(0,0,92,8,y);this.darkTower(0,0,82);for(let i=0;i<8;i++){const a=i*Math.PI/4;this.road(Array.from({length:30},(_,j)=>[Math.sin(a)*j*3,Math.cos(a)*j*3]),3);}this.mark('Orthanc',0,y+66,0,'The black, four-horned tower within the ring of Isengard.');}
 darkTower(x,z,height){const y=this.at(x,z),m=this.assets.material('rock',0x23272b);this.cylinder(x,y,z,6,height,m);for(const s of[-1,1])for(const t of[-1,1]){this.box(x+s*4,y,z+t*4,2,height+6,2,m);this.batch.add('cone',m,[x+s*4,y+height+12,z+t*4],[1.6,12,1.6]);}for(let j=0;j<9;j++)this.box(x,y+j*height/10,z+6.1,.7,2,.08,this.window);}
 helmsDeep(){
  const y=this.baseY;for(let i=0;i<60;i++){const x=-80+i*2.7,z=-12+Math.sin(i*.04)*7;this.box(x,y,z,2.8,13,4,this.stone);if(i%2===0)this.box(x,y+13,z,1.2,1.1,4.2,this.stone);}
  this.cylinder(47,y,-28,12,28,this.stone);this.wallRing(47,-28,25,14,y);this.hall(45,-38,2,y);this.batch.add('rock',this.rock,[60,y+35,-80],[85,65,35]);this.mark('The Hornburg',47,y+28,-28,'Round keep above the Deeping Wall and the mountain gorge.');
 }
 argonath(){
  for(const s of[-1,1]){const x=s*27,z=-22,y=this.flat(x,z,10,this.at(x,z)+2,12);this.box(x,y,z,14,5,14,this.stone);this.box(x,y+5,z,9,38,9,this.stone);this.batch.add('cone',this.stone,[x,y+25,z],[7,36,5]);this.batch.add('sphere',this.stone,[x,y+47,z],[3.3,4.5,3]);this.cylinder(x,y+50,z,3.6,2,this.stone);this.box(x-s*5,y+27,z+1,3,18,3,this.stone);this.box(x-s*7,y+40,z+2,5,7,2,this.stone);for(let i=0;i<4;i++)this.box(x-s*7+i*.7,y+47,z+2,.5,3,.7,this.stone);for(let i=0;i<7;i++)this.box(x-3+i,y+7,z+4.6,.17,30,.2,this.rock);}
  this.mark('The Pillars of the Kings',0,55,-22,'Paired monumental stone kings above the Anduin gorge.');
 }
 edoras(){const y=this.baseY;this.flat(0,-20,20,y+15,18);this.hall(0,-20,2.8,y+15);for(let i=0;i<65;i++){const a=i*2.4,r=25+(i%8)*7;this.house(Math.sin(a)*r,Math.cos(a)*r,.65, a*.05,'rohan');}this.wallRing(0,0,88,3);this.mark('Meduseld · the Golden Hall',0,y+31,-20,'A golden-roofed hall above the timber town and open plains.');}
 hobbitCountry(){
  const r=this.random,n=this.profile.name,count=n==='Bag End'?1:n==='Hobbiton'?13:24;
  for(let i=0;i<count;i++){const x=i===0?0:(i%6-2.5)*23,z=i===0?-8:(Math.floor(i/6)-1)*26,y=this.at(x,z),s=i===0?1.2:.8+r()*.25;
   this.batch.add('sphere',this.assets.material('grass',0x759d58),[x,y,z],[9*s,5*s,7*s]);this.box(x,y,z+5.8*s,10*s,4*s,1,this.stone);
   this.batch.add('cylinder',this.assets.material('wood',i===0?0x3f7539:0x746338),[x,y+2*s,z+6.4*s],[1.6*s,.13,1.6*s],[Math.PI/2,0,0]);this.batch.add('ring',this.assets.material('flat',i===0?0x355f34:0x715636),[x,y+2*s,z+6.55*s],[1.6*s,1.6*s,.6]);
   this.batch.add('sphere',this.brass,[x+.8*s,y+2*s,z+6.7*s],[.09,.09,.09]);for(const side of[-1,1]){this.batch.add('cylinder',this.window,[x+side*3.3*s,y+2.2*s,z+6.35*s],[.65*s,.08,.65*s],[Math.PI/2,0,0]);this.batch.add('ring',this.wood,[x+side*3.3*s,y+2.2*s,z+6.45*s],[.66*s,.66*s,.5]);}
   this.road([[x,z+7*s],[x,z+13*s],[0,z+17*s]],1.4);for(let f=0;f<12;f++){const fx=x+(f%6-2.5)*1.1,fz=z+9+Math.floor(f/6)*2;this.batch.add('leaf',this.green,[fx,this.at(fx,fz)+.4,fz],[1,.8,1],[0,r()*6,0]);}this.buildings++;
  }
  this.tree(-10,-14,1.5);this.mark(n==='Bag End'?'The green door of Bag End':'The Hill',0,this.at(0,-8)+4,-1,this.profile.features[0]);
 }
 elvenRealm(){
  const p=this.profile,r=this.random,treeCity=['Caras Galadhon','Lothlórien'].includes(p.name);
  if(treeCity){for(let i=0;i<24;i++){const a=i*2.4,radius=15+(i%5)*10,x=Math.sin(a)*radius,z=Math.cos(a)*radius,y=this.at(x,z);this.tree(x,z,2.2,true);for(let j=0;j<2;j++){const h=y+12+j*9;this.cylinder(x,h,z,5,.35,this.stone);for(let k=0;k<12;k++){const b=k/12*Math.PI*2;this.box(x+Math.sin(b)*4.8,h+.35,z+Math.cos(b)*4.8,.12,1.5,.12,this.wood);if(k%3===0)this.batch.add('sphere',this.light,[x+Math.sin(b)*4.8,h+1.95,z+Math.cos(b)*4.8],[.08,.11,.08]);}if(j===1)this.house(x,z,.55,0,'elven',h+.4);}}this.mark('The flets of '+p.name,0,this.at(0,0)+23,0,p.features[0]);}
  else{for(let i=0;i<32;i++){const side=i%2?1:-1,x=side*(22+(i%4)*10),z=-65+Math.floor(i/2)*9,y=this.flat(x,z,7,this.at(x,z),5);if(i%4===0)this.elvenHall(x,z,.6+r()*.3,y);else this.house(x,z,.6+r()*.25,side*.2,'elven',y);}
   for(const z of[-30,10,45])this.bridge(0,z,38,4);
   this.elvenHall(33,-30,1.5,this.at(33,-30));this.waterfall(-10,-58,26);this.mark('Elven halls above the valley',33,this.at(33,-30)+18,-30,p.features[0]);this.mark('Cascade & slender crossing',-10,18,-58,p.features[1]);}
 }
 elvenHall(x,z,s=1,y=this.at(x,z)){
  this.box(x,y,z,12*s,1,20*s,this.stone);this.box(x,y+1,z,8*s,8*s,14*s,this.stone);this.batch.add('elven-roof',this.roof,[x,y+9*s,z],[15*s,9*s,20*s]);
  for(const side of[-1,1])for(let j=0;j<5;j++){const zz=z-8*s+j*4*s;this.cylinder(x+side*5.4*s,y+1,zz,.18*s,8*s,this.stone);this.batch.add('arch',this.stone,[x+side*5.4*s,y+5.5*s,zz+1.5*s],[1.7*s,2*s,.35*s],[0,Math.PI/2,0]);this.box(x+side*4.05*s,y+2.5*s,zz,0.12,4.4*s,1.7*s,j%2===0?this.light:this.window);}
  for(let i=0;i<5;i++){this.box(x-4*s+i*2*s,y+2,z+7.05*s,1.2*s,4.5*s,.12,i===2?this.light:this.window);this.box(x-4*s+i*2*s,y+6.3*s,z+7.1*s,1.5*s,.18,.25,this.stone);}this.box(x,y+1,z+9*s,13*s,.3,3*s,this.stone);
  for(let i=0;i<15;i++)this.box(x-6*s+i*.85*s,y+1.4,z+10.3*s,.07,1.4,.07,this.stone);this.box(x,y+2.7,z+10.3*s,13*s,.12,.12,this.stone);this.buildings++;
 }
 bridge(x,z,width=32,depth=4){const y=Math.max(this.at(x-width/2,z),this.at(x+width/2,z),this.profile.terrain.waterLevel+4);this.box(x,y,z,width,1,depth,this.stone);for(const side of[-1,1])for(let k=-width/2;k<=width/2;k+=2){this.box(x+k,y+1,z+side*depth*.47,.17,1.4,.17,this.stone);if(k<width/2)this.box(x+k+1,y+2.25,z+side*depth*.47,2,.17,.2,this.stone);}this.batch.add('arch',this.stone,[x,y-9,z],[width*.45,8,depth*.18],[0,0,0]);}
 waterfall(x,z,height=24){
  const top=Math.max(this.at(x,z),this.profile.terrain.waterLevel+height),g=new THREE.PlaneGeometry(5,height,1,14),m=new THREE.MeshStandardMaterial({color:0xb5dee5,transparent:true,opacity:.68,roughness:.14,side:THREE.DoubleSide,emissive:0x294d57,emissiveIntensity:.18});
  const water=new THREE.Mesh(g,m);water.position.set(x,top-height/2,z);this.scene.add(water);this.resources.push(water);this.animations.push(t=>{const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getY(i)*2+t*4)*.16);p.needsUpdate=true;});this.mark('Waterfall',x,top-height*.3,z,'Falling water and spray beneath the stone ledges.');
 }
 harbour(){
  const p=this.profile,shore=p.kind==='coast'?55:55,y=this.flat(shore,0,70,p.terrain.waterLevel+3,14);
  for(let i=0;i<35;i++)this.house(shore+12+(i%5)*12,-50+Math.floor(i/5)*14,.85,Math.PI/2,p.architecture,y);
  for(let i=0;i<4;i++){const z=-35+i*23;this.box(-12,y-.3,z,92,.8,5,this.stone);for(let j=0;j<10;j++)this.box(-55+j*9,y-.1,z-2,.4,2,.4,this.wood);this.ship(-45,y-2,z+9,1);}
  for(const z of[-60,60]){this.cylinder(shore,y,z,4,24,this.stone);this.batch.add('cone',this.roof,[shore,y+29,z],[5,10,5]);this.batch.add('sphere',this.light,[shore,y+23,z],[1.2,1.2,1.2]);}
  this.mark('The quays of '+p.name,-8,y+5,0,p.features[0]);
 }
 ship(x,y,z,s=1){
  this.batch.add('sphere',this.wood,[x,y,z],[3*s,1.5*s,9*s]);this.box(x,y+.3,z,5*s,.35,15*s,this.wood);this.cylinder(x,y,z,.12,14*s,this.wood);
  this.batch.add('leaf',this.assets.material('flat',0xe0dac4),[x+2.5*s,y+9*s,z],[5*s,8*s,1],[0,Math.PI/2,0]);
 }
 lakeTown(){const y=this.profile.terrain.waterLevel+2;for(let row=-3;row<=3;row++){this.box(row*10,y,0,3,.5,100,this.wood);for(let i=-4;i<=4;i++){if(row===0)continue;this.house(row*10+3.5,i*10,.6,Math.PI/2,'vernacular',y+.5);for(const z of[i*10-2,i*10+2])this.cylinder(row*10,y-5,z,.25,5,this.wood);}}this.box(0,y,0,85,.6,5,this.wood);this.hall(0,-30,1.8,y+.6);this.mark('Timber streets above the Long Lake',0,y+10,0,this.profile.features[0]);}
 dwarvenGate(){const y=this.flat(0,-15,25,Math.max(3,this.at(0,-15)),15);this.box(0,y,-22,20,26,8,this.rock);this.box(0,y,-16.8,9,17,.4,this.dark);for(const side of[-1,1]){this.box(side*7,y,-15,3,23,5,this.stone);for(let j=0;j<5;j++)this.box(side*7,y+3+j*4,-12.4,3.4,.6,.6,this.brass);}for(let j=0;j<4;j++)this.box(0,y+17+j*2,-15,16-j*2,2,5,this.stone);for(let i=0;i<15;i++)this.box(0,y+i*.14-1,17-i*2,13,.3,2.1,this.stone);this.mark('The mountain gate',0,y+14,-12,this.profile.features[0]);}
 blackGate(){const y=this.baseY;this.box(0,y,0,75,24,5,this.assets.material('metal',0x292d2c));for(const side of[-1,1]){this.cylinder(side*47,y,0,9,42,this.stone);for(let i=0;i<8;i++)this.batch.add('cone',this.dark,[side*47+Math.sin(i)*8,y+48,Math.cos(i)*8],[1,12,1]);}for(let i=0;i<30;i++){this.box(-36+i*2.5,y,3,.5,24,.5,this.dark);this.batch.add('cone',this.dark,[-36+i*2.5,y+27,3],[.5,6,.5]);}this.mark('The Morannon',0,y+23,0,this.profile.features[0]);}
 ruins(){const p=this.profile,r=this.random,y=this.baseY;if(p.landmark==='barrows'||p.landmark==='southern-downs'){for(let i=0;i<10;i++){const x=(i%5-2)*22,z=Math.floor(i/5)*30;this.batch.add('sphere',this.assets.material('earth',0x788553),[x,this.at(x,z),z],[8,4,7]);this.box(x,this.at(x,z),z+5,2.3,2,.1,this.dark);}this.mark('The old burial mounds',0,y+4,0,p.features[0]);return;}
 for(let i=0;i<70;i++){const x=(r()-.5)*130,z=(r()-.5)*130;this.box(x,this.at(x,z),z,3+r()*5,.8+r()*8,1.4,this.stone);}
 const radius=p.name==='Weathertop'?19:36;this.wallRing(0,0,radius,3);for(let i=0;i<16;i++){const a=i/16*Math.PI*2,x=Math.sin(a)*(radius-5),z=Math.cos(a)*(radius-5);this.cylinder(x,this.at(x,z),z,1,3+r()*5,this.stone);}
 if(p.name==='Osgiliath'){this.bridge(0,0,62,7);this.bridge(0,-52,62,6);}
 this.mark(p.name+' · surviving stonework',0,y+8,0,p.features[0]);}
 roadScene(){const p=this.profile;const path=Array.from({length:150},(_,i)=>{const z=-450+i*6;return[Math.sin(z*.009)*30+Math.sin(z*.025)*5,z];});this.road(path,p.landmark.includes('pass')?2.2:4);for(let i=0;i<18;i++){const z=-220+i*24,x=Math.sin(z*.009)*30+Math.sin(z*.025)*5;this.box(x+4,this.at(x+4,z),z,.4,.8,.5,this.stone);}if(p.name==='Paths of the Dead'){for(let z=-50;z<=40;z+=18){this.box(-5,this.at(-5,z),z,2,12,4,this.rock);this.box(5,this.at(5,z),z,2,12,4,this.rock);this.box(0,this.at(0,z)+12,z,12,3,4,this.rock);}}
 this.mark('The '+p.name,0,this.at(0,0)+4,0,p.features[0]);}
 volcano(){const p=this.profile,mat=this.assets.material('glow',0xe84c0b);for(let i=0;i<40;i++){const a=i/40*Math.PI*2,r=13+i%3*3,x=Math.sin(a)*r,z=-25+Math.cos(a)*r;this.batch.add('rock',mat,[x,this.at(x,z)+.2,z],[3,.4,3]);}if(p.name==='Thangorodrim')for(const x of[-110,0,110])this.batch.add('rock',this.rock,[x,60,-90],[65,150,60]);this.mark('The volcanic summit',0,this.at(0,-25)+10,-25,p.features[0]);}
 valleyDetails(){const p=this.profile,r=this.random;if(p.architecture!=='none')for(let i=0;i<14;i++){const x=30+(i%4)*15,z=-70+Math.floor(i/4)*27;this.house(x,z,.65+r()*.3);}if(p.kind==='river')this.bridge(0,0,45,4);if(/waterfall/.test(p.landmark)||['Rauros','Henneth Annûn'].includes(p.name))this.waterfall(0,-20,32);if(p.landmark==='vineyard')for(let j=0;j<15;j++)for(let i=0;i<30;i++){const x=30+j*3,z=-90+i*5;this.batch.add('leaf',this.green,[x,this.at(x,z)+1,z],[2,2,1],[0,Math.PI/2,0]);this.cylinder(x,this.at(x,z),z,.07,1.8,this.wood);}this.mark('The '+p.name+' landscape',0,this.at(0,0)+8,0,p.features[0]);}
 hiddenRefuge(){const y=this.flat(0,-25,18,this.at(0,-25),12);this.box(0,y,-31,26,24,12,this.rock);this.box(0,y+2,-24.6,11,9,.25,this.dark);for(const side of[-1,1])this.box(side*6,y,-24,1.3,13,2,this.stone);this.box(0,y+11,-24,13,2,2,this.stone);this.box(0,y,-17,22,1,14,this.rock);this.waterfall(0,-21,27);this.mark('The refuge behind the falls',0,y+7,-23,this.profile.features[0]);}
 elvenOutpost(){this.hall(22,-20,1.5,this.at(22,-20));this.mark('Elven stonework',22,this.at(22,-20)+10,-20,this.profile.features[0]);}
 async moriaHall(){
  const [exploreTexture,chaseTexture,flameTexture]=await Promise.all([
   this.assets.texture?.('assets/moria/hall-of-durin.jpg').catch(()=>null),
   this.assets.texture?.('assets/moria/hall-goblin-chase.jpg').catch(()=>null),
   this.assets.texture?.('assets/realism/flame.png').catch(()=>null)
  ]);
  this.hallScene=createHallOfDurinScene(this.scene,{stone:this.stone,rock:this.rock,metal:this.brass,flameTexture,exploreTexture,chaseTexture,quality:this.quality});
  this.hallScene.root.position.y=this.at(0,0);
  this.peopleCount=this.hallScene.metadata.fellowshipCount;
  this.story={metadata:{names:this.hallScene.metadata.fellowshipNames}};
  this.mark('Gandalf & the Fellowship in the Hall of Durin',0,this.at(0,0)+3,6,'Gandalf holds his staff aloft to light the path for Aragorn, Legolas, Gimli, Boromir, Frodo, Sam, Merry and Pippin.');
  this.mark('Encircling Goblins of Moria & Distant Balrog',0,this.at(0,0)+8,-45,'Goblins of Moria almost surround the running Fellowship while the Balrog of Morgoth rises afar in shadow and flame.');
 }
 animate(time,tourTime=null){this.botany?.update(time);if(this.water)this.water.material.uniforms.time.value=time*.55;if(this.hallScene)this.hallScene.update(tourTime??time,tourTime!==null);for(const fn of this.animations)fn(time);}
 dispose(){this.hallScene?.dispose();this.hallScene=null;for(const m of this.detailMaterials||[])m.dispose();this.detailMaterials=[];this.botany?.dispose();this.botany=null;this.batch.dispose();for(const m of this.resources){this.scene.remove(m);m.geometry?.dispose();if(m.isWater){m.disposeReflection();m.material.dispose();}else if(m===this.terrainMesh||this.animations.length&&m.material?.transparent)m.material?.dispose();}this.resources=[];}
}
