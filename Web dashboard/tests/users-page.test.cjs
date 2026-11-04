const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const policy = require('../dashboard-policy.js');
const html = fs.readFileSync('dashboard.html', 'utf8');
const source = fs.readFileSync('users-page.js', 'utf8')
  .replace("import('./firebase-client.js')", 'Promise.resolve({auth:{app:{}}})')
  .replace("import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')", 'Promise.resolve(functionsMock)');
class Node {
  constructor(tag='div') { this.tagName=tag; this.children=[]; this.events={}; this.value=''; this.checked=false; this.hidden=false; this.disabled=false; this.textContent=''; this.classList={toggle(){}}; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children=children; }
  addEventListener(name, callback) { (this.events[name] ||= []).push(callback); }
  setAttribute(name,value) { this[name]=value; }
  focus() {}
  reportValidity() { return true; }
  all() { return this.children.flatMap(child => child instanceof Node ? [child,...child.all()] : []); }
  querySelectorAll(selector) { return this.all().filter(child => selector === 'input' ? child.tagName === 'input' : child.name === selector.match(/name="([^"]+)"/)?.[1]); }
  async fire(name) { for (const callback of this.events[name] || []) await callback({preventDefault(){}}); }
}
async function setup(uid, claims, users=[], options={}) {
  const nodes={};
  for(const match of html.matchAll(/<(\w+)[^>]*id="([^"]+)"[^>]*>/g)) { nodes[match[2]]=new Node(match[1]); nodes[match[2]].hidden=/\bhidden\b/.test(match[0]); }
  const form=nodes['user-form'];
  for(const id of ['username','user-email-input','user-password','user-approved','user-disabled','department-options','extra-section-options']) form.append(nodes[id]);
  const choices=[];
  for(const match of html.matchAll(/<input[^>]*name="(user-role|user-access)"[^>]*value="([^"]+)"([^>]*)>/g)) {
    const input=new Node('input'); input.name=match[1]; input.value=match[2]; input.checked=match[3].includes('checked'); choices.push(input); form.append(input);
  }
  form.reset=()=>{for(const input of form.querySelectorAll('input')) {input.checked=input.name === 'user-role' && input.value === 'regular'; if(!input.name) input.value='';}};
  const events={}, calls=[];
  const document={querySelector: selector=>nodes[selector.slice(1)],querySelectorAll:()=>[nodes['save-user'],nodes['cancel-user'],nodes['new-user'],nodes['refresh-users']],createElement:tag=>new Node(tag),createTextNode:text=>text,addEventListener:(name,callback)=>{events[name]=callback;},dispatchEvent(event){events[event.type]?.(event);}};
  const context=vm.createContext({CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},document,DashboardPolicy:policy,window:{addEventListener(){},location:{hash:options.hash || ''},dashboardSession:options.preloaded ? {user:{uid},claims} : null},functionsMock:{getFunctions:()=>({}),httpsCallable:(functions,name)=>async data=>{calls.push({name,data});return {data:name === 'listDashboardUsers' ? {users,pageToken:null} : {}};}}});
  vm.runInContext(source,context);
  if (options.preloaded) {
    await new Promise(resolve=>setImmediate(resolve));
  } else await events['dashboard-ready']({detail:{user:{uid},claims}});
  return {nodes,form,calls,events,context,choice:(name,value)=>form.querySelectorAll(`[name="${name}"]`).find(input=>input.value === value)};
}
const rootClaims={role:'superadmin'};
const allSections=['dashboard','apps',...Object.keys(policy.sectionDepartment)];
const assignedAccess=Object.fromEntries(allSections.map(key=>[key,true]));
test('protected super admin fields remain locked while profile fields are editable',async()=>{
  const user={uid:policy.superUid,username:'Zaldy',email:'zaldy.rafanan@gmail.com',role:'superadmin',departments:[],approved:true,protected:true,disabled:false,assignedAccess};
  const s=await setup(policy.superUid,rootClaims,[user]);
  assert.equal(s.nodes['user-editor'].hidden,true);
  await s.nodes['users-list'].children[0].children[0].children[0].children[1].fire('click');
  assert.equal(s.nodes['user-editor'].hidden,false);
  for(const input of s.form.querySelectorAll('[name="user-role"]')) assert.equal(input.disabled,true);
  assert.equal(s.nodes.username.disabled,false);
  assert.equal(s.nodes['user-approved'].checked,true);
  assert.equal(s.nodes['user-approved'].disabled,true);
  assert.equal(s.nodes['user-disabled'].disabled,true);
  assert.ok(s.form.querySelectorAll('[name="user-access"]').every(input=>input.checked && input.disabled));
});
test('new accounts default to pending; super admin can assign an admin and select visible departments',async()=>{
  const s=await setup(policy.superUid,rootClaims);
  assert.equal(s.nodes['user-approved'].checked,false);
  assert.equal(s.nodes['user-editor'].hidden,true);
  await s.nodes['new-user'].fire('click');
  assert.equal(s.nodes['user-editor'].hidden,false);
  s.nodes.username.value='New admin'; s.nodes['user-email-input'].value='admin@example.com'; s.nodes['user-password'].value='test-password';
  const role=s.choice('user-role','admin');role.checked=true;await role.fire('change');
  const department=s.choice('user-department','tourism');department.checked=true;await department.fire('change');
  assert.equal(s.choice('user-access','tourism').disabled,false);
  assert.equal(s.choice('user-access','pharmacy').disabled,true);
  s.choice('user-access','dashboard').checked=true;
  s.choice('user-access','tourism').checked=true;
  await s.form.fire('submit');
  const saved=s.calls.find(call=>call.name === 'createDashboardUser').data;
  assert.equal(saved.role,'admin');assert.equal(saved.approved,false);assert.deepEqual(Array.from(saved.departments),['tourism']);assert.equal(saved.access.pharmacy,false);
});
test('department admins can approve assigned pending workers but cannot change their role or department',async()=>{
  const claims={role:'admin',approved:true,departments:['tourism'],access:{dashboard:true,apps:true,tourism:true}};
  const user={uid:'pending',username:'Worker',email:'worker@example.com',role:'regular',departments:['tourism'],approved:false,protected:false,disabled:false,assignedAccess:{apps:true,tourism:true}};
  const s=await setup('manager',claims,[user]);
  assert.deepEqual(s.nodes['department-workspace'].children.map(child=>child.children[0].textContent),['Tourism', 'Attendance']);
  assert.equal(s.nodes['user-editor'].hidden,true);
  await s.nodes['users-list'].children[0].children[0].children[0].children[1].fire('click');
  assert.equal(s.nodes['user-editor'].hidden,false);
  assert.equal(s.choice('user-role','admin').disabled,true);
  assert.ok(s.form.querySelectorAll('[name="user-department"]').every(input=>input.disabled));
  assert.equal(s.choice('user-access','tourism').checked,true);
  assert.equal(s.choice('user-access','pharmacy').disabled,true);
  s.nodes['user-approved'].checked=true;
  await s.form.fire('submit');
  const saved=s.calls.find(call=>call.name === 'updateDashboardUser').data;
  assert.equal(saved.uid,'pending');assert.equal(saved.approved,true);assert.equal(saved.role,'regular');assert.deepEqual(Array.from(saved.departments),['tourism']);
});

