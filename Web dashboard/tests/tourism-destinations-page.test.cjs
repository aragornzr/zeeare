const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const policy=require('../dashboard-policy');
const source=fs.readFileSync('tourism-destinations-page.js','utf8').replace("import('./firebase-client.js')",'Promise.resolve({auth:{app:{}}})').replace("import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')",'Promise.resolve(functionsMock)');
class Node{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.events={};this.hidden=true;this.value='';this.textContent='';}
 append(...nodes){this.children.push(...nodes);}prepend(...nodes){this.children.unshift(...nodes);}replaceChildren(){this.children=[];}setAttribute(name,value){this[name]=value;}addEventListener(name,fn){this.events[name]=fn;}
 all(){return this.children.flatMap(child=>[child,...child.all()]);}querySelector(){return null;}async fire(name){await this.events[name]?.({preventDefault(){}});}
}
const flush=async()=>{await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));};
function setup(capabilities={canEdit:false,canDelegate:false},respond){
 const host=new Node(),events={},calls=[];
 const session={user:{uid:'staff'},claims:{role:'regular',approved:true,departments:['tourism'],access:{dashboard:true,tourism:true}}};
 const data={...capabilities,version:3,destinations:[{id:'bay',name:'<Bay Resort>',active:true},{id:'old',name:'Old resort',active:false}]};
 vm.runInNewContext(source,{DashboardPolicy:policy,document:{querySelector:()=>host,createElement:tag=>new Node(tag),addEventListener:(name,fn)=>{events[name]=fn;}},window:{dashboardSession:session,addEventListener(){}},functionsMock:{getFunctions:()=>({}),httpsCallable:(_,name)=>async input=>{calls.push({name,data:input});return {data:respond?await respond(name,input):data};}}});
 return {host,calls,events,find:(tag,text)=>host.all().find(n=>n.tagName===tag&&(text===undefined||n.textContent===text))};
}
test('regular Tourism staff browse the list without editing or delegation controls',async()=>{
 const s=setup();await flush();assert.equal(s.host.hidden,false);assert.equal(s.find('form'),undefined);assert.equal(s.find('button','Load Tourism personnel'),undefined);
 const safe=s.find('strong','<Bay Resort>');assert.ok(safe);assert.equal(safe.children.length,0);
});
test('delegated personnel edit with the loaded version and cannot redelegate',async()=>{
 const s=setup({canEdit:true,canDelegate:false});await flush();
 await s.find('button','Edit <Bay Resort>').fire('click');const input=s.host.all().find(n=>n.type==='text');input.value='Renamed resort';await input.fire('input');
 await s.find('form').fire('submit');await flush();const saved=s.calls.find(c=>c.name==='saveTourismDestination').data;
 assert.equal(saved.name,'Renamed resort');assert.equal(saved.id,'bay');assert.equal(saved.version,3);assert.equal(s.find('button','Load Tourism personnel'),undefined);
});
test('admin can delegate destination editing and remove it without granting other account privileges',async()=>{
 const caps={canEdit:true,canDelegate:true,version:0,destinations:[]};
 const s=setup(caps,async name=>name==='listTourismDestinationPersonnel'?{users:[{uid:'worker',username:'Personnel',email:'person@example.com',eligible:true,delegated:false}],pageToken:null}:caps);
 await flush();await s.find('button','Load Tourism personnel').fire('click');await flush();
 await s.find('button','Delegate management').fire('click');await flush();assert.equal(s.calls.at(-1).name,'setTourismDestinationEditor');assert.equal(s.calls.at(-1).data.uid,'worker');assert.equal(s.calls.at(-1).data.enabled,true);
 await s.find('button','Remove delegation').fire('click');await flush();assert.equal(s.calls.at(-1).data.enabled,false);
});
test('conflicting save retains the draft and sign-out discards an in-flight list',async()=>{
 const caps={canEdit:true,canDelegate:false,version:0,destinations:[]};
 const s=setup(caps,async name=>{if(name==='saveTourismDestination')throw Error('List changed; reload before saving.');return caps;});
 await flush();let field=s.host.all().find(n=>n.type==='text');field.value='Unsaved resort';await field.fire('input');await s.find('form').fire('submit');await flush();
 assert.equal(s.host.all().find(n=>n.type==='text').value,'Unsaved resort');assert.ok(s.host.all().some(n=>n.textContent==='List changed; reload before saving.'));
 let finish;const pending=setup(caps,()=>new Promise(resolve=>{finish=resolve;}));await flush();pending.events['dashboard-denied']();finish(caps);await flush();assert.equal(pending.host.hidden,true);assert.equal(pending.host.children.length,0);
});
