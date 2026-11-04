const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const policy = require('./access-policy');
const root = {uid:policy.SUPER_ADMIN_UID,customClaims:{role:'superadmin'}};
const tourism = {uid:'tourism-admin',customClaims:{role:'admin',approved:true,departments:['tourism'],access:{dashboard:true,tourism:true}}};
function setup(actor, fail = false) {
  const docs = new Map(); const writes = []; const reads = [];
  let id = 0;
  const ref = path => ({id:path.split('/').at(-1),path,
    collection: name => collection(path+'/'+name), get: async () => ({exists:docs.has(path),data:()=>docs.get(path)})});
  const collection = path => {
    const query = {doc: key => ref(path+'/'+(key || 'generated-'+ ++id)),
      where:(...args)=>{reads.push([path,...args]);return query;},
      orderBy:()=>query,limit:()=>query,startAfter:()=>query,
      get:async()=>({docs:[...docs].filter(([key])=>key.startsWith(path+'/')).map(([key,data])=>({id:key.split('/').at(-1),data:()=>data}))})};
    return query;
  };
  const db = {collection, runTransaction: async handler => {
    const pending = [];
    await handler({get: value => value.get(),set: (value,data) => pending.push([value.path,data])});
    if (fail) throw Error('offline');
    for (const [path,data] of pending) {docs.set(path,data);writes.push([path,data]);}
  }};
  class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
  const exports={};
  const mocks={'firebase-admin/app':{initializeApp(){}},'firebase-admin/auth':{getAuth:()=>({getUser:async()=>actor})},
    'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>null},Timestamp:{fromDate:date=>date}},
    'firebase-functions/v2/https':{onCall:(_,handler)=>handler,HttpsError},
    'firebase-functions/v1':{region:()=>({runWith:()=>({auth:{user:()=>({onCreate:h=>h})}})})},
    './access-policy':policy,'./audit-policy':require('./audit-policy')};
  vm.runInNewContext(fs.readFileSync(__dirname+'/index.js','utf8'),{require:name=>mocks[name],exports});
  return {handlers:exports,docs,writes,reads,request:data=>({auth:{uid:actor.uid,token:{role:'superadmin'}},data})};
}
test('only approved Tourism admins with section access or protected root may set the fee', async()=>{
  const denied = [{uid:'worker',customClaims:{role:'regular'}}, {...tourism,disabled:true},
    {...tourism,customClaims:{...tourism.customClaims,approved:false}},
    {...tourism,customClaims:{...tourism.customClaims,departments:['rhu']}},
    {...tourism,customClaims:{...tourism.customClaims,access:{dashboard:true}}}, {...root,uid:'imposter'}];
  for (const actor of denied) {
    const s=setup(actor);
    await assert.rejects(()=>s.handlers.setTourismFee(s.request({feePerPersonCentavos:5000})),{code:'permission-denied'});
    assert.equal(s.writes.length,0);
  }
  for (const actor of [tourism,root]) {
    const s=setup(actor);await s.handlers.setTourismFee(s.request({feePerPersonCentavos:5000}));
    assert.equal(s.docs.get('department_settings/tourism').feePerPersonCentavos,5000);
  }
});
test('rates and audit are atomic; older approved rates remain immutable after a new fee', async()=>{
  const s=setup(tourism);
  const first=await s.handlers.setTourismFee(s.request({feePerPersonCentavos:15050}));
  const second=await s.handlers.setTourismFee(s.request({feePerPersonCentavos:5000}));
  assert.notEqual(first.rate.rateId,second.rate.rateId);
  assert.equal(s.docs.get('tourism_fee_rates/'+first.rate.rateId).feePerPersonCentavos,15050);
  assert.equal(s.docs.get('department_settings/tourism').rateId,second.rate.rateId);
  const audits=s.writes.filter(([path])=>path.includes('/events/'));
  assert.equal(audits[1][1].changes[0].before,15050);
  assert.equal(audits[1][1].actorUid,tourism.uid);
  const failing=setup(tourism,true);
  await assert.rejects(()=>failing.handlers.setTourismFee(failing.request({feePerPersonCentavos:5000})),{code:'internal'});
  assert.equal(failing.writes.length,0);
});
test('amount validation rejects fractional centavos, negative, oversized and unknown fields',async()=>{
  const s=setup(tourism);
  for(const amount of [-1,0.5,Infinity,NaN,'50',100000001]) {
    await assert.rejects(()=>s.handlers.setTourismFee(s.request({feePerPersonCentavos:amount})),{code:'invalid-argument'});
  }
  await assert.rejects(()=>s.handlers.setTourismFee(s.request({feePerPersonCentavos:50,role:'superadmin'})),{code:'invalid-argument'});
  const result=await s.handlers.setTourismFee(s.request({feePerPersonCentavos:0}));assert.equal(result.rate.feePerPersonCentavos,0);
});
test('rate read distinguishes undeclared from explicit free admission and rejects signed-out users', async()=>{
  const s=setup(tourism);assert.equal((await s.handlers.getTourismFee(s.request({}))).rate,null);
  await s.handlers.setTourismFee(s.request({feePerPersonCentavos:0}));
  assert.equal((await s.handlers.getTourismFee(s.request({}))).rate.feePerPersonCentavos,0);
  await assert.rejects(()=>s.handlers.getTourismFee({data:{}}),{code:'unauthenticated'});
});

