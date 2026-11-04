const test = require('node:test');
const assert = require('node:assert/strict');

test('all 110 named places and eight schematic routes have exactly one authored scene brief', async () => {
 const {places}=await import('../middle-earth-places.js');
 const {routes}=await import('../atlas-routes.js');
 const before=JSON.stringify({places,routes});
 const {allDestinations,destinationProfiles,getDestinationProfile}=await import('../destination-profiles.js');
 assert.equal(allDestinations.length,118);
 assert.equal(Object.keys(destinationProfiles).length,118);
 assert.equal(new Set(allDestinations.map(p=>p.name)).size,118);
 assert.equal(new Set(Object.values(destinationProfiles).map(p=>p.id)).size,118);
 assert.equal(new Set(Object.values(destinationProfiles).map(p=>p.seed)).size,118);
 for(const place of [...places,...routes]){
  const profile=getDestinationProfile(place);
  assert.ok(profile,place.name);
  assert.equal(profile.name,place.name);
  assert.equal(getDestinationProfile(place.name),profile);
  assert.ok(profile.features.length>=3&&profile.features.length<=5,place.name);
  assert.ok(new Set(profile.features).size===profile.features.length,place.name);
 }
 assert.equal(JSON.stringify({places,routes}),before,'building scene briefs must not alter the atlas sources');
 assert.equal(getDestinationProfile('No such atlas destination'),null);
});

test('unlocated and earlier-age scenes retain null coordinates and clearly disclose uncertainty', async () => {
 const {allDestinations,getDestinationProfile}=await import('../destination-profiles.js');
 const unlocated=allDestinations.filter(p=>p.x===null);
 assert.equal(unlocated.length,13);
 for(const place of unlocated){
  const profile=getDestinationProfile(place);
  assert.deepEqual(profile.mapPosition,{x:null,y:null},place.name);
  assert.match(profile.uncertainty,/no invented Third Age map coordinates/,place.name);
 }
 for(const place of allDestinations.filter(p=>p.path))assert.match(getDestinationProfile(place).uncertainty,/Schematic route interpretation/);
 for(const name of ['Rhûn','Dorwinion','Khand','Far Harad'])assert.match(getDestinationProfile(name).uncertainty,/uncertain geography/);
});

test('all rendering parameters are finite, valid and tailored rather than a shared fallback scene', async () => {
 const {destinationProfiles}=await import('../destination-profiles.js');
 const kinds=new Set(['village','city','fortress','ruins','forest','mountain','valley','river','lake','coast','desert','marsh','volcano','cave','road']);
 const biomes=new Set(['temperate','alpine','snow','arid','ash','wetland','woodland','coastal']);
 const architectures=new Set(['hobbit','elven','gondorian','rohan','dwarven','dark','vernacular','none','harad']);
 const sceneSignatures=new Set();
 for(const profile of Object.values(destinationProfiles)){
  assert.ok(kinds.has(profile.kind),profile.name);
  assert.ok(biomes.has(profile.biome),profile.name);
  assert.ok(architectures.has(profile.architecture),profile.name);
  for(const value of Object.values(profile.palette))assert.ok(Number.isInteger(value)&&value>=0&&value<=0xffffff,profile.name);
  for(const value of Object.values(profile.terrain))assert.ok(Number.isFinite(value)&&value>=0,profile.name);
  for(const value of Object.values(profile.sun))assert.ok(Number.isFinite(value),profile.name);
  assert.ok(profile.camera.distance>10&&profile.camera.distance<500,profile.name);
  assert.ok(profile.camera.pitch>0&&profile.camera.pitch<Math.PI/2,profile.name);
  assert.equal(profile.camera.target.length,3);
  assert.ok(profile.camera.target.every(Number.isFinite),profile.name);
  assert.ok(profile.landmark.length>2,profile.name);
  assert.ok(profile.detail.length>100,profile.name);
  sceneSignatures.add(JSON.stringify([profile.kind,profile.landmark,profile.features,profile.camera]));
 }
 assert.equal(sceneSignatures.size,118);
});

test('signature locations request distinctive landmark geometry and terrain', async () => {
 const {getDestinationProfile:get}=await import('../destination-profiles.js');
 assert.equal(get('Minas Tirith').landmark,'seven-walls');
 assert.equal(get('Isengard').landmark,'orthanc');
 assert.equal(get('Argonath').landmark,'argonath');
 assert.equal(get('Helm’s Deep').landmark,'hornburg');
 assert.equal(get('Lake-town').landmark,'lake-town');
 assert.equal(get('Caras Galadhon').landmark,'tree-city');
 assert.equal(get('Rivendell').landmark,'elven-waterfall');
 assert.equal(get('Moria').architecture,'dwarven');
 assert.equal(get('Sea of Rhûn').kind,'lake');
 assert.equal(get('Dead Marshes').kind,'marsh');
 assert.equal(get('Osgiliath').kind,'ruins');
 assert.equal(get('Henneth Annûn').landmark,'hidden-waterfall');
 assert.ok(get('Mount Doom').terrain.amplitude>get('The Shire').terrain.amplitude);
 assert.ok(get('Misty Mountains').terrain.ridge>get('The Wold').terrain.ridge);
});
