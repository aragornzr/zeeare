const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('auth-page.js', 'utf8').replace("import('./firebase-client.js')", 'Promise.resolve(firebaseMock)').replace("import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')", 'Promise.resolve({getFunctions:()=>({}),httpsCallable:()=>async()=>({})})');
const flush = () => new Promise(resolve => setImmediate(resolve));
async function setup(page, user = null, failure, claims = {role:'admin',approved:true,departments:['tourism'],access:{dashboard:true}}, logout = async () => {}, pathname = '') {
  const nodes = {};
  for (const id of ['auth-status','login-form','sign-in','sign-out','email','password','save-login','dashboard-content','user-email','session-identity','session-name','session-role']) {
    nodes[id] = { disabled: id === 'sign-in', hidden: true, value: '', checked: false, textContent: '', events: {}, classList: { add(){}, remove(){} }, addEventListener(type, cb){(this.events[type] ||= []).push(cb)}, reportValidity(){return true} };
  }
  const calls = [];
  const redirects = [];
  const publications = [], timers = [], documentEvents = {}, windowEvents = {}, clearedTimers = [];
  let observer;
  if (user) { user.uid = 'registered'; user.getIdTokenResult = async () => ({claims}); }
  const firebaseMock = {
    auth: {currentUser: user}, browserLocalPersistence: 'local', browserSessionPersistence: 'session',
    onAuthStateChanged(auth, callback){observer = callback; callback(user)},
    async setPersistence(auth, value){calls.push(['persistence', value])},
    async signInWithEmailAndPassword(auth, email, password){calls.push(['login',email,password]); if(failure) throw {code:failure}; observer({email, uid: 'registered'})},
    async signOut(){calls.push(['logout']); await logout(); firebaseMock.auth.currentUser = null; observer(null)}
  };
  const document = { body:{dataset:{page}}, dispatchEvent(event){publications.push(event)}, addEventListener(name,callback){documentEvents[name]=callback}, querySelector(selector){if(page === 'login' && selector === '#sign-out')return null; if(page === 'dashboard' && ['#login-form','#sign-in'].includes(selector))return null;return nodes[selector.slice(1)]} };
  vm.runInNewContext(source, { document, firebaseMock, DashboardPolicy: require('../dashboard-policy.js'), CustomEvent: class {constructor(type,options){this.type=type;this.detail=options?.detail}}, window:{setInterval(callback){timers.push(callback);return 1},clearInterval(id){clearedTimers.push(id)},addEventListener(name,callback){windowEvents[name]=callback},location:{pathname,replace(url){redirects.push(url)}}} });
  await flush();
  return {nodes,calls,redirects,observer,publications,timers,documentEvents,windowEvents,clearedTimers,firebaseMock, async submit(){for(const cb of nodes['login-form'].events.submit) await cb({preventDefault(){}})} };
}
(async()=>{
  let s = await setup('dashboard'); assert.deepEqual(s.redirects,['login.html']); assert.equal(s.nodes['dashboard-content'].hidden,true);
  s = await setup('dashboard',{email:'registered@example.com',displayName:'Claire Maggay'}); assert.equal(s.nodes['session-name'].textContent,'Claire Maggay'); assert.equal(s.nodes['session-role'].textContent,'Department admin'); assert.equal(s.nodes['session-identity'].hidden,false); assert.equal(s.nodes['dashboard-content'].hidden,false); assert.equal(s.nodes['user-email'].textContent,'registered@example.com'); await s.nodes['sign-out'].events.click[0](); assert.ok(s.redirects.includes('login.html'));
  let finishLogout;
  const pendingLogout = new Promise(resolve => { finishLogout = resolve; });
  s = await setup('dashboard',{email:'registered@example.com'},undefined,undefined,() => pendingLogout);
  const signOutPending = s.nodes['sign-out'].events.click[0]();
  assert.equal(s.nodes['dashboard-content'].hidden,true);
  assert.equal(s.nodes['sign-out'].disabled,true);
  assert.equal(s.nodes['sign-out'].textContent,'Signing out…');
  await s.nodes['sign-out'].events.click[0]();
  assert.equal(s.calls.filter(call => call[0] === 'logout').length,1);
  finishLogout(); await signOutPending;
  assert.ok(s.redirects.includes('login.html'));
  s = await setup('dashboard',{email:'registered@example.com'},undefined,undefined,async () => {throw new Error('storage failed');});
  await s.nodes['sign-out'].events.click[0]();
  assert.equal(s.nodes['sign-out'].disabled,false);
  assert.equal(s.nodes['dashboard-content'].hidden,false);
  assert.match(s.nodes['auth-status'].textContent,/Could not sign out/);
  s = await setup('dashboard',{email:'registered@example.com'},undefined,{}); assert.equal(s.nodes['dashboard-content'].hidden,true); assert.match(s.nodes['auth-status'].textContent,/not been assigned/);
  s = await setup('dashboard',{email:'registered@example.com'},undefined,{role:'regular',approved:true,departments:['tourism'],access:{dashboard:true}}); assert.equal(s.nodes['dashboard-content'].hidden,false);
  const refreshedClaims = {role:'admin',approved:true,departments:['tourism'],access:{dashboard:true,tourism:true},iat:1,exp:2};
  s = await setup('dashboard',{email:'registered@example.com'},undefined,refreshedClaims);
  assert.equal(s.publications.filter(event=>event.type==='dashboard-ready').length,1);
  refreshedClaims.iat=3;refreshedClaims.exp=4;
  s.timers[0]();await flush();await flush();
  s.documentEvents.visibilitychange();await flush();await flush();
  assert.equal(s.publications.filter(event=>event.type==='dashboard-ready').length,1,'token refresh and tab return must not reset editors');
  refreshedClaims.access={tourism:true,dashboard:true};
  s.timers[0]();await flush();await flush();
  assert.equal(s.publications.filter(event=>event.type==='dashboard-ready').length,1,'claim key order must not reset editors');
  refreshedClaims.access.tourism=false;
  s.timers[0]();await flush();await flush();
  assert.equal(s.publications.filter(event=>event.type==='dashboard-ready').length,2,'changed permissions must reach every panel');
  refreshedClaims.approved=false;
  s.timers[0]();await flush();await flush();
  assert.equal(s.publications.at(-1).type,'dashboard-denied');
  assert.equal(s.nodes['dashboard-content'].hidden,true,'revoked access still hides the dashboard');
  for (const claims of [{role:'admin'}, {role:'admin',approved:false,departments:['tourism'],access:{dashboard:true}}, {role:'regular',approved:true,departments:[],access:{dashboard:true}}, {role:'superadmin'}]) {
    s = await setup('dashboard',{email:'registered@example.com'},undefined,claims); assert.equal(s.nodes['dashboard-content'].hidden,true);
  }
  for (const [claims,path] of [
    [{role:'admin',approved:true,departments:['tourism'],access:{dashboard:true}},'department-admin.html'],
    [{role:'regular',approved:true,departments:['tourism'],access:{dashboard:true}},'user-dashboard.html']
  ]) {
    s = await setup('dashboard',{email:'registered@example.com'},undefined,claims,undefined,'/super-admin.html');
    assert.ok(s.redirects.includes(path));
    assert.equal(s.nodes['dashboard-content'].hidden,true);
  }
  // Back/Forward cache must recheck access and restart periodic checks.
  s = await setup('dashboard',{email:'registered@example.com'});
  s.windowEvents.pagehide();
  assert.equal(s.nodes['dashboard-content'].hidden,true);
  assert.equal(s.publications.at(-1).type,'dashboard-denied');
  assert.equal(s.clearedTimers.length,1);
  s.windowEvents.pageshow({persisted:true}); await flush(); await flush();
  assert.equal(s.nodes['dashboard-content'].hidden,false);
  assert.equal(s.timers.length,2,'restored page must resume periodic access checks');
  s.windowEvents.pageshow({persisted:true}); await flush();
  assert.equal(s.timers.length,2,'do not duplicate the refresh timer');
  s.windowEvents.pagehide();
  s.firebaseMock.auth.currentUser=null;
  s.windowEvents.pageshow({persisted:true}); await flush();
  assert.equal(s.nodes['dashboard-content'].hidden,true);
  assert.equal(s.redirects.at(-1),'login.html');

  // A pending check from account A must not block or overwrite account B.
  s = await setup('dashboard',{email:'first@example.com'});
  let finishOldCheck;
  s.firebaseMock.auth.currentUser.getIdTokenResult=()=>new Promise(resolve=>{finishOldCheck=resolve;});
  s.timers[0]();
  const nextUser={uid:'second',email:'second@example.com',getIdTokenResult:async()=>({claims:{role:'regular',approved:true,departments:['tourism'],access:{dashboard:true}}})};
  s.firebaseMock.auth.currentUser=nextUser;
  s.observer(nextUser); await flush(); await flush();
  assert.equal(s.nodes['user-email'].textContent,'second@example.com');
  assert.equal(s.publications.at(-1).detail.user.uid,'second');
  finishOldCheck({claims:{}}); await flush(); await flush();
  assert.equal(s.nodes['dashboard-content'].hidden,false);
  assert.equal(s.publications.at(-1).detail.user.uid,'second');
  s = await setup('login',{email:'registered@example.com'}); assert.deepEqual(s.redirects,['dashboard.html']);
  for(const remember of [false,true]) {
    s = await setup('login'); s.nodes.email.value=' registered@example.com '; s.nodes.password.value='test-only-password'; s.nodes['save-login'].checked=remember; await s.submit();
    assert.equal(s.calls[0][1],remember?'local':'session'); assert.equal(s.calls[1][1],'registered@example.com'); assert.equal(s.calls[1][2],'test-only-password'); assert.equal(s.nodes.password.value,''); assert.ok(s.redirects.includes('dashboard.html'));
  }
  s = await setup('login',null,'auth/invalid-credential'); s.nodes.email.value='registered@example.com'; s.nodes.password.value='wrong'; await s.submit(); assert.equal(s.redirects.length,0); assert.equal(s.nodes['sign-in'].disabled,false); assert.match(s.nodes['auth-status'].textContent,/Check your email and password/);
  console.log('PASS: unauthenticated redirect, authenticated dashboard, existing session, sign-out, both persistence choices, failed login, denied dashboard, assigned dashboard.');
})().catch(error=>{console.error(error);process.exitCode=1});
