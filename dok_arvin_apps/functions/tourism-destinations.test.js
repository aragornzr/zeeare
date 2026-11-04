const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const policy=require('./access-policy');
function setup(){
  const store=new Map();let count=0, failAudit=false;
  const member=(uid,role='regular',department='tourism')=>({uid,displayName:uid,email:uid+'@example.com',customClaims:{role,approved:true,departments:[department],access:{apps:true,tourism:true,dashboard:true}}});
  const users={admin:member('admin','admin'),worker:member('worker'),other:member('other','admin','rhu'),pending:member('pending'),root:{uid:policy.SUPER_ADMIN_UID,customClaims:{role:'superadmin'}}};users.pending.customClaims.approved=false;
  const ref=path=>({path,id:path.split('/').at(-1),get:async()=>({exists:store.has(path),data:()=>store.get(path)}),collection:name=>collection(path+'/'+name)});
  const collection=path=>({doc:(id='generated-'+ ++count)=>ref(path+'/'+id)});
  const db={collection,runTransaction:async handler=>{const pending=[];await handler({get:r=>r.get(),set:(r,v)=>{if(failAudit&&r.path.includes('/events/'))throw Error('audit unavailable');pending.push([r.path,v]);}});for(const [k,v]of pending)store.set(k,v);}};
  class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
  const handlers={},mocks={
    'firebase-admin/app':{initializeApp(){}},'firebase-admin/auth':{getAuth:()=>({getUser:async uid=>{const user=Object.values(users).find(u=>u.uid===uid);if(!user)throw {code:'auth/user-not-found'};return user;},listUsers:async()=>({users:Object.values(users)})})},
    'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>null}},
    'firebase-functions/v2/https':{onCall:(_,handler)=>handler,HttpsError},
    'firebase-functions/v1':{region:()=>({runWith:()=>({auth:{user:()=>({onCreate:h=>h})}})})},
    './access-policy':policy,'./audit-policy':require('./audit-policy')};
  vm.runInNewContext(fs.readFileSync(__dirname+'/index.js','utf8'),{exports:handlers,require:name=>mocks[name]});
  return {store,users,call:(name,user,data={})=>handlers[name]({auth:user?{uid:users[user].uid}:null,data}),failAudit:()=>{failAudit=true;}};
}
test('Tourism admins and protected root manage destinations; other departments and pending accounts cannot',async()=>{
  const s=setup();
  for(const user of [null,'other','pending']) await assert.rejects(()=>s.call('getTourismDestinations',user),{code:user?'permission-denied':'unauthenticated'});
  await assert.rejects(()=>s.call('saveTourismDestination','worker',{name:'Bay Resort',active:true,version:0}),{code:'permission-denied'});
  for(const [user,version,name]of [['admin',0,'Bay Resort'],['root',1,'Town Plaza']]) await s.call('saveTourismDestination',user,{name,active:true,version});
  const result=await s.call('getTourismDestinations','worker');assert.equal(result.destinations.length,2);assert.equal(result.canEdit,false);assert.equal(result.canDelegate,false);
});
test('delegation allows editing, never redelegation; revocation and current account access are enforced',async()=>{
  const s=setup();
  await s.call('setTourismDestinationEditor','admin',{uid:'worker',enabled:true});
  assert.equal((await s.call('getTourismDestinations','worker')).canEdit,true);
  await s.call('saveTourismDestination','worker',{name:'Personnel resort',active:true,version:0});
  await assert.rejects(()=>s.call('setTourismDestinationEditor','worker',{uid:'worker',enabled:true}),{code:'permission-denied'});
  await assert.rejects(()=>s.call('listTourismDestinationPersonnel','worker'),{code:'permission-denied'});
  s.users.worker.customClaims.departments=['rhu'];
  await assert.rejects(()=>s.call('getTourismDestinations','worker'),{code:'permission-denied'});
  s.users.worker.customClaims.departments=['tourism'];s.users.worker.disabled=true;
  await assert.rejects(()=>s.call('saveTourismDestination','worker',{name:'Blocked',active:true,version:1}),{code:'permission-denied'});
  s.users.worker.disabled=false;
  await s.call('setTourismDestinationEditor','admin',{uid:'worker',enabled:false});
  await assert.rejects(()=>s.call('saveTourismDestination','worker',{name:'Blocked',active:true,version:1}),{code:'permission-denied'});
  assert.equal((await s.call('getTourismDestinations','worker')).canEdit,false);
});
test('duplicate names and concurrent stale changes are rejected; inactive destinations and legacy record text are preserved',async()=>{
  const s=setup();s.store.set('tourism_records/legacy',{destination:'Old resort name'});
  await s.call('saveTourismDestination','admin',{name:'  Bay   Resort ',active:true,version:0});
  const d=(await s.call('getTourismDestinations','admin')).destinations[0];assert.equal(d.name,'Bay Resort');
  await assert.rejects(()=>s.call('saveTourismDestination','admin',{name:'bay resort',active:true,version:1}),{code:'already-exists'});
  await assert.rejects(()=>s.call('saveTourismDestination','admin',{name:'Different',active:true,version:0}),{code:'failed-precondition'});
  await s.call('saveTourismDestination','admin',{id:d.id,name:'Renamed resort',active:false,version:1});
  assert.equal((await s.call('getTourismDestinations','worker')).destinations.length,0);
  assert.equal((await s.call('getTourismDestinations','admin')).destinations[0].active,false);
  assert.equal(s.store.get('tourism_records/legacy').destination,'Old resort name');
});
test('delegation target validation, removal from ineligible personnel, and audit atomicity',async()=>{
  const s=setup();
  for(const uid of ['other','pending','admin',policy.SUPER_ADMIN_UID]) await assert.rejects(()=>s.call('setTourismDestinationEditor','admin',{uid,enabled:true}),{code:'permission-denied'});
  await s.call('setTourismDestinationEditor','admin',{uid:'worker',enabled:true});
  s.users.worker.customClaims.approved=false;
  const list=await s.call('listTourismDestinationPersonnel','admin');
  const worker=list.users.find(u=>u.uid==='worker');assert.equal(worker.delegated,true);assert.equal(worker.eligible,false);
  await s.call('setTourismDestinationEditor','admin',{uid:'worker',enabled:false});
  assert.equal(s.store.get('tourism_catalog/editors').uids.length,0);
  const failing=setup();failing.failAudit();
  await assert.rejects(()=>failing.call('saveTourismDestination','admin',{name:'No partial writes',active:true,version:0}),{code:'internal'});
  await assert.rejects(()=>failing.call('setTourismDestinationEditor','admin',{uid:'worker',enabled:true}),{code:'internal'});
  assert.equal(failing.store.size,0);
});
test('invalid names, fields, ids, and versions cannot mutate the catalog',async()=>{
  const s=setup();
  for(const data of [{name:''},{name:'x'.repeat(161)},{name:'bad\nname'},{id:'a/b'},{version:0.5},{canEdit:true},{active:'true'}]) {
    await assert.rejects(()=>s.call('saveTourismDestination','admin',{name:'Resort',active:true,version:0,...data}),{code:'invalid-argument'});
  }
  assert.equal(s.store.size,0);
});
