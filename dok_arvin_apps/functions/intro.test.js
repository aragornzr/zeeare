const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const policy=require('./access-policy'),intro=require('./intro-policy');
function setup(){
 const docs=new Map(),images=new Map();let sequence=0,failAudit=false;
 const users={root:{uid:policy.SUPER_ADMIN_UID,displayName:'Super Admin',customClaims:{role:'superadmin'}},admin:{uid:'admin',customClaims:{role:'admin',approved:true,departments:['tourism'],access:{apps:true,tourism:true}}},worker:{uid:'worker'},other:{uid:'other'},disabled:{uid:'disabled',disabled:true}};
 const snap=path=>({id:path.split('/').at(-1),exists:docs.has(path),data:()=>docs.get(path)});
 function collection(path){return {doc(id=`id-${++sequence}`){const full=path+'/'+id;return {id,path:full,get:async()=>snap(full),collection:name=>collection(full+'/'+name)};},orderBy(){let after,limit=Infinity;return {startAfter(doc){after=doc.id;return this;},limit(n){limit=n;return this;},async get(){let rows=[...docs.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')).map(snap).reverse();if(after)rows=rows.slice(rows.findIndex(d=>d.id===after)+1);return {docs:rows.slice(0,limit)};}};}};}
 const db={collection,async runTransaction(handler){const writes=[];await handler({get:async ref=>snap(ref.path),set(ref,data){if(failAudit&&ref.path.startsWith('account_history/'))throw Error('audit unavailable');writes.push([ref.path,data]);}});for(const [path,data]of writes)docs.set(path,data);}};
 const storage={getStorage:()=>({bucket:name=>({name,file:path=>({async save(bytes,options){images.set(path,{bytes,options});},async delete(){images.delete(path);}})})})};
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const mocks={'firebase-admin/app':{initializeApp(){}},'firebase-admin/auth':{getAuth:()=>({async getUser(uid){const value=Object.values(users).find(u=>u.uid===uid);if(!value)throw {code:'auth/user-not-found'};return value;}})},'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>({toDate:()=>new Date('2026-10-24T14:00:00Z')})}},'firebase-admin/storage':storage,'firebase-functions/v2/https':{onCall:(_,handler)=>handler,HttpsError},'firebase-functions/v1':{region:()=>({runWith:()=>({auth:{user:()=>({onCreate:f=>f})}})})},'./access-policy':policy,'./audit-policy':require('./audit-policy'),'./intro-policy':intro};
 const handlers={};vm.runInNewContext(fs.readFileSync(__dirname+'/index.js','utf8'),{exports:handlers,require:name=>mocks[name]||require(name)});
 return {docs,images,users,failAudit:()=>{failAudit=true;},call:(name,user,data={})=>handlers[name]({auth:user?{uid:users[user].uid,token:{role:'superadmin'}}:null,data})};
}
const page={page:'page1',title:'San Antonio',text:'Welcome everyone',version:0};
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(24)]).toString('base64');
test('only the protected current super admin may edit intro pages or publish notices',async()=>{
 const s=setup();for(const user of [null,'admin','worker','disabled']){
  await assert.rejects(()=>s.call('saveIntroPage',user,page),{code:user?'permission-denied':'unauthenticated'});
  await assert.rejects(()=>s.call('publishIntroNotice',user,{text:'Public'}),{code:user?'permission-denied':'unauthenticated'});
 }
 assert.equal(s.docs.size,0);assert.equal(s.images.size,0);
});
test('public intro pages expose only saved content; images use the existing bucket with audited version checks',async()=>{
 const s=setup();s.images.set('tourism/existing/photo.jpg',{});
 await s.call('saveIntroPage','root',{...page,imageBase64:png});
 const first=s.docs.get('intro_pages/page1');assert.equal(first.version,1);assert.match(first.imageUrl,/loginsept162026.firebasestorage.app/);assert.equal(s.images.size,2);
 const result=await s.call('getIntroPages',null);assert.equal(result.pages[0].title,'San Antonio');assert.equal(result.pages[0].updatedBy,undefined);
 await assert.rejects(()=>s.call('saveIntroPage','root',{...page,imageBase64:png}),{code:'aborted'});assert.equal(s.images.size,2);assert.equal(s.docs.get('intro_pages/page1').version,1);
 await s.call('saveIntroPage','root',{...page,version:1,removeImage:true});assert.equal(s.images.size,1);assert.ok(s.images.has('tourism/existing/photo.jpg'));
 const audits=[...s.docs].filter(([path])=>path.startsWith('account_history/')).map(([,data])=>data);assert.equal(audits.length,2);assert.equal(JSON.stringify(audits).includes('token='),false);
});
test('invalid pages, injected image URLs, malformed files and oversized images are rejected',async()=>{
 const s=setup();for(const input of [{...page,page:'page3'},{...page,imageUrl:'https://evil.invalid'},{...page,imageBase64:Buffer.from('<svg/>').toString('base64')},{...page,imageBase64:'a'.repeat(2200000)}])await assert.rejects(()=>s.call('saveIntroPage','root',input),{code:'invalid-argument'});
 assert.equal(s.docs.size,0);assert.equal(s.images.size,0);
});
test('a private instruction never appears in public or another user’s intro feed',async()=>{
 const s=setup();await s.call('publishIntroNotice','root',{text:'Everyone welcome'});await s.call('publishIntroNotice','root',{text:'Private command',kind:'instruction',recipientUid:'worker'});
 const everyone=await s.call('listIntroNotices',null,{audience:'all'});assert.deepEqual(Array.from(everyone.items,i=>i.text),['Everyone welcome']);
 await assert.rejects(()=>s.call('listIntroNotices',null,{audience:'mine'}),{code:'unauthenticated'});
 assert.equal((await s.call('listIntroNotices','other',{audience:'mine',recipientUid:'worker'})).items.length,0);
 assert.equal((await s.call('listIntroNotices','worker',{audience:'mine'})).items[0].text,'Private command');
 await assert.rejects(()=>s.call('listIntroNotices','admin',{audience:'sent'}),{code:'permission-denied'});
 assert.equal((await s.call('listIntroNotices','root',{audience:'sent'})).items.length,2);
 for(const [path,data]of s.docs)if(path.startsWith('account_history/'))assert.equal(JSON.stringify(data).includes('Private command'),false);
});
test('failed auditing rolls back content/notices and cleans up a newly uploaded picture',async()=>{
 const s=setup();s.failAudit();await assert.rejects(()=>s.call('saveIntroPage','root',{...page,imageBase64:png}),{code:'internal'});assert.equal(s.images.size,0);assert.equal(s.docs.size,0);
 await assert.rejects(()=>s.call('publishIntroNotice','root',{text:'Do not publish'}),{code:'internal'});assert.equal(s.docs.size,0);
});
