const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('Moria Hall of Durin exploration and Goblin encirclement pictures are bundled high-resolution JPEGs',()=>{
 for(const file of['hall-of-durin.jpg','hall-goblin-chase.jpg','bridge-battle.jpg']){
  const fullPath=path.join(__dirname,'../assets/moria',file);
  const buf=fs.readFileSync(fullPath);
  assert.equal(buf.readUInt16BE(0),0xffd8,file+' is a valid JPEG');
  assert.ok(buf.length>200000,file+' has rich photographic detail');
 }
});

test('Hall of Durin 3D scene builds Gandalf lighting the path with all 8 companions, encircling Goblins and the Balrog afar',async()=>{
 const THREE=await import('../assets/vendor/three.module.js');
 const {createHallOfDurinScene,FELLOWSHIP_SPECS,GOBLIN_RING}=await import('../moria-fellowship.js');
 const {FELLOWSHIP_NAMES,hallChasePose}=await import('../moria-battle.js');

 assert.deepEqual(FELLOWSHIP_SPECS.map(s=>s.name),FELLOWSHIP_NAMES);
 assert.equal(FELLOWSHIP_NAMES.length,9);
 assert.ok(GOBLIN_RING.length>=36);

 const scene=new THREE.Scene();
 const exploreTexture=new THREE.Texture(),chaseTexture=new THREE.Texture(),flameTexture=new THREE.Texture();
 const hall=createHallOfDurinScene(scene,{exploreTexture,chaseTexture,flameTexture,quality:'standard'});

 assert.equal(hall.metadata.fellowshipCount,9);
 assert.deepEqual(hall.metadata.fellowshipNames,[
  'Gandalf the Grey','Aragorn','Legolas','Gimli','Boromir',
  'Frodo Baggins','Samwise Gamgee','Meriadoc Brandybuck','Peregrin Took'
 ]);
 assert.ok(hall.gandalf.getObjectByName('Gandalf’s staff of Durin'),'Gandalf holds his staff to light the path');
 assert.ok(hall.staffLight.intensity>200,'Gandalf’s staff illuminates the Hall of Durin');

 // Verify the Balrog of Morgoth is positioned afar in the background behind the pillars
 assert.ok(hall.balrog.position.z<=-45,'Balrog of Morgoth is seen afar in the background');
 assert.ok(hall.metadata.balrogDistance>50,'Balrog stands far behind the Fellowship');

 // Verify Goblins of Moria almost surround the Fellowship on both left and right sides
 const leftGoblins=hall.goblins.filter(g=>g.group.position.x<-3);
 const rightGoblins=hall.goblins.filter(g=>g.group.position.x>3);
 assert.ok(leftGoblins.length>=12,'Goblins flank the left colonnade');
 assert.ok(rightGoblins.length>=12,'Goblins flank the right colonnade');

 // Verify running animation during the 3D video chase
 const initialGandalfZ=hall.gandalf.position.z;
 const initialLegRot=hall.companions[1].leftLeg.rotation.x;
 const initialGoblinDist=Math.hypot(hall.goblins[0].group.position.x,hall.goblins[0].group.position.z-5.4);

 hall.update(12.5,true);
 assert.notEqual(hall.companions[1].leftLeg.rotation.x,initialLegRot,'Companions articulate running stride in 3D video');
 const chaseGoblinDist=Math.hypot(hall.goblins[0].group.position.x,hall.goblins[0].group.position.z-5.4);
 assert.ok(chaseGoblinDist<initialGoblinDist,'Goblins surge inward to almost surround the running Fellowship');
 assert.ok(hall.balrog.position.z<=-40,'Balrog remains afar in the background during the chase');
 assert.ok(hallChasePose(12.5).phaseCaption.length>10);

 hall.dispose();
 assert.equal(scene.children.length,0,'Hall of Durin 3D scene disposes cleanly');
 exploreTexture.dispose();chaseTexture.dispose();flameTexture.dispose();
});

test('DestinationWorld integrates the Hall of Durin Fellowship & distant Balrog for Moria while upgrading the other 117 places',async()=>{
 const {THREE}=await import('../atlas-realism.js');
 const {DestinationWorld}=await import('../destination-world.js');
 const {getDestinationProfile}=await import('../destination-profiles.js');
 const {portraitQuality}=await import('../portrait-quality.js');

 // Check that all 117 non-Moria places receive the new photorealistic sunShafts, microContrast, specularScale and vignette parameters
 const rivendellLook=portraitQuality(getDestinationProfile('Rivendell'));
 assert.ok(rivendellLook.sunShafts>0);
 assert.ok(rivendellLook.microContrast>0);
 assert.ok(rivendellLook.specularScale>1);
 assert.ok(rivendellLook.vignette>0);
 assert.equal(portraitQuality(getDestinationProfile('Moria')),null);

 // Check Moria DestinationWorld builds the Hall of Durin cast
 const cache=new Map();
 const assets={
  portrait:false,
  maps:{leaves:new THREE.Texture()},
  material(type,color=0xffffff){const k=type+color;if(!cache.has(k))cache.set(k,new THREE.MeshStandardMaterial({color}));return cache.get(k);},
  texture:async()=>new THREE.Texture(),
  terrainMaterial:()=>new THREE.MeshStandardMaterial()
 };
 const scene=new THREE.Scene();
 const world=new DestinationWorld(scene,assets,getDestinationProfile('Moria'),'standard');
 await world.build();
 assert.equal(world.peopleCount,9);
 assert.equal(world.story.metadata.names.length,9);
 world.animate(8,8);
 world.dispose();
 for(const m of cache.values())m.dispose();
 assets.maps.leaves.dispose();
});

