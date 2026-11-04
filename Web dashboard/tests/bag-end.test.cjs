const test=require('node:test'),assert=require('node:assert/strict');

test('Bag End has repeatable wooded relief with Bilbo above the approach and smaller neighbouring homes',async()=>{
 const {BagEndTerrain,BAG_END_LAYOUT:L}=await import('../bag-end-layout.js');const{getDestinationProfile}=await import('../destination-profiles.js');const a=new BagEndTerrain(getDestinationProfile('Bag End')),b=new BagEndTerrain(getDestinationProfile('Bag End'));
 assert.ok(a.height(L.home.x,L.home.z)>a.height(L.gate.x,L.gate.z)+3);assert.ok(L.neighbours.length>=4);assert.ok(L.neighbours.every(h=>Math.abs(h.x)>25));assert.ok(L.oak.z<L.home.z);assert.equal(a.height(82,-150),b.height(82,-150));for(let x=-200;x<200;x+=11)for(let z=-300;z<120;z+=13)assert.ok(Number.isFinite(a.height(x,z)));
});

test('Bilbo smokes at home, Gandalf approaches the gate and Frodo runs out on grounded articulated geometry',async()=>{
 const THREE=await import('../assets/vendor/three.module.js');const{createBagEndCast}=await import('../bag-end-characters.js');const{BAG_END_LAYOUT:L}=await import('../bag-end-layout.js');const scene=new THREE.Scene(),terrain={height:(x,z)=>8-.1*z},cast=createBagEndCast(scene,terrain,{quality:'standard'});
 assert.deepEqual(cast.metadata.names,['Bilbo Baggins','Gandalf the Grey','Frodo Baggins']);assert.equal(cast.metadata.imageBased,false);assert.ok(cast.wizard.group.getObjectByName('Gandalf’s wooden staff'));assert.ok(cast.bilbo.group.getObjectByName('Bilbo’s cigar'));assert.equal(cast.bilbo.group.name,'Bilbo Baggins');assert.equal(cast.frodo.group.name,'Frodo Baggins');
 cast.update(1);const f=cast.frodo.group.position.clone(),wizardStart=cast.wizard.group.position.z,hip=cast.frodo.legs[0].hip.rotation.x;
 cast.update(5);assert.ok(cast.frodo.group.position.distanceTo(f)>2);assert.notEqual(cast.frodo.legs[0].hip.rotation.x,hip);assert.ok(cast.wizard.group.position.z<wizardStart);assert.equal(cast.bilbo.group.position.x,L.bilbo.x);
 for(let t=0;t<40;t+=.3){cast.update(t);for(const actor of[cast.bilbo.group,cast.frodo.group,cast.wizard.group])assert.ok(actor.position.y>=terrain.height(actor.position.x,actor.position.z));}
 cast.update(1);assert.ok(cast.frodo.group.position.distanceTo(f)<1e-8);let released=0;cast.wizard.cloak.geometry.addEventListener('dispose',()=>released++);cast.dispose();cast.dispose();cast.update(4);assert.equal(released,1);assert.equal(scene.children.length,0);
});

test('the complete Bag End world builds without a stream, keeps roof normals upward and disposes its scene',async()=>{
 const THREE=await import('../assets/vendor/three.module.js');const{BagEndWorld}=await import('../bag-end-world.js');const{getDestinationProfile}=await import('../destination-profiles.js');const cache=new Map(),textures=[];
 const assets={maps:{leaves:new THREE.Texture()},material(type,color=0xffffff){const key=type+color;if(!cache.has(key))cache.set(key,new THREE.MeshStandardMaterial({color}));return cache.get(key)},texture:async()=>{const t=new THREE.Texture();textures.push(t);return t},terrainMaterial:()=>new THREE.MeshStandardMaterial()};
 const scene=new THREE.Scene(),world=new BagEndWorld(scene,assets,getDestinationProfile('Bag End'),'standard');await world.build();assert.equal(world.peopleCount,3);assert.equal(world.buildings,6);assert.ok(world.trees>300);assert.equal(typeof world.terrain.streamZ,'undefined');assert.ok(world.landmarks.length>=6);assert.ok(world.terrainMesh.geometry.attributes.position.count>40000);
 const roof=scene.getObjectByName('Living turf joined to the Hill'),normal=roof.geometry.attributes.normal;assert.ok([...Array(normal.count).keys()].filter(i=>normal.getY(i)>0).length>normal.count*.98);
 for(let t=0;t<40;t+=.5){const c=world.getCinematicCamera(t);assert.ok(c.eye.y>=world.at(c.eye.x,c.eye.z)+1.24);world.animate(t,t);}
 world.dispose();assert.equal(scene.children.length,0);for(const m of cache.values())m.dispose();for(const t of textures)t.dispose();assets.maps.leaves.dispose();
});
