const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const policy=require('../dashboard-policy');
const source=fs.readFileSync('departments-page.js','utf8')
 .replaceAll("import('./firebase-client.js')",'Promise.resolve({auth:{app:{}}})')
 .replace("import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js')",'Promise.resolve(sdkMock)')
 .replace("import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')",'Promise.resolve(functionsMock)');
class Node {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.events={};this.hidden=false;this.value='';this.textContent='';}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 addEventListener(type,fn){(this.events[type]||=[]).push(fn);}
 setAttribute(key,value){this[key]=value;}
 all(){return this.children.flatMap(node=>[node,...node.all()]);}
 querySelector(tag){return this.all().find(node=>node.tagName===tag);}
 remove(){this.removed=true;}
 showModal(){this.open=true;}
 close(){this.open=false;this.fire('close');}
 fire(type){for(const fn of this.events[type]||[])fn();}
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));};
function setup(respond=async()=>[],claims={role:'superadmin'},uid=policy.superUid){
 const hosts={'#tourism-records-workspace':new Node(),'#department-panel':new Node()},body=new Node('body'),events={},calls=[];
 const document={body,querySelector:key=>hosts[key],createElement:tag=>new Node(tag),querySelectorAll:()=>body.children.filter(n=>!n.removed),addEventListener(type,fn){(events[type]||=[]).push(fn);},dispatchEvent(event){for(const fn of events[event.type]||[])fn(event);}};
 const sdk={where:(...args)=>['where',...args],orderBy:(...args)=>['orderBy',...args],documentId:()=> '__name__',limit:n=>['limit',n],startAfter:cursor=>['startAfter',cursor],getFirestore:()=>({}),collection:(_,name)=>name,query:(collection,...constraints)=>({collection,constraints}),getDocsFromServer:async query=>{calls.push(query);return {docs:await respond(query,calls.length)};}};
 const functionsMock={getFunctions:()=>({}),httpsCallable:(_,name)=>async data=>{const query={collection:'tourism_records',name,...data};calls.push(query);const docs=await respond(query,calls.length);return {data:{records:docs.map(d=>({...d.data(),id:d.id})),cursor:docs.length===100?docs.at(-1).id:null}};}};
 const session={user:{uid},claims};
 vm.runInNewContext(source,{document,window:{dashboardSession:session,addEventListener(){}},sdkMock:sdk,functionsMock,TourismReport:require('../tourism-report'),DashboardPolicy:policy,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}});
 return {hosts,body,calls,open:key=>document.dispatchEvent({type:'department-selected',detail:key}),deny:()=>document.dispatchEvent({type:'dashboard-denied'}),ready:detail=>document.dispatchEvent({type:'dashboard-ready',detail})};
}
const doc=(id,data)=>({id,data:()=>data});
const text=node=>[node.textContent,...node.children.map(text)].join(' ');
const find=(node,tag,label)=>node.all().find(n=>n.tagName===tag&&(!label||n.textContent===label));
test('Tourism uses authorized department report, exact recorded fees and missing count labels',async()=>{
 const s=setup(async()=>[doc('group',{name:'Visitor <script>',company:'Group A',touristCount:3,feeTotalCentavos:15015,createdAt:new Date()}),doc('legacy',{name:'Old visitor',fee:20,createdAt:new Date()})]);
 s.open('tourism');await flush();
 assert.equal(s.calls[0].name,'listTourismRecords');
 assert.equal(s.calls[0].from,s.calls[0].to);
 assert.equal(s.calls[0].collection,'tourism_records');
 const host=s.hosts['#tourism-records-workspace'];
 assert.match(text(host),/₱170.15/);assert.match(text(host),/Not recorded/);assert.match(text(host),/entries have no tourist count/);
 const search=find(host,'input');search.value='Group A';search.fire('input');
 assert.match(text(host),/1 matching of 2 records/);assert.doesNotMatch(text(find(host,'tbody')),/Old visitor/);
 find(host,'button','View').fire('click');assert.match(text(s.body),/Visitor <script>/);
 s.deny();assert.equal(host.children.length,0);assert.equal(s.body.children[0].removed,true);
});
test('RHU opens visits and pharmacy independently with correct collections',async()=>{
 const s=setup(async query=>query.collection==='patient_records'?[doc('v1',{patientName:'Patient One',patientNumber:'P1',doctorName:'Doctor',checkedAt:new Date()})]:[doc('m1',{name:'Medicine',quantity:0,strength:'500 mg',updatedAt:new Date()})]);
 s.open('rhu');await flush();let host=s.hosts['#department-panel'];assert.match(text(host),/Patient One/);
 find(host,'button','Medicine inventory').fire('click');await flush();
 assert.equal(s.calls.at(-1).collection,'pharmacy_inventory');assert.match(text(host),/Out of stock/);assert.match(text(host),/Medicine/);
});
test('denied feature permissions cause no reads and a rejected read is not shown as an empty database',async()=>{
 const limited=setup(async()=>[],{approved:true,departments:['rhu'],access:{dashboard:true,rhu:true,patients:true}} ,'staff');
 limited.open('tourism');await flush();assert.equal(limited.calls.length,0);
 limited.open('rhu');await flush();assert.equal(limited.calls.length,1);assert.doesNotMatch(text(limited.hosts['#department-panel']),/Medicine inventory/);
 const denied=setup(async()=>{throw {code:'functions/permission-denied'};});denied.open('tourism');await flush();
 assert.match(text(denied.hosts['#tourism-records-workspace']),/Tourism administrator access is required/);
 assert.doesNotMatch(text(denied.hosts['#tourism-records-workspace']),/No cloud records found/);
});
test('sign-out discards a pending query response',async()=>{
 let resolve;const s=setup(()=>new Promise(r=>resolve=r));s.open('tourism');await flush();s.deny();
 resolve([doc('private',{name:'Private record'})]);await flush();
 assert.equal(s.hosts['#tourism-records-workspace'].children.length,0);
});
test('Tourism automatically loads all pages before displaying totals',async()=>{
 const first=Array.from({length:100},(_,i)=>doc(`r${i}`,{name:`Visitor ${i}`,touristCount:1,fee:1,createdAt:new Date()}));
 const s=setup(async(_,page)=>page===1?first:[doc('last',{name:'Last visitor',touristCount:2,fee:2,createdAt:new Date()})]);
 s.open('tourism');await flush();let host=s.hosts['#tourism-records-workspace'];await flush();host=s.hosts['#tourism-records-workspace'];
 assert.equal(s.calls[1].cursor,first.at(-1).id);
 assert.match(text(host),/101 matching of 101 records/);assert.match(text(host),/₱102.00/);
});

test('Tourism switches between day, Monday-based week and month reports',async()=>{
 const s=setup(async()=>[]);s.open('tourism');await flush();
 let host=s.hosts['#tourism-records-workspace'];let select=find(host,'select');select.value='week';select.fire('change');await flush();
 assert.equal((Date.parse(s.calls.at(-1).to)-Date.parse(s.calls.at(-1).from))/86400000,6);
 host=s.hosts['#tourism-records-workspace'];assert.match(text(host),/Daily totals/);
 select=find(host,'select');select.value='month';select.fire('change');await flush();
 assert.match(s.calls.at(-1).from,/-01$/);
});
