const test=require('node:test'),assert=require('node:assert/strict');

test('native UHD is exact, while live lower detail respects display and GPU limits',async()=>{
 const {renderSize}=await import('../graphics-quality.js');
 assert.deepEqual(renderSize('4k',390,650,3,4096),{width:3840,height:2160,pixelRatio:1});
 assert.throws(()=>renderSize('4k',1440,810,1,2048),/cannot render a native/);
 const high=renderSize('high',1600,900,3,2048);assert.ok(high.width*high.pixelRatio<=2048);assert.ok(high.height*high.pixelRatio<=2048);
 assert.equal(renderSize('standard',390,650,3,4096).pixelRatio,1);
});

test('UHD keeps higher geometry, vegetation and reflection budgets than High across the atlas',async()=>{
 const {GRAPHICS_LEVELS:g,cinematicLighting}=await import('../graphics-quality.js');
 const {destinationProfiles}=await import('../destination-profiles.js');
 for(const key of['terrainSegments','shadowSize','reflectionSize','rocks','trees','grass','detail'])assert.ok(g['4k'][key]>=g.high[key]&&g.high[key]>=g.standard[key],key);
 const before=JSON.stringify(destinationProfiles);
 for(const p of Object.values(destinationProfiles)){
  const lighting=cinematicLighting(p);for(const [key,v]of Object.entries(lighting))assert.ok(typeof v==='boolean'||Number.isFinite(v),p.name+' '+key);
  assert.ok(lighting.exposure>0&&lighting.fog>0);
 }
 assert.equal(JSON.stringify(destinationProfiles),before);
 assert.notDeepEqual(cinematicLighting(destinationProfiles.Hobbiton),cinematicLighting(destinationProfiles.Mordor));
});

test('foreground dressing is repeatable, avoids underwater ground and paths, and releases owned materials',async()=>{
 const {DestinationWorld}=await import('../destination-world.js');
 const {addLandscapeDetail}=await import('../landscape-detail.js');
 const {THREE}=await import('../atlas-realism.js');
 const profile={name:'Detail verification',kind:'forest',biome:'woodland',seed:12345,architecture:'none',terrain:{waterLevel:0},palette:{rock:0x888888,foliage:0x788855}};
 const shared=new Map(),assets={material(type,color=0xffffff){const key=type+color;if(!shared.has(key))shared.set(key,new THREE.MeshStandardMaterial({color}));return shared.get(key)}};
 function build(){const w=new DestinationWorld(new THREE.Scene(),assets,profile,'high');w.terrain={height:(x,z)=>x<0?-2:1,waterLevel:0};w.groundOccupied=(x,z)=>z>40;addLandscapeDetail(w);return w;}
 const a=build(),b=build();assert.ok(a.resources[0].count>0);assert.deepEqual(a.resources[0].instanceMatrix.array,b.resources[0].instanceMatrix.array);
 const matrix=new THREE.Matrix4(),point=new THREE.Vector3();for(let i=0;i<a.resources[0].count;i++){a.resources[0].getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);assert.ok(point.x>=0&&point.z<=40&&point.y>.9);}
 let released=0,sharedReleased=0;for(const m of a.detailMaterials)m.addEventListener('dispose',()=>released++);for(const m of shared.values())m.addEventListener('dispose',()=>sharedReleased++);
 a.dispose();a.dispose();b.dispose();assert.equal(a.scene.children.length,0);assert.equal(released,1);assert.equal(sharedReleased,0);for(const m of shared.values())m.dispose();
});
