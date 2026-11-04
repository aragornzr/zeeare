const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const policy = require('./access-policy');
function setup(users, failClaims = false) {
  const changes = [];
  const records = [];
  let auditFailure = false;
  const ref = {async set(value) {if (auditFailure) throw Error('audit unavailable'); records.push(value);}, async update(value) {Object.assign(records.at(-1), value);}};
  const query = {startAfter(){return this;},limit(){return this;},async get(){return {docs:records.map((data,index)=>({id:String(index),data:()=>data}))};}};
  const db = {collection: () => ({doc: () => ({collection: () => ({doc: () => ref,orderBy:()=>query})})}),
    async runTransaction(handler) {return handler({get: async () => ({exists: records.length > 0}), set: (ref, value) => records.push(value)});}};
  const auth = {
    async getUser(uid) { if (!users[uid]) throw {code:'auth/user-not-found'}; return users[uid]; },
    async listUsers() { return {users:Object.values(users)}; },
    async createUser(data) { changes.push(['create',data.disabled]); users.new = {uid:'new',...data}; return users.new; },
    async updateUser(uid,data) { changes.push(['update',uid]); Object.assign(users[uid],data); return users[uid]; },
    async setCustomUserClaims(uid,data) { if (failClaims) throw Error('fail'); changes.push(['claims',uid]); users[uid].customClaims=data; },
    async deleteUser(uid) { changes.push(['delete',uid]); delete users[uid]; },
    async revokeRefreshTokens(uid) { changes.push(['revoke',uid]); }
  };
  class HttpsError extends Error { constructor(code,message) {super(message);this.code=code;} }
  const exports = {};
  const requireMock = name => ({'firebase-admin/app':{initializeApp(){}},'firebase-admin/auth':{getAuth:()=>auth},'firebase-functions/v2/https':{onCall:(options,handler)=>handler,HttpsError},'./access-policy':policy, './audit-policy':require('./audit-policy'), 'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{serverTimestamp:()=> 'server-time'},Timestamp:{fromMillis: ms => ms}}, 'firebase-functions/v1':{region:()=>({runWith:()=>({auth:{user:()=>({onCreate:handler=>handler})}})})}})[name];
  vm.runInNewContext(fs.readFileSync(__dirname+'/index.js','utf8'),{require:requireMock,exports});
  return {handlers:exports,changes,users,records, failAudit: () => {auditFailure = true;}};
}
const admin = ()=>({uid:policy.SUPER_ADMIN_UID,customClaims:{role:'superadmin'}});
const access = Object.fromEntries(policy.SECTIONS.map(k=>[k,['apps','tourism'].includes(k)]));
const data = ()=>({username:'New user',email:'new@example.com',password:'test-password',role:'regular',disabled:false,approved:true,departments:['tourism'],access});
test('request token cannot spoof a freshly demoted manager',async()=>{
  const s=setup({admin:{uid:'admin',customClaims:{role:'regular'}}});
  await assert.rejects(()=>s.handlers.createDashboardUser({auth:{uid:'admin',token:{role:'admin'}},data:data()}),{code:'permission-denied'});
  assert.equal(s.changes.length,0);
});
test('new accounts stay disabled until permissions are assigned',async()=>{
  const s=setup({[policy.SUPER_ADMIN_UID]:admin()});const result=await s.handlers.createDashboardUser({auth:{uid:policy.SUPER_ADMIN_UID},data:data()});
  assert.equal(s.changes[0][1],true);assert.equal(s.changes[1][0],'claims');assert.equal(result.user.disabled,false);assert.equal(result.user.password,undefined);
});
test('failed claim assignment cleans up the account created by this request',async()=>{
  const s=setup({[policy.SUPER_ADMIN_UID]:admin()},true);
  await assert.rejects(()=>s.handlers.createDashboardUser({auth:{uid:policy.SUPER_ADMIN_UID},data:data()}),{code:'internal'});
  assert.equal(s.users.new,undefined);assert.equal(s.changes.at(-1)[0],'delete');
});
test('updating preserves unrelated claims, retains blank password and revokes refresh tokens',async()=>{
  const s=setup({[policy.SUPER_ADMIN_UID]:admin(),target:{uid:'target',password:'unchanged',customClaims:{role:'regular',customFeature:true}}});
  await s.handlers.updateDashboardUser({auth:{uid:policy.SUPER_ADMIN_UID},data:{...data(),uid:'target',password:''}});
  assert.equal(s.users.target.password,'unchanged');assert.equal(s.users.target.customClaims.customFeature,true);assert.equal(s.changes.at(-1)[0],'revoke');
});
test('unauthenticated listing never returns users',async()=>{
  const s=setup({[policy.SUPER_ADMIN_UID]:admin()});await assert.rejects(()=>s.handlers.listDashboardUsers({data:{}}),{code:'unauthenticated'});
});

test('department listings omit unassigned users, other departments and privileged accounts',async()=>{
  const manager={uid:'manager',customClaims:{role:'admin',approved:true,departments:['tourism'],access:{dashboard:true,apps:true,tourism:true}}};
  const s=setup({manager,root:admin(),pending:{uid:'pending',customClaims:{departments:['tourism']}},foreign:{uid:'foreign',customClaims:{departments:['rhu']}},new:{uid:'new'}});
  const result=await s.handlers.listDashboardUsers({auth:{uid:'manager'},data:{}});
  assert.deepEqual(Array.from(result.users,u=>u.uid),['pending']);
});
test('cross-department direct UID updates and protected-account demotion are rejected before writes',async()=>{
  const manager={uid:'manager',customClaims:{role:'admin',approved:true,departments:['tourism'],access:{dashboard:true,apps:true,tourism:true}}};
  const s=setup({manager,[policy.SUPER_ADMIN_UID]:admin(),foreign:{uid:'foreign',customClaims:{departments:['rhu']}}});
  await assert.rejects(()=>s.handlers.updateDashboardUser({auth:{uid:'manager'},data:{...data(),uid:'foreign'}}),{code:'permission-denied'});
  await assert.rejects(()=>s.handlers.updateDashboardUser({auth:{uid:policy.SUPER_ADMIN_UID},data:{...data(),uid:policy.SUPER_ADMIN_UID}}),{code:'permission-denied'});
  assert.equal(s.changes.length,0);
});

test('unapproved managers, regular users and other departments cannot read account history', async () => {
  for (const actor of [{uid:'worker'}, {uid:'pretender',customClaims:{role:'superadmin'}},
    {uid:'manager',customClaims:{role:'admin',approved:true,departments:['tourism'],access:{dashboard:true}}},
    {...admin(),disabled:true}]) {
    const s = setup({[actor.uid]:actor,target:{uid:'target',customClaims:{role:'regular',departments:['rhu']}}});
    await assert.rejects(() => s.handlers.listAccountHistory({auth:{uid:actor.uid},data:{uid:'target'}}), {code:'permission-denied'});
  }
});
test('password edits record a marker, safe before/after fields and the actor, never secrets', async () => {
  const s = setup({[policy.SUPER_ADMIN_UID]:admin(),target:{uid:'target',email:'old@example.com',passwordHash:'PRIVATE-HASH',customClaims:{role:'regular',privateClaim:'PRIVATE-CLAIM'}}});
  await s.handlers.updateDashboardUser({auth:{uid:policy.SUPER_ADMIN_UID},data:{...data(),uid:'target'}});
  const record = s.records[0];
  assert.equal(record.status,'completed');
  assert.equal(record.actorUid,policy.SUPER_ADMIN_UID);
  assert.ok(record.changes.some(c => c.field === 'password'));
  assert.ok(record.changes.some(c => c.field === 'email' && c.before === 'old@example.com'));
  for (const secret of ['test-password','PRIVATE-HASH','PRIVATE-CLAIM']) assert.equal(JSON.stringify(record).includes(secret),false);
});
test('a missing audit store prevents account updates before Auth writes', async () => {
  const s = setup({[policy.SUPER_ADMIN_UID]:admin(),target:{uid:'target'}}); s.failAudit();
  await assert.rejects(() => s.handlers.updateDashboardUser({auth:{uid:policy.SUPER_ADMIN_UID},data:{...data(),uid:'target'}}), {code:'internal'});
  assert.equal(s.changes.length,0);
});
test('partial updates keep their observed changes in history', async () => {
  const s = setup({[policy.SUPER_ADMIN_UID]:admin(),target:{uid:'target',email:'old@example.com',customClaims:{role:'regular'}}},true);
  await assert.rejects(() => s.handlers.updateDashboardUser({auth:{uid:policy.SUPER_ADMIN_UID},data:{...data(),uid:'target'}}), {code:'internal'});
  assert.equal(s.records[0].status,'partial_or_failed');
  assert.equal(s.records[0].changes.some(c=>c.field==='password'),false);
});

test('Firebase token time sets login date; retries do not create duplicate events', async () => {
  const s = setup({worker:{uid:'worker',email:'worker@example.com'}});
  const request = {auth:{uid:'worker',token:{auth_time:1700000000}},data:{source:'mobile',occurredAt:'fake date'}};
  await s.handlers.recordAccountLogin(request); await s.handlers.recordAccountLogin(request);
  assert.equal(s.records.length,1);
  assert.equal(s.records[0].occurredAt,1700000000000);
  assert.equal(s.records[0].actorUid,'worker');
  assert.equal(s.records[0].type,'login');
});
test('login recording rejects unauthenticated, disabled and invalid session times', async () => {
  const s = setup({worker:{uid:'worker'},disabled:{uid:'disabled',disabled:true}});
  await assert.rejects(()=>s.handlers.recordAccountLogin({data:{source:'mobile'}}),{code:'unauthenticated'});
  await assert.rejects(()=>s.handlers.recordAccountLogin({auth:{uid:'disabled',token:{auth_time:1700000000}},data:{source:'mobile'}}),{code:'permission-denied'});
  await assert.rejects(()=>s.handlers.recordAccountLogin({auth:{uid:'worker',token:{}},data:{source:'mobile'}}),{code:'unauthenticated'});
  await assert.rejects(()=>s.handlers.recordAccountLogin({auth:{uid:'worker',token:{auth_time:1700000000}},data:{source:'spoofed'}}),{code:'invalid-argument'});
  assert.equal(s.records.length,0);
});

const tourismAdmin = {uid:'manager',customClaims:{role:'admin',approved:true,departments:['tourism'],access:{dashboard:true}}};
test('department history includes scoped worker events, hides legacy and foreign events', async()=>{
 const s=setup({manager:tourismAdmin,worker:{uid:'worker',customClaims:{role:'regular',departments:['tourism']}}});
 s.records.push({type:'login',departments:['tourism']},{type:'login'},{type:'account_updated',before:{departments:['rhu']},after:{departments:['tourism']}});
 const result=await s.handlers.listAccountHistory({auth:{uid:'manager'},data:{uid:'worker'}});
 assert.equal(result.events.length,1);assert.equal(result.events[0].type,'login');
});
test('department admin can read own scoped changes but cannot read another admin',async()=>{
 const s=setup({manager:tourismAdmin,other:{...tourismAdmin,uid:'other'}});
 s.records.push({type:'tourism_fee_changed',departments:['tourism']});
 assert.equal((await s.handlers.listAccountHistory({auth:{uid:'manager'},data:{uid:'manager'}})).events.length,1);
 await assert.rejects(()=>s.handlers.listAccountHistory({auth:{uid:'manager'},data:{uid:'other'}}),{code:'permission-denied'});
});
test('device fields are bounded, stored with session time and never accept arbitrary identifiers',async()=>{
 const s=setup({worker:{uid:'worker',customClaims:{departments:['tourism']}}});
 const request={auth:{uid:'worker',token:{auth_time:1700000000}},data:{source:'mobile',device:{platform:'android',manufacturer:'Samsung',model:'SM-A546E',osVersion:'14'}}};
 await s.handlers.recordAccountLogin(request);
 assert.equal(s.records[0].device.model,'SM-A546E');assert.deepEqual(Array.from(s.records[0].departments),['tourism']);
 await assert.rejects(()=>s.handlers.recordAccountLogin({...request,data:{...request.data,device:{platform:'android',serial:'secret'}}}),{code:'invalid-argument'});
});
