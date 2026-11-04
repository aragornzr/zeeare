const test = require('node:test');
const assert = require('node:assert/strict');
const p = require('./access-policy');
const access = (...keys) => Object.fromEntries(p.SECTIONS.map(key => [key, keys.includes(key)]));
const root = {uid:p.SUPER_ADMIN_UID,customClaims:{role:'superadmin'}};
const admin = {uid:'tourism-admin',customClaims:{role:'admin',approved:true,departments:['tourism'],access:access('dashboard','apps','tourism')}};
const regular = {uid:'worker',customClaims:{role:'regular',approved:true,departments:['tourism'],access:access('apps','tourism')}};
const input = (extra = {}) => ({username:' New User ',email:'worker@example.com',password:'test-password',role:'regular',access:access('apps','tourism'),disabled:false,approved:true,departments:['tourism'],...extra});
test('only the protected UID can use the super admin role',()=>{
  assert.equal(p.roleOf(root),'superadmin');
  assert.equal(p.roleOf({...root,uid:'imposter'}),'regular');
  assert.throws(()=>p.assertManager({...root,uid:'imposter'}),{code:'permission-denied'});
});
test('missing approval, legacy admins, anonymous, disabled and regular accounts cannot manage users',()=>{
  for(const actor of [null,regular,{uid:'old-admin',customClaims:{role:'admin'}},{...admin,disabled:true},{...admin,customClaims:{...admin.customClaims,approved:false}}]) assert.throws(()=>p.assertManager(actor),{code:'permission-denied'});
});
test('super admin may assign department admins, but cannot weaken the protected account',()=>{
  p.assertCanManage(root,regular,input({role:'admin'}));
  for (const data of [input(),input({role:'superadmin',disabled:true}),input({role:'superadmin',approved:false}),input({role:'superadmin'})]) assert.throws(()=>p.assertCanManage(root,root,data),{code:'permission-denied'});
  p.assertCanManage(root,root,input({role:'superadmin',access:access(...p.SECTIONS)}));
  assert.throws(()=>p.assertCanManage(root,null,input({role:'superadmin',access:access(...p.SECTIONS)})),{code:'permission-denied'});
  assert.throws(()=>p.assertCanManage(admin,root,input({role:'superadmin',access:access(...p.SECTIONS)})),{code:'permission-denied'});
});
test('department admins approve their workers but cannot edit admins, transfer workers or see other departments',()=>{
  const pending={...regular,customClaims:{...regular.customClaims,approved:false}};
  p.assertCanManage(admin,pending,input());
  assert.equal(p.canSee(admin,pending),true);
  for (const target of [root,admin,{uid:'unassigned'},{...regular,customClaims:{...regular.customClaims,departments:['rhu']}},{...regular,customClaims:{...regular.customClaims,departments:['tourism','rhu']}}]) {
    assert.equal(p.canSee(admin,target),false);
    assert.throws(()=>p.assertCanManage(admin,target,input()),{code:'permission-denied'});
  }
  for (const data of [input({role:'admin'}),input({departments:['rhu']}),input({access:access(...p.SECTIONS)})]) assert.throws(()=>p.assertCanManage(admin,regular,data),{code:'permission-denied'});
});
test('approval and assigned departments restrict effective access even for admins',()=>{
  assert.equal(p.accessOf({uid:'new'}).apps,false);
  assert.equal(p.accessOf({...regular,customClaims:{...regular.customClaims,approved:false}}).tourism,false);
  assert.equal(p.accessOf({...admin,customClaims:{...admin.customClaims,access:access(...p.SECTIONS)}}).pharmacy,false);
  assert.equal(p.accessOf(root).engineering,true);
});
test('input rejects malformed permissions, department mismatches, missing approval, and weak passwords',()=>{
  for(const data of [input({access:{...access(),arbitrary:true}}),input({password:'123'}),input({extra:true}),input({email:'invalid'}),input({approved:'true'}),input({departments:['unknown']}),input({departments:[]}),input({access:access('pharmacy')}),input({departments:['tourism','rhu']}),input({access:{...access(),tourism:'true'}})]) assert.throws(()=>p.validateInput(data,true),{code:'invalid-argument'});
  assert.equal(p.validateInput(input(),true).username,'New User');
  assert.doesNotThrow(()=>p.validateInput(input({uid:'target',password:''}),false));
  assert.doesNotThrow(()=>p.validateInput(input({approved:false,departments:[],access:access()}),true));
});
test('public user data distinguishes pending assignments without returning secrets',()=>{
  const output=p.publicUser({...regular,passwordHash:'secret',customClaims:{...regular.customClaims,approved:false,otherSecret:'hidden'}});
  assert.equal(output.access.tourism,false);
  assert.equal(output.assignedAccess.tourism,true);
  assert.equal(output.passwordHash,undefined);
  assert.equal(output.otherSecret,undefined);
  assert.equal(output.approved,false);
});

test('Attendance is a shared service for approved staff in every assigned department',()=>{
 for(const department of p.DEPARTMENTS){
  const employee={uid:'staff',customClaims:{role:'regular',approved:true,departments:[department],access:{apps:true,attendance:true}}};
  assert.equal(p.accessOf(employee).attendance,true);
 }
});
