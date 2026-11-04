// Attendance is server-only. Biometric assertions and device metadata are client-reported.
module.exports = function attendanceHandlers({auth, db, policy, HttpsError, FieldValue, Timestamp, loginDevice}) {
  const fail = (code,message) => {throw new HttpsError(code,message);};
  const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
  const manager = actor => policy.isSuper(actor) || policy.roleOf(actor) === 'admin';
  async function actorFor(request) {
    if (!request.auth) fail('unauthenticated','Sign in first.');
    const actor = await auth.getUser(request.auth.uid);
    if (actor.disabled || !policy.approvedOf(actor) || (!policy.isSuper(actor) && (!policy.departmentsOf(actor).length || !(policy.accessOf(actor).apps || policy.accessOf(actor).dashboard)))) fail('permission-denied','Approved account access is required.');
    return actor;
  }
  function departmentFor(actor, department) {
    if (!policy.DEPARTMENTS.includes(department) || (!policy.isSuper(actor) && !policy.departmentsOf(actor).includes(department))) fail('permission-denied','Select one of your assigned departments.');
    return department;
  }
  function canManage(actor,department) {
    if (!manager(actor) || !(policy.isSuper(actor) || policy.accessOf(actor).dashboard)) fail('permission-denied','Department administrator dashboard access is required.');
    departmentFor(actor,department);
  }
  const records = department => db.collection('attendance_departments').doc(department).collection('records');
  const ownRecords = uid => db.collection('attendance_users').doc(uid).collection('records');
  const iso = value => value?.toDate().toISOString() || null;
  const publicRecord = (doc,admin) => {
    const value = doc.data();
    const result = {id:doc.id, department:value.department, action:value.action,time:iso(value.time),revision:value.revision,corrected:value.revision>1,voided:value.voided};
    if (admin) Object.assign(result,{ownerUid:value.ownerUid,personName:value.personName,employeeId:value.employeeId,method:value.method,device:value.device,recordedAt:iso(value.recordedAt),original:value.original,operatorUid:value.operatorUid});
    return result;
  };
  function timestamp(text) {
    if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(text) || !Number.isFinite(Date.parse(text))) fail('invalid-argument','Enter a valid date and time.');
    return Timestamp.fromDate(new Date(text));
  }
  async function recordAttendance(request) {
    const actor = await actorFor(request), input = request.data || {};
    if (!policy.isSuper(actor) && !(policy.accessOf(actor).apps && actor.customClaims?.access?.attendance === true)) fail('permission-denied','Mobile app and Attendance access are required.');
    if (!id(input.id) || !id(input.ownerUid) || !['in','out'].includes(input.action) || !['device_biometric','local_face'].includes(input.method)) fail('invalid-argument','Invalid attendance record.');
    if ((input.method === 'local_face' && !manager(actor)) || input.ownerUid !== actor.uid && (!manager(actor) || input.method !== 'local_face')) fail('permission-denied','You can only record your own attendance.');
    const target = input.ownerUid === actor.uid ? actor : await auth.getUser(input.ownerUid);
    if (target.disabled || !policy.approvedOf(target) || (input.ownerUid !== actor.uid && policy.roleOf(target)!=='regular')) fail('permission-denied','Select an approved employee.');
    const department = policy.departmentsOf(target)[0];
    if (!department) fail('failed-precondition','The employee needs an assigned department.');
    departmentFor(actor,department);
    if (typeof input.employeeId !== 'string' || !input.employeeId.trim() || input.employeeId.length>100) fail('invalid-argument','Enter a valid employee ID.');
    const time = timestamp(input.time);
    if (Date.parse(input.time)>Date.now()+60000 || Date.parse(input.time)<Date.now()-366*86400000) fail('invalid-argument','Attendance time is outside the supported range.');
    const device=loginDevice(input.device);
    if (!['android','ios'].includes(device.platform) || !device.model || !device.osVersion) fail('invalid-argument','Device model and OS version are required.');
    const ref=records(department).doc(input.id), own=ownRecords(target.uid).doc(input.id);
    const state=db.collection('attendance_users').doc(target.uid);
    await db.runTransaction(async tx=>{
      const existing=await tx.get(ref), ownExisting=await tx.get(own), latest=await tx.get(state);
      if(existing.exists || ownExisting.exists){const saved=ownExisting.exists?ownExisting.data():existing.data();if(saved.ownerUid!==target.uid || saved.operatorUid!==actor.uid || saved.original.action!==input.action || saved.original.time!==new Date(input.time).toISOString())fail('already-exists','Attendance ID already exists with different information.');return;}
      const last=latest.data();
      if ((last?.action || 'out')===input.action || (last?.time && Date.parse(input.time)<=last.time.toDate().getTime())) fail('failed-precondition','Attendance sequence changed. Refresh records before trying again.');
      const value={ownerUid:target.uid,operatorUid:actor.uid,department,personName:target.displayName||target.email||'Employee',employeeId:input.employeeId.trim(),action:input.action,time,device,method:input.method,verificationSource:'client_reported',recordedAt:FieldValue.serverTimestamp(),revision:1,voided:false,original:{action:input.action,time:new Date(input.time).toISOString()}};
      tx.set(ref,value);tx.set(own,value);tx.set(state,{action:input.action,time,lastId:input.id,department});
    });
    return {recorded:true};
  }
  async function listAttendance(request) {
    const actor=await actorFor(request), input=request.data||{};
    const admin=manager(actor) && input.scope!=='mine';
    let collection;
    if(admin){canManage(actor,input.department);collection=records(input.department);}
    else collection=ownRecords(actor.uid);
    let query=collection.orderBy('recordedAt','desc');
    if(input.cursor){if(!id(input.cursor))fail('invalid-argument','Invalid cursor.');const cursor=await collection.doc(input.cursor).get();if(!cursor.exists)fail('invalid-argument','Refresh attendance.');query=query.startAfter(cursor);}
    const page=await query.limit(51).get(), docs=page.docs.slice(0,50);
    const state = !admin ? await db.collection('attendance_users').doc(actor.uid).get() : null;
    return {records:docs.map(doc=>publicRecord(doc,admin)),cursor:page.docs.length>50?docs.at(-1).id:null,canEdit:admin,nextAction:!admin?(state?.data()?.action==='in'?'out':'in'):null};
  }
  async function editAttendance(request) {
    const actor=await actorFor(request), input=request.data||{};
    canManage(actor,input.department);
    if(!id(input.id)||!Number.isSafeInteger(input.revision)||!['in','out'].includes(input.action)||typeof input.voided!=='boolean'||typeof input.reason!=='string'||input.reason.trim().length<5||input.reason.length>1000)fail('invalid-argument','Enter a correction and a reason (5–1000 characters).');
    const time=timestamp(input.time);
    if(Date.parse(input.time)>Date.now()+60000)fail('invalid-argument','Attendance cannot be in the future.');
    const ref=records(input.department).doc(input.id), audit=ref.collection('changes').doc();
    await db.runTransaction(async tx=>{
      const doc=await tx.get(ref);if(!doc.exists)fail('not-found','Attendance record not found.');
      const before=doc.data();if(before.revision!==input.revision)fail('aborted','Another administrator changed this record. Reload before editing.');
      const stateRef=db.collection('attendance_users').doc(before.ownerUid), state=await tx.get(stateRef);
      const after={...before,action:input.action,time,voided:input.voided,revision:before.revision+1,updatedAt:FieldValue.serverTimestamp()};
      const change={actorUid:actor.uid,actorName:actor.displayName||actor.email||'Administrator',reason:input.reason.trim(),changedAt:FieldValue.serverTimestamp(),before:{action:before.action,time:iso(before.time),voided:before.voided,revision:before.revision},after:{action:input.action,time:new Date(input.time).toISOString(),voided:input.voided,revision:after.revision}};
      tx.set(ref,after);tx.set(ownRecords(before.ownerUid).doc(input.id),after);tx.set(audit,change);
      // Corrections never rewrite biometric/device evidence. A void latest event
      // requires an administrator to correct the sequence before the next scan.
      if(state.data()?.lastId===input.id)tx.set(stateRef,{...state.data(),action:input.voided?'out':input.action,time});
      tx.set(db.collection('account_history').doc(before.ownerUid).collection('events').doc(),{type:'attendance_corrected',status:'completed',source:'dashboard',actorUid:actor.uid,actorName:change.actorName,departments:[input.department],occurredAt:FieldValue.serverTimestamp(),changes:[{field:'attendance',before:change.before,after:change.after}],reason:change.reason,attendanceId:input.id});
    });
    return {saved:true};
  }
  async function listAttendanceChanges(request) {
    const actor=await actorFor(request),input=request.data||{};canManage(actor,input.department);
    if(!id(input.id))fail('invalid-argument','Select a record.');
    const ref=records(input.department).doc(input.id),doc=await ref.get();if(!doc.exists)fail('not-found','Attendance record not found.');
    let query=ref.collection('changes').orderBy('changedAt','desc');
    if(input.cursor){if(!id(input.cursor))fail('invalid-argument','Invalid cursor.');const cursor=await ref.collection('changes').doc(input.cursor).get();if(!cursor.exists)fail('invalid-argument','Refresh history.');query=query.startAfter(cursor);}
    const page=await query.limit(51).get(),docs=page.docs.slice(0,50);
    return {changes:docs.map(d=>({id:d.id,...d.data(),changedAt:iso(d.data().changedAt)})),cursor:page.docs.length>50?docs.at(-1).id:null};
  }
  return {recordAttendance,listAttendance,editAttendance,listAttendanceChanges};
};
