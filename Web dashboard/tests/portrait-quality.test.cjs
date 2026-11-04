const test=require('node:test'),assert=require('node:assert/strict');

test('portrait treatment covers exactly 117 destinations and excludes Moria without mutating profiles',async()=>{
 const {destinationProfiles}=await import('../destination-profiles.js'),{portraitQuality}=await import('../portrait-quality.js');
 const before=JSON.stringify(destinationProfiles),enabled=[];
 for(const profile of Object.values(destinationProfiles)){
  const look=portraitQuality(profile);if(!look)continue;enabled.push(profile.name);
  for(const [key,value]of Object.entries(look))assert.ok(typeof value==='boolean'||Number.isFinite(value),profile.name+' '+key);
  assert.ok(look.fov>=35&&look.fov<=42);assert.ok(look.aerialDensity>=0&&look.environment>0);
 }
 assert.equal(enabled.length,117);assert.equal(portraitQuality(destinationProfiles.Moria),null);assert.equal(portraitQuality({kind:'cave',biome:'ash'}),null);
 assert.equal(JSON.stringify(destinationProfiles),before);
 assert.notDeepEqual(portraitQuality(destinationProfiles.Mordor),portraitQuality(destinationProfiles['Bag End']));
});

test('all six portrait chapters remain finite and above terrain across every eligible destination',async()=>{
 const {destinationProfiles}=await import('../destination-profiles.js'),{portraitTour}=await import('../portrait-quality.js'),{TerrainModel}=await import('../atlas-terrain.js');
 for(const p of Object.values(destinationProfiles)){
  const terrain=new TerrainModel(p),world={profile:p,terrain,landmarks:[{position:[0,terrain.height(0,0)+3,-8]}]};
  for(const time of [-40,0,6.665,6.667,13.334,20,26.667,33.334,39.999,40,80]){
   const shot=portraitTour(world,time);if(p.name==='Moria'){assert.equal(shot,null);continue;}
   assert.ok([...shot.eye,...shot.target].every(Number.isFinite),p.name+' '+time);
   assert.ok(shot.eye[1]>=terrain.height(shot.eye[0],shot.eye[2])+1.5,p.name+' terrain clearance');
   assert.ok(shot.chapter.length>0);
  }
 }
});

test('legacy Moria rendering keeps portrait assets and aerial perspective disabled',async()=>{
 const {RealismAssets}=await import('../atlas-realism.js'),{AtlasFinish}=await import('../atlas-finish.js'),{cinematicLighting}=await import('../graphics-quality.js');
 const renderer={extensions:{has:()=>false},capabilities:{maxSamples:4}},assets=new RealismAssets(renderer),finish=new AtlasFinish(renderer);
 assert.equal(assets.portrait,false);
 finish.configure('high',cinematicLighting({kind:'cave',biome:'ash'}));
 assert.equal(finish.material.uniforms.uAerialDensity.value,0);
 assert.equal(finish.material.uniforms.uAO.value,.36);
 finish.dispose();
});
