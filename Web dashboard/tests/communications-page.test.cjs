const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const policy=require('../dashboard-policy');
const source=fs.readFileSync('communications-page.js','utf8').replace("import('./firebase-client.js')",'Promise.resolve({auth:{app:{}}})').replace("import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')",'Promise.resolve(functionsMock)');
class Node{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.events={};this.hidden=true;this.value='';this.textContent='';}
 append(...nodes){this.children.push(...nodes);}replaceChildren(){this.children=[];}setAttribute(name,value){this[name]=value;}addEventListener(name,fn){this.events[name]=fn;}
 all(){return this.children.flatMap(child=>[child,...child.all()]);}
 async fire(name){await this.events[name]?.();} focus(){}
}
const flush=async()=>{await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));};
function setup(role='regular',response=async()=>({items:[],cursor:null}),storage=new Map(),uid='staff'){
 const host=new Node(),welcome=new Node(),events={},calls=[],timeouts=[],timers=[],windowEvents={};
 welcome.hidden=false;
 const session={user:{uid},claims:{role,approved:true,departments:['tourism'],access:{dashboard:true,apps:true}}};
 vm.runInNewContext(source,{DashboardPolicy:policy,document:{querySelector:selector=>selector==='#workspace-welcome'?welcome:selector==='#communications-toggle'?host.all().find(n=>n.id==='communications-toggle'):host,createElement:tag=>new Node(tag),addEventListener:(name,fn)=>{events[name]=fn;}},window:{dashboardSession:session,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},setInterval(fn){timers.push(fn);return timers.length;},clearInterval(){},setTimeout(fn,delay){timeouts.push({fn,delay});return timeouts.length;},clearTimeout(){},addEventListener(name,fn){windowEvents[name]=fn;}},functionsMock:{getFunctions:()=>({}),httpsCallable:(_,name)=>async data=>{calls.push({name,data});return {data:await response(name,data)};}}});
 return {host,welcome,calls,events,timeouts,timers,storage,windowEvents,session,find:(tag,text)=>host.all().find(n=>n.tagName===tag&&(text===undefined||n.textContent===text))};
}
test('regular staff see only their department feed and inbox, never a composer',async()=>{
 const s=setup();await flush();assert.equal(s.calls[0].data.department,'tourism');assert.equal(s.find('textarea'),undefined);
 await s.find('button','Announcement/Messages').fire('click');
 await s.find('button','My inbox').fire('click');await flush();assert.equal(s.calls.at(-1).data.kind,'inboxes');
 assert.equal(s.find('button','Sent messages'),undefined);
});
test('admin publishes through callable and feed renders message text safely',async()=>{
 const message='<script>example</script>';
 const s=setup('admin',async(name)=>name==='listDepartmentUpdates'?{items:[{text:message,authorName:'Admin',createdAt:'2026-10-24T00:00:00Z'}],cursor:null}:{});
 await flush();await s.find('button','Announcement/Messages').fire('click');const field=s.find('textarea');field.value='Department meeting';await field.fire('input');await s.find('button','Publish / send').fire('click');await flush();
 const call=s.calls.find(c=>c.name==='publishDepartmentUpdate');assert.equal(call.data.text,'Department meeting');assert.equal(call.data.department,'tourism');
 const body=s.host.all().find(n=>n.textContent===message);assert.ok(body);assert.equal(body.children.length,0);
});
test('sign-out clears messages and discards an in-flight response',async()=>{
 const pending=[];const s=setup('regular',()=>new Promise(resolve=>{pending.push(resolve);}));await flush();s.events['dashboard-denied']();for(const finish of pending)finish({items:[{text:'Private'}],cursor:null});await flush();assert.equal(s.host.hidden,true);assert.equal(s.host.children.length,0);
});
test('read markers persist per account, collapse displayed updates, and keep unseen inbox messages unread',async()=>{
 const storage=new Map();
 const response=async(name,data)=>({items:[{id:data.kind==='inboxes'?'private-1':'notice-1',text:'Sensitive message',authorUid:'admin'}],cursor:null});
 let s=setup('regular',response,storage);await flush();
 assert.equal(s.find('p','Sensitive message'),undefined,'collapsed by default');
 assert.ok(s.find('span','Unread updates available'));
 await s.find('button','Announcement/Messages').fire('click');
 assert.ok(s.find('p','Sensitive message'));
 await s.find('button','Mark as read & close').fire('click');
 assert.equal(s.find('p','Sensitive message'),undefined);
 assert.ok(s.find('span','Unread updates available'),'reading announcements must not read personal inbox');
 await s.find('button','Announcement/Messages').fire('click');
 await s.find('button','My inbox • New').fire('click');await flush();
 await s.find('button','Mark as read & close').fire('click');
 assert.equal(s.find('span','Unread updates available'),undefined);
 assert.ok([...storage.values()].join().includes('notice-1'));
 assert.ok(![...storage.values()].join().includes('Sensitive message'));
 s=setup('regular',response,storage);await flush();
 assert.equal(s.find('span','Unread updates available'),undefined,'read markers survive reloading');
 s=setup('regular',response,storage,'another-account');await flush();
 assert.ok(s.find('span','Unread updates available'),'another account has independent read state');
});
test('new inbox arrivals are indicated while collapsed and the welcome timer lasts 20 seconds',async()=>{
 let incoming=false;
 const s=setup('regular',async(name,data)=>({items:incoming&&data.kind==='inboxes'?[{id:'new-private',text:'New message',authorUid:'admin'}]:[],cursor:null}));
 await flush();assert.equal(s.find('span','Unread updates available'),undefined);
 assert.equal(s.timeouts[0].delay,20000);assert.equal(s.welcome.hidden,false);
 s.timeouts[0].fn();assert.equal(s.welcome.hidden,true);
 s.events['dashboard-ready']({detail:{...s.session,claims:{...s.session.claims,access:{dashboard:true,apps:true,tourism:true}}}});await flush();
 assert.equal(s.timeouts.length,1,'permission refresh must not restart the welcome banner');
 assert.equal(s.welcome.hidden,true);
 incoming=true;s.timers[0]();await flush();
 assert.ok(s.find('span','Unread updates available'));
 assert.equal(s.find('p','New message'),undefined,'background refresh must not expand the panel');
});
test('updates stay at the top of every role page independently of the active tab',()=>{
 for(const page of ['dashboard.html','super-admin.html','department-admin.html','user-dashboard.html']){
  const html=fs.readFileSync(page,'utf8');
  assert.ok(html.indexOf('id="department-communications"')<html.indexOf('id="overview-panel"'));
  assert.ok(html.indexOf('id="department-communications"')>html.indexOf('id="sign-out"'));
 }
});