test('Users tab shows the list and settings when sign-in completes before its script loads',async()=>{
  const user={uid:policy.superUid,username:'Zaldy',email:'zaldy.rafanan@gmail.com',role:'superadmin',departments:[],approved:true,protected:true,disabled:false,assignedAccess};
  const s=await setup(policy.superUid,rootClaims,[user],{preloaded:true,hash:'#users'});
  assert.equal(s.nodes['users-panel'].hidden,false);
  await s.nodes['users-tab'].fire('click');
  assert.equal(s.nodes['overview-panel'].hidden,true);
  assert.equal(s.nodes['users-panel'].hidden,false);
  assert.equal(s.nodes['user-management'].hidden,false);
  assert.equal(s.nodes['users-list'].children.length,1);
  assert.equal(s.nodes.username.disabled,false);
});
test('dashboard assets use a versioned URL to replace pre-super-admin cached scripts',()=>{
  for (const asset of ['dashboard-policy.js','auth-page.js','users-page.js']) {
    assert.ok(html.includes(`${asset}?v=`));
  }
});

test('Tourism tab shows fee settings separately from Overview and Users',async()=>{
  const s=await setup(policy.superUid,rootClaims);
  assert.equal(s.nodes['tourism-tab'].hidden,false);
  assert.equal(s.nodes['tourism-panel'].hidden,true);
  await s.nodes['tourism-tab'].fire('click');
  assert.equal(s.nodes['tourism-panel'].hidden,false);
  assert.equal(s.nodes['overview-panel'].hidden,true);
  assert.equal(s.nodes['users-panel'].hidden,true);
  assert.equal(s.nodes['tourism-tab']['aria-selected'],'true');
  await s.nodes['users-tab'].fire('click');
  assert.equal(s.nodes['tourism-panel'].hidden,true);
  assert.equal(s.nodes['users-panel'].hidden,false);
});
test('Tourism tab is available to Tourism admins, hidden from other departments, and cleared on denial',async()=>{
  for(const [department,allowed] of [['tourism',true],['rhu',false]]) {
    const s=await setup('manager',{role:'admin',approved:true,departments:[department],access:{dashboard:true,[department]:true}});
    assert.equal(s.nodes['tourism-tab'].hidden,!allowed);
    await s.nodes['tourism-tab'].fire('click');
    assert.equal(s.nodes['tourism-panel'].hidden,!allowed);
    s.events['dashboard-denied']();
    assert.equal(s.nodes['tourism-tab'].hidden,true);
    assert.equal(s.nodes['tourism-panel'].hidden,true);
  }
});


