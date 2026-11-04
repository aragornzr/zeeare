const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('./access-policy'),{loginDevice}=require('./audit-policy');
const timestamp=date=>({toDate:()=>new Date(date)});
const user=(uid,department='tourism',role='regular')=>({uid,displayName:uid,customClaims:{role,approved:true,departments:[department],access:{apps:true,dashboard:role==='admin',tourism:department==='tourism',attendance:true}}});
function setup(){
 const docs=new Map(),users=new Map(['worker','another','admin','outsider','rhuadmin','root'].map(uid=>[uid,user(uid,uid==='outsider'||uid==='rhuadmin'?'rhu':'tourism',uid.includes('admin')||uid==='admin'?'admin':'regular')]));
 users.set('root',{uid:policy.SUPER_ADMIN_UID,customClaims:{role:'superadmin'}});users.set(policy.SUPER_ADMIN_UID,users.get('root'));
 let serial=0,failCommit=false;
 const snapshot=path=>({id:path.split('/').at(-1),exists:docs.has(path),data:()=>docs.get(path)});
 function ref(path){return {path,id:path.split('/').at(-1),collection:name=>collection(path+'/'+name),get:async()=>snapshot(path)};}
 function collection(path){const parts=path.split('/').length;let start=null,take=Infinity,order='';const q={doc:key=>ref(path+'/'+(key||`generated_${++serial}`)),orderBy:field=>{order=field;return q;},startAfter:doc=>{start=doc.id;return q;},limit:n=>{take=n;return q;},get:async()=>{let rows=[...docs.keys()].filter(key=>key.startsWith(path+'/')&&key.split('/').length===parts+1).map(snapshot);if(order)rows.sort((a,b)=>(b.data()[order]?.toDate().getTime()||0)-(a.data()[order]?.toDate().getTime()||0));if(start)rows=rows.slice(rows.findIndex(r=>r.id===start)+1);return {docs:rows.slice(0,take)};}};return q;}
 const db={collection,runTransaction:async fn=>{const pending=[];await fn({get:ref=>ref.get(),set:(ref,value)=>pending.push([ref.path,value])});if(failCommit)throw Error('offline');for(const [path,value]of pending)docs.set(path,value);}};
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const handlers=require('./attendance')({auth:{getUser:async uid=>{if(!users.has(uid))throw Error('No user');return users.get(uid);}},db,policy,HttpsError,FieldValue:{serverTimestamp:()=>timestamp(new Date())},Timestamp:{fromDate:timestamp},loginDevice});
 const request=(uid,data)=>({auth:{uid},data});
 const input=(overrides={})=>({id:'record1',ownerUid:'worker',employeeId:'E1',time:new Date(Date.now()-120000).toISOString(),action:'in',method:'device_biometric',device:{platform:'android',manufacturer:'Phone',model:'Model',osVersion:'16'},...overrides});
 return {handlers,request,input,docs,users,failCommit:()=>failCommit=true};
}
test('self biometrics records once, shares to department, reports device, rejects impersonation and bad sequence',async()=>{
 const s=setup(),data=s.input();await s.handlers.recordAttendance(s.request('worker',data));await s.handlers.recordAttendance(s.request('worker',data));
 assert.equal(s.docs.get('attendance_departments/tourism/records/record1').device.osVersion,'16');
 assert.equal(s.docs.get('attendance_users/worker/records/record1').ownerUid,'worker');
 await assert.rejects(()=>s.handlers.recordAttendance(s.request('worker',s.input({id:'spoof',ownerUid:'another'}))),{code:'permission-denied'});
 await assert.rejects(()=>s.handlers.recordAttendance(s.request('worker',s.input({id:'again'}))),{code:'failed-precondition'});
 await s.handlers.recordAttendance(s.request('worker',s.input({id:'out',action:'out',time:new Date().toISOString()})));
});
test('new approved employees work without individual grants; missing approval or Attendance blocks writes',async()=>{
 for(const uid of ['existing','new']){const s=setup();s.users.set(uid,user(uid));await s.handlers.recordAttendance(s.request(uid,s.input({ownerUid:uid})));}
 for(const change of [{disabled:true},{customClaims:{approved:false}},{customClaims:{...user('worker').customClaims,access:{apps:true,attendance:false}}}]){const s=setup();Object.assign(s.users.get('worker'),change);await assert.rejects(()=>s.handlers.recordAttendance(s.request('worker',s.input())),{code:'permission-denied'});assert.equal(s.docs.size,0);}
});
test('shared face recording is limited to approved employees in administrator departments',async()=>{
 const s=setup();await s.handlers.recordAttendance(s.request('admin',s.input({method:'local_face'})));
 await assert.rejects(()=>s.handlers.recordAttendance(s.request('rhuadmin',s.input({id:'foreign',method:'local_face'}))),{code:'permission-denied'});
 await assert.rejects(()=>s.handlers.recordAttendance(s.request('admin',s.input({id:'finger',method:'device_biometric',ownerUid:'another'}))),{code:'permission-denied'});
});
test('regular users see only their times; managers see scoped device information',async()=>{
 const s=setup();await s.handlers.recordAttendance(s.request('worker',s.input()));
 const mine=await s.handlers.listAttendance(s.request('worker',{department:'rhu'}));assert.equal(mine.records.length,1);assert.equal(mine.records[0].device,undefined);assert.equal(mine.canEdit,false);
 assert.equal((await s.handlers.listAttendance(s.request('another',{}))).records.length,0);
 assert.equal((await s.handlers.listAttendance(s.request('admin',{department:'tourism'}))).records[0].device.model,'Model');
 await assert.rejects(()=>s.handlers.listAttendance(s.request('rhuadmin',{department:'tourism'})),{code:'permission-denied'});
 assert.equal((await s.handlers.listAttendance(s.request(policy.SUPER_ADMIN_UID,{department:'tourism'}))).records.length,1);
});
test('corrections are atomic, revision checked, reason required and original/device evidence retained',async()=>{
 const s=setup();await s.handlers.recordAttendance(s.request('worker',s.input()));
 const change={department:'tourism',id:'record1',revision:1,action:'in',time:new Date(Date.now()-60000).toISOString(),voided:false,reason:'Corrected reported time'};
 await assert.rejects(()=>s.handlers.editAttendance(s.request('worker',change)),{code:'permission-denied'});
 await assert.rejects(()=>s.handlers.editAttendance(s.request('rhuadmin',change)),{code:'permission-denied'});
 await assert.rejects(()=>s.handlers.editAttendance(s.request('admin',{...change,reason:''})),{code:'invalid-argument'});
 await s.handlers.editAttendance(s.request('admin',change));const after=s.docs.get('attendance_departments/tourism/records/record1');assert.equal(after.revision,2);assert.equal(after.device.osVersion,'16');assert.notEqual(after.original.time,change.time);
 assert.equal(s.docs.get('attendance_users/worker/records/record1').revision,2);
 const history=await s.handlers.listAttendanceChanges(s.request('admin',{department:'tourism',id:'record1'}));assert.equal(history.changes[0].before.revision,1);assert.equal(history.changes[0].reason,change.reason);
 await assert.rejects(()=>s.handlers.editAttendance(s.request('admin',change)),{code:'aborted'});
 await assert.rejects(()=>s.handlers.listAttendanceChanges(s.request('worker',{department:'tourism',id:'record1'})),{code:'permission-denied'});
 s.failCommit();await assert.rejects(()=>s.handlers.editAttendance(s.request('admin',{...change,revision:2})));assert.equal(s.docs.get('attendance_users/worker/records/record1').revision,2);
});
test('invalid device, future dates and unsigned calls cannot create attendance',async()=>{
 const s=setup();for(const data of [s.input({device:{platform:'android'}}),s.input({time:'invalid'}),s.input({time:new Date(Date.now()+120000).toISOString()})])await assert.rejects(()=>s.handlers.recordAttendance(s.request('worker',data)),{code:'invalid-argument'});
 await assert.rejects(()=>s.handlers.listAttendance({data:{}}),{code:'unauthenticated'});assert.equal(s.docs.size,0);
});
