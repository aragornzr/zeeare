const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const policy = require('../dashboard-policy');
const source = fs.readFileSync('history-page.js','utf8')
  .replace("import('./firebase-client.js')", 'Promise.resolve({auth:{app:{}}})')
  .replace("import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')", 'Promise.resolve(functionsMock)');
class Node {
  constructor() {this.children=[];this.events={};this.hidden=true;this.textContent='';}
  append(child) {this.children.push(child);}
  replaceChildren() {this.children=[];}
  addEventListener(name,cb) {this.events[name]=cb;}
  scrollIntoView() {}
}
const flush = () => new Promise(resolve=>setImmediate(resolve));
function setup(claims={role:'superadmin'}, uid=policy.superUid, respond=async()=>({data:{events:[],cursor:null}})) {
  const nodes={},events={},calls=[];
  for(const id of ['history-panel','history-list','history-status','more-history','refresh-history','close-history','history-account','history-registration']) nodes[id]=new Node();
  const document={querySelector:selector=>nodes[selector.slice(1)],createElement:()=>new Node(),addEventListener:(name,cb)=>{events[name]=cb;}};
  const session={user:{uid},claims};
  vm.runInNewContext(source,{document,DashboardPolicy:policy,Intl,Date,Number,JSON,String,window:{dashboardSession:session,addEventListener(){}},functionsMock:{getFunctions:()=>({}),httpsCallable:()=>async data=>{calls.push(data);return respond(data);}}});
  const open = (target={}) => events['account-history-open']({detail:{uid:'target',username:'<script>unsafe</script>',email:'worker@example.com',registeredAt:'2026-10-01T00:00:00Z',...target}});
  return {nodes,events,calls,open};
}
test('history is unavailable to unapproved department admins and forged super admin UIDs',async()=>{
  for(const [claims,uid] of [[{role:'admin'},'admin'],[{role:'superadmin'},'imposter']]) {
    const s=setup(claims,uid);s.open();await flush();
    assert.equal(s.calls.length,0);assert.equal(s.nodes['history-panel'].hidden,true);
  }
});
test('super admin sees Philippine time, safe text, and older records use the cursor',async()=>{
  const s=setup(undefined,undefined,async()=>({data:{events:[{type:'account_updated',source:'dashboard',status:'completed',actorEmail:'admin@example.com',occurredAt:'2026-10-01T00:00:00Z',changes:[{field:'password'},{field:'username',before:'Old',after:'<script>unsafe</script>'}]}],cursor:'older'}}));
  s.open();await flush();
  assert.match(s.nodes['history-registration'].textContent,/8:00:00/);
  assert.equal(s.nodes['history-panel'].hidden,false);
  const cells=s.nodes['history-list'].children[0].children;
  assert.match(cells[0].textContent,/8:00:00/);
  assert.match(cells[3].textContent,/Password changed/);
  assert.match(cells[3].textContent,/<script>unsafe<\/script>/);
  assert.equal(cells[3].children.length,0);
  await s.nodes['more-history'].events.click();await flush();
  assert.equal(s.calls[1].cursor,'older');
});
test('logout clears private history and ignores an in-flight response',async()=>{
  let resolve;
  const s=setup(undefined,undefined,()=>new Promise(r=>{resolve=r;}));
  s.open();await flush();s.events['dashboard-denied']();
  resolve({data:{events:[{type:'login',source:'mobile',status:'completed'}],cursor:null}});await flush();
  assert.equal(s.nodes['history-panel'].hidden,true);assert.equal(s.nodes['history-list'].children.length,0);
});

test('approved department admin can open worker history but not another department',async()=>{
 const s=setup({role:'admin',approved:true,departments:['tourism'],access:{dashboard:true}},'manager');
 s.open({role:'regular',departments:['rhu']});await flush();assert.equal(s.calls.length,0);
 s.open({role:'regular',departments:['tourism']});await flush();assert.equal(s.calls.length,1);
});
test('login history displays reported device and marks missing legacy device data',async()=>{
 const s=setup(undefined,undefined,async()=>({data:{events:[{type:'login',source:'mobile',status:'completed',device:{platform:'android',manufacturer:'Samsung',model:'SM-A546E',osVersion:'14'}},{type:'login',source:'mobile',status:'completed'}],cursor:null}}));
 s.open();await flush();assert.match(s.nodes['history-list'].children[0].children[3].textContent,/Samsung.*SM-A546E.*android.*14/);
 assert.match(s.nodes['history-list'].children[1].children[3].textContent,/not reported/);
});