test('Tourism reports reject stale privileged tokens for disabled, regular and other-department users',async()=>{
 const range={from:'2026-10-23',to:'2026-10-23'};
 for(const actor of [{...tourism,disabled:true}, {...tourism,customClaims:{...tourism.customClaims,role:'regular'}},
 {...tourism,customClaims:{...tourism.customClaims,departments:['rhu']}},
 {...tourism,customClaims:{...tourism.customClaims,approved:false}}]) {
  const s=setup(actor);await assert.rejects(()=>s.handlers.listTourismRecords(s.request(range)),{code:'permission-denied'});assert.equal(s.reads.length,0);
 }
});
test('Tourism reports read all staff records in Manila date bounds and whitelist returned fields',async()=>{
 const s=setup(tourism);
 s.docs.set('tourism_records/one',{name:'Visitor',ownerId:'another-staff',feeTotalCentavos:1234,privateExtra:'hidden',createdAt:{toDate:()=>new Date('2026-10-23T00:00:00Z')}});
 const result=await s.handlers.listTourismRecords(s.request({from:'2026-10-23',to:'2026-10-23'}));
 assert.equal(s.reads[0][1],'createdAt');assert.equal(s.reads[0][3].toISOString(),'2026-10-22T16:00:00.000Z');
 assert.equal(s.reads[1][2],'<');assert.equal(s.reads[1][3].toISOString(),'2026-10-23T16:00:00.000Z');
 assert.equal(result.records[0].ownerId,'another-staff');assert.equal(result.records[0].privateExtra,undefined);
 assert.equal(result.records[0].createdAt,'2026-10-23T00:00:00.000Z');assert.equal(result.cursor,null);
});
test('Tourism report dates and cursors are validated and large result sets return a continuation',async()=>{
 const s=setup(root),range={from:'2026-10-23',to:'2026-10-23'};
 for(const data of [{from:'2026-02-30',to:'2026-03-01'},{from:'2026-01-02',to:'2026-01-01'},
 {from:'2024-01-01',to:'2026-01-01'},{...range,cursor:'../private'},{}]) {
  await assert.rejects(()=>s.handlers.listTourismRecords(s.request(data)),{code:'invalid-argument'});
 }
 assert.equal(s.reads.length,0);
 for(let i=0;i<101;i++)s.docs.set('tourism_records/r'+i,{name:'Visitor '+i});
 const result=await s.handlers.listTourismRecords(s.request(range));assert.equal(result.records.length,100);assert.equal(result.cursor,'r99');
 await assert.rejects(()=>s.handlers.listTourismRecords(s.request({...range,cursor:'missing'})),{code:'failed-precondition'});
});
