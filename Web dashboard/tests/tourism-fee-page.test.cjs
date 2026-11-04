const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const policy = require('../dashboard-policy');
const source=fs.readFileSync('tourism-fee-page.js','utf8')
 .replace("import('./firebase-client.js')",'Promise.resolve({auth:{app:{}}})')
 .replace("import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')",'Promise.resolve(functionsMock)');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(uid,claims,respond=async(name,data)=>({data:name==='getTourismFee'?{rate:{rateId:'rate1',feePerPersonCentavos:15050}}:{rate:{rateId:'rate2',...data}}})) {
 const nodes={},events={},calls=[];
 for(const id of ['tourism-fee-panel','tourism-fee-input','tourism-fee-status','tourism-current-fee','save-tourism-fee','refresh-tourism-fee','tourism-fee-form']) nodes[id]={value:'',textContent:'',hidden:true,events:{},addEventListener(name,cb){this.events[name]=cb;}};
 const document={querySelector:s=>nodes[s.slice(1)],addEventListener:(name,cb)=>events[name]=cb};
 vm.runInNewContext(source,{document,DashboardPolicy:policy,Number,JSON,window:{dashboardSession:{user:{uid},claims},addEventListener(){}},functionsMock:{getFunctions:()=>({}),httpsCallable:(_,name)=>async data=>{calls.push({name,data});return respond(name,data);}}});
 return {nodes,events,calls,submit:()=>nodes['tourism-fee-form'].events.submit({preventDefault(){}})};
}
const tourism={role:'admin',approved:true,departments:['tourism'],access:{dashboard:true,tourism:true}};
test('Tourism admins and protected root see fee settings; other accounts do not',async()=>{
 for(const [uid,claims,allowed] of [['tourism',tourism,true],[policy.superUid,{role:'superadmin'},true],['regular',{...tourism,role:'regular'},false],['rhu',{...tourism,departments:['rhu']},false],['unapproved',{...tourism,approved:false},false],['imposter',{role:'superadmin'},false]]) {
  const s=setup(uid,claims);await flush();assert.equal(s.nodes['tourism-fee-panel'].hidden,!allowed);assert.equal(s.calls.length,allowed?1:0);
 }
});
test('fee input sends exact centavos, supports zero and rejects extra decimals',async()=>{
 const s=setup('tourism',tourism);await flush();
 assert.equal(s.nodes['tourism-fee-input'].value,'150.50');
 s.nodes['tourism-fee-input'].value='50.05';await s.submit();
 assert.equal(s.calls.at(-1).data.feePerPersonCentavos,5005);
 s.nodes['tourism-fee-input'].value='0';await s.submit();assert.equal(s.calls.at(-1).data.feePerPersonCentavos,0);
 const count=s.calls.length;
 for(const value of ['1.005','-1','NaN','1000000.01']) {s.nodes['tourism-fee-input'].value=value;await s.submit();}
 assert.equal(s.calls.length,count);
});
test('no declared fee is distinct from free admission, and sign-out clears settings',async()=>{
 const s=setup('tourism',tourism,async()=>({data:{rate:null}}));await flush();
 assert.match(s.nodes['tourism-current-fee'].textContent,/No fee has been declared/);
 assert.equal(s.nodes['tourism-fee-input'].value,'');
 s.events['dashboard-denied']();assert.equal(s.nodes['tourism-fee-panel'].hidden,true);
});
