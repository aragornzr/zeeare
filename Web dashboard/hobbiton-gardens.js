import * as THREE from './assets/vendor/three.module.js';
export function buildLivingGardens(world,leafTexture){
 const b=world.batch,assets=world.assets,earth=assets.material('earth',0x97816a),wood=world.wood;
 const cabbageLeaf=new THREE.PlaneGeometry(1,1,10,12),p=cabbageLeaf.attributes.position;for(let i=0;i<p.count;i++){const u=p.getX(i),v=p.getY(i)+.5;p.setXYZ(i,u*.48*Math.pow(Math.sin(Math.PI*v),.3),.05+v*.34,(v-.15)*.28+Math.sin(u*5)*.025);}
 cabbageLeaf.computeVertexNormals();b.geometries.set('cabbage-leaf',cabbageLeaf);
 const leaf=world.ownedMaterial({map:leafTexture,alphaTest:.22,side:THREE.DoubleSide,color:0xe3eadb,roughness:.53,normalScale:new THREE.Vector2(.2,.2)}),stem=assets.material('flat',0x577842),orange=assets.material('flat',0xc68635),red=assets.material('flat',0xaa4b33);
 const pumpkin=new THREE.SphereGeometry(1,24,16),v=pumpkin.attributes.position;for(let i=0;i<v.count;i++){const x=v.getX(i),z=v.getZ(i),a=Math.atan2(z,x),f=.92+Math.cos(a*10)*.08;v.setXYZ(i,x*f,v.getY(i)*.74,z*f);}pumpkin.computeVertexNormals();b.geometries.set('pumpkin',pumpkin);
 const tinyLeaf=new THREE.PlaneGeometry(1,1,4,6),tp=tinyLeaf.attributes.position;for(let i=0;i<tp.count;i++){const y=tp.getY(i)+.5;tp.setXYZ(i,tp.getX(i)*.12*Math.sin(Math.PI*y),y*.55,Math.sin(y*Math.PI)*.1);}tinyLeaf.computeVertexNormals();b.geometries.set('vegetable-frond',tinyLeaf);
 const bed=(x,z,w,d)=>{world.box(x,world.at(x,z)-.04,z,w,.08,d,earth);world.fence(x-w/2,z+d/2,w,0);};
 for(let plot=0;plot<3;plot++){const x=10+plot*6,z=4;bed(x,z,4.7,7);for(let row=0;row<4;row++)for(let j=0;j<5;j++){const xx=x-1.5+row*.9,zz=z-2.5+j*1.1,y=world.at(xx,zz);if(plot<2){for(let layer=0;layer<3;layer++)for(let k=0;k<5;k++){const a=k/5*Math.PI*2+layer*.7,s=1-layer*.23;b.add('cabbage-leaf',leaf,[xx,y+layer*.035,zz],[s,s,s],[layer*.2,a,0]);}}else{for(let k=0;k<7;k++)b.add('vegetable-frond',stem,[xx,y,zz],[.9,1,1],[.2,k*.897,0]);}}}
 for(let i=0;i<12;i++){const x=8.5+i*.65,z=-1,y=world.at(x,z);world.cylinder(x,y,z,.026,1.65,wood);for(let j=0;j<5;j++){b.add('cabbage-leaf',leaf,[x,y+j*.26,z],[.43,.6,.5],[.1,j*.8,0]);if(i%3===0)b.add('sphere',red,[x+.1,y+.6+j*.15,z+.1],[.065,.07,.065]);}}
 for(let i=0;i<9;i++){const x=29+(i%3)*1.1,z=4+Math.floor(i/3)*1.2,y=world.at(x,z),s=.2+(i%3)*.035;b.add('pumpkin',orange,[x,y+s*.65,z],[s,s,s]);world.cylinder(x,y+s*1.3,z,.018,.09,stem);b.add('cabbage-leaf',leaf,[x+.2,y,z],[1.1,.6,1.1],[.2,i,0]);}
 // Low apple orchard produce and ripening tomato baskets provide scale cues.
 for(let i=0;i<4;i++){const x=24+i*.6,z=9,y=world.at(x,z);world.cylinder(x,y,z,.25,.28,wood);for(let fruit=0;fruit<8;fruit++)b.add('sphere',fruit%2?red:orange,[x+(fruit%3-1)*.09,y+.25+Math.floor(fruit/3)*.06,z+(fruit%2-.5)*.16],[.07,.065,.07]);}
 const x=17,z=11,y=world.at(x,z);world.box(x,y+.55,z,1.1,.2,.7,wood);for(const side of[-1,1]){world.box(x+side*.55,y+.65,z,.09,.35,.8,wood);world.box(x+side*.4,y+.45,z+1,.09,.09,1.6,wood);world.box(x+side*.4,y,z+.25,.07,.55,.07,wood);}b.add('ring',world.dark,[x,y+.3,z-.55],[.3,.3,.7],[0,Math.PI/2,0]);
 world.vegetableTypes=['savoy cabbage','lettuce','carrot tops','climbing beans','tomatoes','pumpkins','herbs'];
 world.mark('Bagshot Row',0,world.at(0,-31)+2,-30,'Three modest hobbit-holes lie on the southern slope beneath Bag End.');
}
