const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const policy=require('./access-policy');
function setup(){
 const store=new Map();let count=0,failAudit=false;
 const users={
  root:{uid:policy.SUPER_ADMIN_UID,customClaims:{role:'superadmin'}},
  admin:{uid:'admin',displayName:'Tourism Admin',customClaims:{role:'admin',approved:true,departments:['tourism'],access:{apps:true,tourism:true}}},
  worker:{uid:'worker',customClaims:{role:'regular',approved:true,departments:['tourism'],access:{apps:true,tourism:true}}},
  other:{uid:'other',customClaims:{role:'regular',approved:true,departments:['rhu'],access:{apps:true,rhu:true}}},
  peer:{uid:'peer',customClaims:{role:'admin',approved:true,departments:['tourism'],access:{apps:true,tourism:true}}},
  pending:{uid:'pending',customClaims:{role:'admin',approved:false,departments:['tourism'],access:{apps:true,tourism:true}}},
 };
 const snapshot=(path)=>({id:path.split('/').at(-1),exists:store.has(path),data:()=>store.get(path)});
 function collection(path){return {path,doc(id=`id-${++count}`){const p=path+'/'+id;return {id,path:p,collection:name=>collection(p+'/'+name),get:async()=>snapshot(p)};},orderBy(){let after=null,limit=Infinity;return {startAfter(doc){after=doc.id;return this;},limit(value){limit=value;return this;},async get(){let docs=[...store.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')).map(snapshot).reverse();if(after)docs=docs.slice(docs.findIndex(d=>d.id===after)+1);return {docs:docs.slice(0,limit)};}};}};}
 const db={collection,async runTransaction(handler){const writes=[];await handler({set(ref,value){if(failAudit&&ref.path.startsWith('account_history/'))throw Error('audit unavailable');writes.push([ref.path,value]);}});for(const [path,value] of writes)store.set(path,value);}};
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const handlers={};const mocks={
  'firebase-admin/app':{initializeApp(){}},'firebase-admin/auth':{getAuth:()=>({getUser:async uid=>{const u=Object.values(users).find(u=>u.uid===uid);if(!u)throw {code:'auth/user-not-found'};return u;}})},
  'firebase-functions/v2/https':{onCall:(_,fn)=>fn,HttpsError},'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>({toDate:()=>new Date('2026-10-24T13:00:00Z')})}},
  'firebase-functions/v1':{region:()=>({runWith:()=>({auth:{user:()=>({onCreate:fn=>fn})}})})},'./access-policy':policy,'./audit-policy':require('./audit-policy'),
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/index.js','utf8'),{exports:handlers,require:name=>mocks[name]});
 const call=(name,user,data)=>handlers[name]({auth:user?{uid:users[user].uid}:null,data});
 return {store,users,call,failAudit:()=>{failAudit=true;}};
}
test('only current approved admins can publish in assigned departments',async()=>{
 const s=setup();
 for(const user of [null,'worker','other','pending'])await assert.rejects(()=>s.call('publishDepartmentUpdate',user,{department:'tourism',text:'Update'}),{code:user?'permission-denied':'unauthenticated'});
 await assert.rejects(()=>s.call('publishDepartmentUpdate','admin',{department:'rhu',text:'Update'}),{code:'permission-denied'});
 assert.equal(s.store.size,0);
 await s.call('publishDepartmentUpdate','admin',{department:'tourism',text:'Department update'});
 assert.equal(s.store.size,2);
 await s.call('publishDepartmentUpdate','root',{department:'rhu',text:'RHU update'});
 assert.equal(s.store.size,4);
});
test('worker reads only department announcements and their own inbox; sends are audited atomically',async()=>{
 const s=setup();
 await s.call('publishDepartmentUpdate','admin',{department:'tourism',text:'For everyone'});
 await s.call('publishDepartmentUpdate','admin',{department:'tourism',text:'Private',recipientUid:'worker'});
 const announcements=await s.call('listDepartmentUpdates','worker',{department:'tourism'});
 assert.deepEqual(Array.from(announcements.items,v=>v.text),['For everyone']);
 const inbox=await s.call('listDepartmentUpdates','worker',{department:'tourism',kind:'inboxes',recipientUid:'admin'});
 assert.deepEqual(Array.from(inbox.items,v=>v.text),['Private']);
 assert.equal((await s.call('listDepartmentUpdates','admin',{department:'tourism',kind:'inboxes',recipientUid:'worker'})).items.length,0);
 assert.equal((await s.call('listDepartmentUpdates','admin',{department:'tourism',kind:'sent'})).items.length,1);
 await assert.rejects(()=>s.call('listDepartmentUpdates','other',{department:'tourism'}),{code:'permission-denied'});
 await assert.rejects(()=>s.call('listDepartmentUpdates','worker',{department:'tourism',kind:'sent'}),{code:'permission-denied'});
 for(const [path,event]of s.store)if(path.startsWith('account_history/')){assert.deepEqual(Array.from(event.departments),['tourism']);assert.equal(JSON.stringify(event).includes('Private'),false);}
});
test('cross-department recipients, other admins, malformed and empty messages are rejected',async()=>{
 const s=setup();
 for(const recipientUid of ['other','peer'])await assert.rejects(()=>s.call('publishDepartmentUpdate','admin',{department:'tourism',text:'Hi',recipientUid}),{code:'permission-denied'});
 for(const text of ['', ' '.repeat(5),'x'.repeat(3001)])await assert.rejects(()=>s.call('publishDepartmentUpdate','admin',{department:'tourism',text}),{code:'invalid-argument'});
 assert.equal(s.store.size,0);
});
test('audit failure leaves neither announcement nor private message published',async()=>{
 const s=setup();s.failAudit();
 await assert.rejects(()=>s.call('publishDepartmentUpdate','admin',{department:'tourism',text:'Do not publish'}),{code:'internal'});
 await assert.rejects(()=>s.call('publishDepartmentUpdate','admin',{department:'tourism',text:'Do not send',recipientUid:'worker'}),{code:'internal'});
 assert.equal(s.store.size,0);
});
test('pagination returns older announcements and access revocation takes effect immediately',async()=>{
 const s=setup();for(let i=0;i<31;i++)await s.call('publishDepartmentUpdate','admin',{department:'tourism',text:`Announcement ${i}`});
 const first=await s.call('listDepartmentUpdates','worker',{department:'tourism'});assert.equal(first.items.length,30);assert.ok(first.cursor);
 const second=await s.call('listDepartmentUpdates','worker',{department:'tourism',cursor:first.cursor});assert.equal(second.items.length,1);
 s.users.worker.customClaims.approved=false;
 await assert.rejects(()=>s.call('listDepartmentUpdates','worker',{department:'tourism'}),{code:'permission-denied'});
});
