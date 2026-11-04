const {initializeTestEnvironment,assertSucceeds,assertFails} = require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc,serverTimestamp,Timestamp} = require('firebase/firestore');
const fs = require('node:fs');
(async()=>{
  const rulesPath = process.env.TOURISM_RULES_FILE || require('node:path').resolve(__dirname,'../firestore.rules');
  const env = await initializeTestEnvironment({projectId:'demo-tourism-fees',firestore:{rules:fs.readFileSync(rulesPath,'utf8')}});
  try {
    await env.withSecurityRulesDisabled(async context=>{
      const db=context.firestore();
      await setDoc(doc(db,'department_settings/tourism'),{rateId:'new-rate',feePerPersonCentavos:5000});
      await setDoc(doc(db,'tourism_fee_rates/old-rate'),{feePerPersonCentavos:15050});
      await setDoc(doc(db,'tourism_fee_rates/new-rate'),{feePerPersonCentavos:5000});
    });
    const claims={role:'regular',approved:true,departments:['tourism'],access:{apps:true,tourism:true}};
    const db=env.authenticatedContext('worker',claims).firestore();
    const foreign=env.authenticatedContext('rhu-worker',{...claims,departments:['rhu']}).firestore();
    const signedOut=env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db,'department_settings/tourism')));
    await assertFails(getDoc(doc(foreign,'department_settings/tourism')));
    await assertFails(getDoc(doc(signedOut,'department_settings/tourism')));
    await assertFails(setDoc(doc(db,'department_settings/tourism'),{feePerPersonCentavos:1}));
    await assertFails(setDoc(doc(db,'tourism_fee_rates/old-rate'),{feePerPersonCentavos:1}));
    const legacy={ownerId:'worker',name:'Ana',plateNumber:'',fee:150.5,photos:{},createdAt:Timestamp.fromDate(new Date('2026-10-01T00:00:00Z')),uploadedAt:serverTimestamp()};
    await assertSucceeds(setDoc(doc(db,'tourism_records/legacy-queued'),legacy));
    const group={...legacy,company:'Company A',touristCount:3,feeRateId:'old-rate',feePerPersonCentavos:15050,feeTotalCentavos:45150,fee:451.5};
    await assertSucceeds(setDoc(doc(db,'tourism_records/group'),group));
    await assertSucceeds(setDoc(doc(db,'tourism_records/group'),group));
    await assertSucceeds(getDoc(doc(db,'tourism_records/group')));
    const other=env.authenticatedContext('other',claims).firestore();
    await assertFails(getDoc(doc(other,'tourism_records/group')));
    for (const [id,change] of Object.entries({wrongtotal:{feeTotalCentavos:1},wrongpesos:{fee:1},zerocount:{touristCount:0},fractional:{touristCount:1.5},toomany:{touristCount:1001},forgedrate:{feePerPersonCentavos:1,feeTotalCentavos:3,fee:0.03},missingrate:{feeRateId:'missing'},partial:{feeRateId:null},wrongowner:{ownerId:'other'}})) {
      await assertFails(setDoc(doc(db,'tourism_records/'+id),{...group,...change}));
    }
    await assertFails(setDoc(doc(db,'tourism_records/group'),{...group,ownerId:'other'}));
    // Fresh UIDs exercise the same policy as existing accounts, with no per-user grants.
    for (const uid of ['existing-tourism-user', 'new-tourism-user']) {
      const staff = env.authenticatedContext(uid, claims).firestore();
      await assertSucceeds(getDoc(doc(staff,'department_settings/tourism')));
      await assertSucceeds(setDoc(doc(staff,'tourism_records/'+uid),{...group,ownerId:uid}));
    }
    for (const change of [{approved:false}, {departments:[]}, {access:{apps:false,tourism:true}}, {access:{apps:true,tourism:false}}]) {
      const denied = env.authenticatedContext('restricted-tourism',{...claims,...change}).firestore();
      await assertFails(getDoc(doc(denied,'department_settings/tourism')));
      await assertFails(setDoc(doc(denied,'tourism_records/restricted'),{...group,ownerId:'restricted-tourism'}));
    }
    // The targeted production candidate deliberately preserves older RHU rules.
    // Full department-isolation checks apply to the broader local rules only.
    const departments = process.env.TOURISM_RULES_FILE ? [] : ['tourism','engineering','rhu','mswd','treasurer','hrmo','mao','attendance'];
    for (const department of departments) {
      for (const prefix of ['existing', 'new']) {
        const uid = `${prefix}-${department}`;
        const staff = env.authenticatedContext(uid,{role:'regular',approved:true,departments:[department],access:{apps:true,[department]:true,patients:true,pharmacy:true}}).firestore();
        const visit = {ownerId:uid,patientNumber:'P1',patientName:'Patient',doctorName:'Doctor',notes:'',checkedAt:legacy.createdAt,createdAt:legacy.createdAt,uploadedAt:serverTimestamp()};
        const medicine = {ownerId:uid,name:'Medicine',strength:'10 mg',quantity:1,revision:'r1',createdAt:legacy.createdAt,updatedAt:legacy.createdAt,uploadedAt:serverTimestamp()};
        const expect = department === 'rhu' ? assertSucceeds : assertFails;
        await expect(setDoc(doc(staff,'patient_records/'+uid),visit));
        await expect(setDoc(doc(staff,'pharmacy_inventory/'+uid),medicine));
        if (department === 'rhu') {
          await assertSucceeds(getDoc(doc(staff,'patient_records/'+uid)));
          await assertSucceeds(getDoc(doc(staff,'pharmacy_inventory/'+uid)));
          await assertFails(getDoc(doc(staff,'patient_records/existing-rhu-other')));
        }
        if (department !== 'tourism') await assertFails(getDoc(doc(staff,'department_settings/tourism')));
      }
    }
    console.log('PASS: Tourism rules preserve legacy queued records, immutable approved historical rates, exact group totals and ownership; settings writes and invalid fees are denied.');
  } finally {await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