test('all assigned department buttons open their workspace and return to overview', async()=>{
  const s=await setup(policy.superUid,rootClaims);
  const buttons=s.nodes['department-workspace'].children;
  assert.equal(buttons.length,Object.keys(policy.departments).length);
  for(const [index,key] of Object.keys(policy.departments).entries()) {
    assert.equal(buttons[index].tagName,'button');
    await buttons[index].fire('click');
    assert.equal(s.nodes['overview-panel'].hidden,true);
    assert.equal(s.nodes['tourism-panel'].hidden,key!=='tourism');
    assert.equal(s.nodes['department-panel'].hidden,key==='tourism');
    s.context.window.dashboardSession={user:{uid:policy.superUid},claims:rootClaims};
    s.events['department-navigate']({detail:'overview'});
    assert.equal(s.nodes['overview-panel'].hidden,false);
    assert.equal(s.nodes['department-panel'].hidden,true);
  }
});

test('regular staff can open their assigned Tourism records without user management',async()=>{
  const s=await setup('worker',{role:'regular',approved:true,departments:['tourism'],access:{dashboard:true,apps:true,tourism:true}});
  assert.equal(s.nodes['tourism-tab'].hidden,false);
  await s.nodes['department-workspace'].children[0].fire('click');
  assert.equal(s.nodes['tourism-panel'].hidden,false);
  assert.equal(s.nodes['users-tab'].hidden,true);
});

test('each role has a distinct dashboard and regular users cannot open account management', async()=>{
  for (const [uid,claims,title,path,usersVisible] of [
    [policy.superUid,rootClaims,'Super admin dashboard','super-admin.html',true],
    ['manager',{role:'admin',approved:true,departments:['tourism'],access:{dashboard:true,tourism:true}},'Department admin dashboard','department-admin.html',true],
    ['worker',{role:'regular',approved:true,departments:['tourism'],access:{dashboard:true,tourism:true}},'Regular user dashboard','user-dashboard.html',false]
  ]) {
    const s=await setup(uid,claims,[],{hash:'#users'});
    assert.equal(s.nodes['dashboard-title'].textContent,title);
    assert.equal(policy.workspace(uid,claims).path,path);
    assert.equal(s.nodes['users-tab'].hidden,!usersVisible);
    if (!usersVisible) {
      await s.nodes['users-tab'].fire('click');
      assert.equal(s.nodes['users-panel'].hidden,true);
      assert.equal(s.calls.length,0);
    }
    assert.ok(fs.readFileSync(path,'utf8').includes(`<title>${title} | San Antonio</title>`));
  }
  assert.equal(policy.workspace('forged',{role:'superadmin'}).key,'regular');
});
test('Tourism admin preset explicitly fills approval and mobile service access before saving', async()=>{
  const user={uid:'claire',username:'Claire',email:'claire@example.com',role:'admin',departments:['tourism'],approved:false,protected:false,disabled:false,assignedAccess:{dashboard:true}};
  const s=await setup(policy.superUid,rootClaims,[user]);
  await s.nodes['users-list'].children[0].children[0].children[0].children[1].fire('click');
  assert.match(s.nodes['user-access-summary'].textContent,/approval is off/);
  assert.equal(s.nodes['apply-admin-access'].hidden,false);
  await s.nodes['apply-admin-access'].fire('click');
  assert.equal(s.nodes['user-approved'].checked,true);
  for (const section of ['dashboard','apps','tourism']) assert.equal(s.choice('user-access',section).checked,true);
  assert.equal(s.choice('user-access','patients').checked,false);
  assert.match(s.nodes['user-access-summary'].textContent,/Ready/);
  assert.equal(s.calls.filter(c=>c.name==='updateDashboardUser').length,0);
  await s.form.fire('submit');
  const data=s.calls.find(c=>c.name==='updateDashboardUser').data;
  assert.equal(data.approved,true);assert.equal(data.access.apps,true);assert.equal(data.access.tourism,true);
});
test('mobile status distinguishes approval, mobile switch and service permissions',()=>{
  const user={disabled:false,approved:true,departments:['tourism'],assignedAccess:{apps:true,tourism:true}};
  assert.match(policy.mobileAccessStatus(user),/Ready/);
  assert.match(policy.mobileAccessStatus({...user,approved:false}),/approval/);
  assert.match(policy.mobileAccessStatus({...user,assignedAccess:{tourism:true}}),/Mobile app/);
  assert.match(policy.mobileAccessStatus({...user,assignedAccess:{apps:true}}),/service/);
});


test('department assignment controls are hidden from department admins and visible to super admin',async()=>{
 const admin=await setup('tourism-admin',{role:'admin',approved:true,departments:['tourism'],access:{dashboard:true,apps:true,tourism:true,attendance:true}});
 assert.equal(admin.nodes['department-assignment'].hidden,true);
 await admin.nodes['new-user'].fire('click');
 assert.equal(admin.choice('user-department','tourism')?.checked ?? admin.form.querySelectorAll('[name="user-department"]').some(n=>n.value==='tourism'&&n.checked),true);
 const root=await setup(policy.superUid,rootClaims);
 assert.equal(root.nodes['department-assignment'].hidden,false);
});
