const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const policy = require('./access-policy');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const functionsV1 = require('firebase-functions/v1');
const { snapshot, differences, loginDevice, canReadHistory, canReadEvent } = require('./audit-policy');
initializeApp();
const auth = getAuth();
const db = getFirestore();
const eventsFor = uid => db.collection('account_history').doc(uid).collection('events');
async function beginChange(actor, uid, type, before) {
  const ref = eventsFor(uid).doc();
  await ref.set({type, actorUid: actor.uid, actorEmail: actor.email || '', actorName: actor.displayName || '', source: 'dashboard',
    actorRole: policy.roleOf(actor), actorDepartments: policy.departmentsOf(actor), occurredAt: FieldValue.serverTimestamp(), status: 'pending', before});
  return ref;
}
async function finishChange(ref, before, user, passwordChanged, status) {
  const after = snapshot(user);
  await ref.update({status, after, changes: differences(before, after, passwordChanged), completedAt: FieldValue.serverTimestamp()});
}
// Existing deployed region and instance cap; no database or bucket provisioning.
const options = { region: 'asia-southeast1', maxInstances: 2, timeoutSeconds: 30 };
async function actorFor(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  // Re-read current claims so demoted/disabled managers cannot use stale tokens.
  const actor = await auth.getUser(request.auth.uid);
  policy.assertManager(actor);
  return actor;
}
function callable(handler) {
  return onCall(options, async request => {
    try { return await handler(request); }
    catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error instanceof policy.PolicyError) throw new HttpsError(error.code, error.message);
      const messages = {
        'auth/email-already-exists': ['already-exists', 'This email is already registered.'],
        'auth/user-not-found': ['not-found', 'The user no longer exists.'],
        'auth/invalid-password': ['invalid-argument', 'This password does not meet the password policy.'],
        'auth/invalid-email': ['invalid-argument', 'Enter a valid email address.'],
        'auth/claims-too-large': ['invalid-argument', 'Account permissions exceed the allowed size.']
      };
      const mapped = messages[error.code];
      if (mapped) throw new HttpsError(...mapped);
      // Never log request data, passwords, or complete Auth user records.
      throw new HttpsError('internal', 'The operation could not be completed. Refresh users before retrying.');
    }
  });
}
exports.listDashboardUsers = callable(async request => {
  const actor = await actorFor(request);
  const token = request.data?.pageToken;
  if (token !== undefined && (typeof token !== 'string' || token.length > 2048)) throw new HttpsError('invalid-argument', 'Invalid page token.');
  const result = await auth.listUsers(100, token || undefined);
  const users = result.users.filter(user => policy.canSee(actor, user));
  return { users: users.map(policy.publicUser), pageToken: result.pageToken || null };

});
exports.createDashboardUser = callable(async request => {
  const actor = await actorFor(request);
  const input = policy.validateInput(request.data, true);
  policy.assertCanManage(actor, null, input);
  // Keep a new account disabled until its least-privilege claims are assigned.
  const user = await auth.createUser({ email: input.email, password: input.password, displayName: input.username, disabled: true });
  let record;
  try {
    record = await beginChange(actor, user.uid, 'account_created', null);
    await auth.setCustomUserClaims(user.uid, policy.claimsFor(actor, null, input));
    await auth.updateUser(user.uid, { disabled: input.disabled });
  } catch (error) {
    await auth.deleteUser(user.uid).catch(() => {});
    if (record) await record.update({status: 'failed'}).catch(() => {});
    throw error;
  }
  const created = await auth.getUser(user.uid);
  await finishChange(record, null, created, false, 'completed');
  return { user: policy.publicUser(created) };
});
exports.updateDashboardUser = callable(async request => {
  const actor = await actorFor(request);
  const input = policy.validateInput(request.data, false);
  const target = await auth.getUser(input.uid);
  policy.assertCanManage(actor, target, input);
  const before = snapshot(target);
  const record = await beginChange(actor, target.uid, 'account_updated', before);
  let passwordChanged = false;
  try {
    await auth.setCustomUserClaims(target.uid, policy.claimsFor(actor, target, input));
    await auth.updateUser(target.uid, { email: input.email, displayName: input.username,
      disabled: input.disabled, ...(input.password ? { password: input.password } : {}) });
    passwordChanged = !!input.password;
    await auth.revokeRefreshTokens(target.uid);
  } catch (error) {
    await finishChange(record, before, await auth.getUser(target.uid), passwordChanged, 'partial_or_failed');
    throw error;
  }
  const updated = await auth.getUser(target.uid);
  await finishChange(record, before, updated, passwordChanged, 'completed');
  return { user: policy.publicUser(updated) };
});

// Client rules grant no access to this collection. All reads and writes use
// the backend; current manager permissions and event departments scope every read.
exports.listAccountHistory = callable(async request => {
  const actor = await actorFor(request);
  const { uid, cursor } = request.data || {};
  if (typeof uid !== 'string' || !uid || uid.length > 128 || uid.includes('/')) throw new HttpsError('invalid-argument', 'Select an account.');
  if (cursor !== undefined && (typeof cursor !== 'string' || !cursor || cursor.length > 128 || cursor.includes('/'))) throw new HttpsError('invalid-argument', 'Invalid history cursor.');
  const target = await auth.getUser(uid);
  if (!canReadHistory(actor, target)) throw new HttpsError('permission-denied', 'History is limited to your department’s regular users and your own account.');
  let query = eventsFor(uid).orderBy('occurredAt', 'desc');
  if (cursor) {
    const doc = await eventsFor(uid).doc(cursor).get();
    if (!doc.exists) throw new HttpsError('invalid-argument', 'Refresh account history.');
    query = query.startAfter(doc);
  }
  const result = await query.limit(51).get();
  const docs = result.docs.slice(0, 50);
  return { events: docs.filter(doc => canReadEvent(actor,doc.data())).map(doc => {
    const value = doc.data();
    return {id: doc.id, ...value, occurredAt: value.occurredAt?.toDate().toISOString() || null,
      completedAt: value.completedAt?.toDate().toISOString() || null};
  }), cursor: result.docs.length > 50 ? docs.at(-1).id : null };
});

exports.recordAccountLogin = callable(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const user = await auth.getUser(request.auth.uid);
  if (user.disabled) throw new HttpsError('permission-denied', 'Account disabled.');
  const seconds = request.auth.token.auth_time;
  if (!Number.isSafeInteger(seconds) || seconds <= 0) throw new HttpsError('unauthenticated', 'Sign in again.');
  const source = request.data?.source;
  if (!['dashboard', 'mobile'].includes(source)) throw new HttpsError('invalid-argument', 'Invalid login source.');
  const device = loginDevice(request.data?.device);
  // Token auth_time comes from Firebase. Session refreshes and retries do not
  // invent additional logins. No password or token is saved.
  const ref = eventsFor(user.uid).doc(`login-${seconds}`);
  await db.runTransaction(async transaction => {
    const existing = await transaction.get(ref);
    if (!existing.exists) transaction.set(ref, {type: 'login', status: 'completed', source,
      actorUid: user.uid, actorEmail: user.email || '', departments: policy.departmentsOf(user), device, deviceReportedBy: 'client', occurredAt: Timestamp.fromMillis(seconds * 1000),
      recordedAt: FieldValue.serverTimestamp(), changes: []});
  });
  return { recorded: true };
});

// Auth creation triggers also capture registrations from older mobile builds.
exports.recordAccountRegistration = functionsV1.region('asia-southeast1')
  .runWith({maxInstances: 2}).auth.user().onCreate(async user => {
    const ref = eventsFor(user.uid).doc('registration');
    await db.runTransaction(async transaction => {
      const existing = await transaction.get(ref);
      if (!existing.exists) transaction.set(ref, {type: 'registered', status: 'completed', source: 'firebase_auth',
        actorUid: user.uid, actorEmail: user.email || '', changes: [],
        occurredAt: Timestamp.fromDate(new Date(user.metadata.creationTime)), recordedAt: FieldValue.serverTimestamp()});
    });
  });

async function tourismManager(request) {
  const actor = await actorFor(request);
  if (!policy.isSuper(actor) && (!policy.departmentsOf(actor).includes('tourism') || !policy.accessOf(actor).tourism)) {
    throw new HttpsError('permission-denied', 'Tourism administrator access is required.');
  }
  return actor;
}
exports.getTourismFee = callable(async request => {
  await tourismManager(request);
  const doc = await db.collection('department_settings').doc('tourism').get();
  const data = doc.data();
  return { rate: doc.exists ? {rateId: data.rateId, feePerPersonCentavos: data.feePerPersonCentavos,
    updatedAt: data.updatedAt?.toDate().toISOString() || null} : null };
});
exports.setTourismFee = callable(async request => {
  const actor = await tourismManager(request);
  const amount = request.data?.feePerPersonCentavos;
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100000000 ||
    Object.keys(request.data || {}).some(key => key !== 'feePerPersonCentavos')) {
    throw new HttpsError('invalid-argument', 'Enter a fee from ₱0 to ₱1,000,000 with up to two decimal places.');
  }
  const config = db.collection('department_settings').doc('tourism');
  const rate = db.collection('tourism_fee_rates').doc();
  const audit = eventsFor(actor.uid).doc();
  await db.runTransaction(async transaction => {
    const previous = await transaction.get(config);
    const before = previous.data()?.feePerPersonCentavos ?? null;
    const value = {feePerPersonCentavos: amount, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid};
    transaction.set(rate, value);
    transaction.set(config, {...value, rateId: rate.id});
    transaction.set(audit, {type: 'tourism_fee_changed', status: 'completed', source: 'dashboard',
      actorUid: actor.uid, actorEmail: actor.email || '', actorName: actor.displayName || '', actorRole: policy.roleOf(actor), departments:['tourism'], occurredAt: FieldValue.serverTimestamp(),
      changes: [{field: 'feePerPersonCentavos', before, after: amount}]});
  });
  return {rate: {rateId: rate.id, feePerPersonCentavos: amount}};
});

// Department reporting reads only the collection populated by the Flutter app.
exports.listTourismRecords = callable(async request => {
  await tourismManager(request);
  const {from, to, cursor} = request.data || {};
  const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDay(from) || !validDay(to) || from > to ||
      Date.parse(to) - Date.parse(from) > 366 * 86400000 ||
      cursor !== undefined && (typeof cursor !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(cursor))) {
    throw new HttpsError('invalid-argument', 'Select a valid date range of at most 367 days.');
  }
  const start = new Date(`${from}T00:00:00+08:00`);
  const end = new Date(new Date(`${to}T00:00:00+08:00`).valueOf() + 86400000);
  const collection = db.collection('tourism_records');
  let query = collection.where('createdAt', '>=', Timestamp.fromDate(start))
    .where('createdAt', '<', Timestamp.fromDate(end)).orderBy('createdAt', 'desc').orderBy('__name__', 'desc');
  if (cursor) {
    const previous = await collection.doc(cursor).get();
    if (!previous.exists) throw new HttpsError('failed-precondition', 'Records changed. Refresh the report.');
    query = query.startAfter(previous);
  }
  const result = await query.limit(101).get();
  const docs = result.docs.slice(0, 100);
  const fields = ['ownerId', 'name', 'company', 'destination', 'plateNumber', 'touristCount', 'fee',
    'feePerPersonCentavos', 'feeTotalCentavos'];
  return {records: docs.map(doc => {
    const data = doc.data(), row = {id: doc.id};
    for (const field of fields) if (data[field] !== undefined) row[field] = data[field];
    for (const field of ['createdAt', 'uploadedAt']) row[field] = data[field]?.toDate?.().toISOString() || null;
    return row;
  }), cursor: result.docs.length > 100 ? docs.at(-1).id : null};
});

// Department communications are server-only. No direct client collection access.
async function workspaceUser(request) {
  if (!request.auth) throw new HttpsError('unauthenticated','Sign in first.');
  const user = await auth.getUser(request.auth.uid);
  policy.assertWorkspaceMember(user,request.data?.department);
  return user;
}
function communicationCollection(department,kind,uid) {
  const workspace = db.collection('department_workspaces').doc(department);
  return kind === 'announcements' ? workspace.collection('announcements') : workspace.collection(kind).doc(uid).collection('messages');
}
exports.publishDepartmentUpdate = callable(async request => {
  const actor = await workspaceUser(request);
  policy.assertManager(actor);
  const {department, text, recipientUid} = request.data || {};
  if (typeof text !== 'string' || !text.trim() || text.trim().length > 3000 || Object.keys(request.data).some(key=>!['department','text','recipientUid'].includes(key))) throw new HttpsError('invalid-argument','Enter a message of 1–3000 characters.');
  let recipient = null;
  if (recipientUid !== undefined && recipientUid !== '') {
    if (typeof recipientUid !== 'string' || recipientUid.includes('/') || recipientUid.length > 128) throw new HttpsError('invalid-argument','Select a recipient.');
    recipient = await auth.getUser(recipientUid);
    if (recipient.disabled || !policy.departmentsOf(recipient).includes(department) || !policy.isSuper(actor) && !policy.canSee(actor,recipient)) throw new HttpsError('permission-denied','Select a user within your department.');
  }
  const kind = recipient ? 'inboxes' : 'announcements';
  const ref = communicationCollection(department,kind,recipient?.uid).doc();
  const audit = eventsFor(actor.uid).doc();
  const value = {text:text.trim(),department,authorUid:actor.uid,authorName:actor.displayName || actor.email || 'Administrator',authorRole:policy.roleOf(actor),recipientUid:recipient?.uid || '',recipientName:recipient?.displayName || recipient?.email || '',createdAt:FieldValue.serverTimestamp()};
  await db.runTransaction(async transaction => {
    transaction.set(ref,value);
    if (recipient) transaction.set(communicationCollection(department,'sent',actor.uid).doc(ref.id),value);
    transaction.set(audit,{type:recipient ? 'department_message_sent' : 'department_announcement_published',status:'completed',source:'workspace',actorUid:actor.uid,actorEmail:actor.email || '',actorName:actor.displayName || '',departments:[department],occurredAt:FieldValue.serverTimestamp(),changes:[{field:'communication',before:null,after:{id:ref.id,department,recipientUid:recipient?.uid || ''}}]});
  });
  return {id:ref.id};
});
exports.listDepartmentUpdates = callable(async request => {
  const actor = await workspaceUser(request);
  const {department, kind = 'announcements', cursor} = request.data;
  if (!['announcements','inboxes','sent'].includes(kind) || cursor !== undefined && (typeof cursor !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(cursor))) throw new HttpsError('invalid-argument','Invalid message list.');
  if (kind === 'sent') policy.assertManager(actor);
  const collection = communicationCollection(department,kind,actor.uid);
  let query = collection.orderBy('createdAt','desc');
  if (cursor) {
    const doc = await collection.doc(cursor).get();
    if (!doc.exists) throw new HttpsError('invalid-argument','Refresh messages.');
    query = query.startAfter(doc);
  }
  const result = await query.limit(31).get();
  return {items:result.docs.slice(0,30).map(doc=>({id:doc.id,...doc.data(),createdAt:doc.data().createdAt?.toDate().toISOString() || null})),cursor:result.docs.length > 30 ? result.docs[29].id : null};
});

// Public onboarding content is deliberately separate from signed-in inboxes.
async function introSuper(request){
  if(!request.auth)throw new HttpsError('unauthenticated','Sign in first.');
  const actor=await auth.getUser(request.auth.uid);
  require('./intro-policy').assertSuper(actor);
  return actor;
}
exports.getIntroPages=callable(async()=>{
  const pages=await Promise.all(['page1','page2'].map(async page=>{
    const doc=await db.collection('intro_pages').doc(page).get();
    const data=doc.data()||{};
    return {page,title:data.title||'',text:data.text||'',imageUrl:data.imageUrl||'',version:data.version||0};
  }));
  return {pages};
});
exports.saveIntroPage=callable(async request=>{
  const actor=await introSuper(request);
  const {pageInput,decodeImage}=require('./intro-policy');
  const input=pageInput(request.data);
  const ref=db.collection('intro_pages').doc(input.page),audit=eventsFor(actor.uid).doc();
  let file=null,newImage=null,oldImagePath=null;
  if(input.imageBase64!==undefined){
    const image=decodeImage(input.imageBase64);
    const {randomUUID}=require('node:crypto');
    const id=randomUUID(),token=randomUUID();
    const bucket=require('firebase-admin/storage').getStorage().bucket('loginsept162026.firebasestorage.app');
    const path=`intro_content/${input.page}/${id}.${image.type}`;
    file=bucket.file(path);
    await file.save(image.bytes,{resumable:false,metadata:{contentType:image.contentType,cacheControl:'public,max-age=31536000,immutable',metadata:{firebaseStorageDownloadTokens:token}}});
    newImage={imagePath:path,imageUrl:`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`};
  }
  try{
    await db.runTransaction(async transaction=>{
      const current=await transaction.get(ref),before=current.data()||{};
      if((before.version||0)!==input.version)throw new HttpsError('aborted','This page changed on another device. Reload the page before saving.');
      oldImagePath=before.imagePath||null;
      const image=input.removeImage?{imagePath:'',imageUrl:''}:newImage||{imagePath:before.imagePath||'',imageUrl:before.imageUrl||''};
      const after={title:input.title,text:input.text,...image,version:input.version+1,updatedBy:actor.uid,updatedAt:FieldValue.serverTimestamp()};
      transaction.set(ref,after);
      transaction.set(audit,{type:'intro_page_updated',source:'intro_editor',status:'completed',actorUid:actor.uid,actorEmail:actor.email||'',occurredAt:FieldValue.serverTimestamp(),changes:[{field:input.page,before:{title:before.title||'',text:before.text||'',hasImage:!!before.imagePath,version:before.version||0},after:{title:after.title,text:after.text,hasImage:!!after.imagePath,pictureChanged:!!newImage||input.removeImage===true,version:after.version}}]});
    });
  }catch(error){if(file)await file.delete().catch(()=>{});throw error;}
  if(oldImagePath&&(newImage||input.removeImage))await require('firebase-admin/storage').getStorage().bucket('loginsept162026.firebasestorage.app').file(oldImagePath).delete().catch(()=>{});
  return {saved:true,version:input.version+1};
});
exports.publishIntroNotice=callable(async request=>{
  const actor=await introSuper(request);
  const {text,recipientUid='',kind='announcement'}=request.data||{};
  if(Object.keys(request.data||{}).some(k=>!['text','recipientUid','kind'].includes(k))||typeof text!=='string'||!text.trim()||text.trim().length>3000||!['announcement','instruction'].includes(kind)||typeof recipientUid!=='string'||recipientUid.length>128||recipientUid.includes('/'))throw new HttpsError('invalid-argument','Enter a notice of 1–3000 characters and select a valid audience.');
  if(recipientUid){const target=await auth.getUser(recipientUid);if(target.disabled)throw new HttpsError('failed-precondition','This account is disabled.');}
  const collection=recipientUid?db.collection('intro_inboxes').doc(recipientUid).collection('messages'):db.collection('intro_broadcasts');
  const ref=collection.doc(),audit=eventsFor(actor.uid).doc();
  const value={text:text.trim(),kind,authorName:actor.displayName||'Super Admin',createdAt:FieldValue.serverTimestamp()};
  await db.runTransaction(async transaction=>{
    transaction.set(ref,value);
    transaction.set(db.collection('intro_sent').doc(actor.uid).collection('messages').doc(ref.id),{...value,recipientUid});
    transaction.set(audit,{type:'intro_notice_published',source:'intro_editor',status:'completed',actorUid:actor.uid,actorEmail:actor.email||'',occurredAt:FieldValue.serverTimestamp(),changes:[{field:'intro_notice',before:null,after:{id:ref.id,recipientUid,kind}}]});
  });
  return {id:ref.id};
});
exports.listIntroNotices=callable(async request=>{
  const {audience='all',cursor}=request.data||{};
  if(!['all','mine','sent'].includes(audience)||cursor!==undefined&&(typeof cursor!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(cursor)))throw new HttpsError('invalid-argument','Invalid notice list.');
  let collection;
  if(audience==='all')collection=db.collection('intro_broadcasts');
  else{
    if(!request.auth)throw new HttpsError('unauthenticated','Sign in to read personal notices.');
    const actor=await auth.getUser(request.auth.uid);
    if(actor.disabled)throw new HttpsError('permission-denied','Account disabled.');
    if(audience==='sent')require('./intro-policy').assertSuper(actor);
    collection=db.collection(audience==='sent'?'intro_sent':'intro_inboxes').doc(actor.uid).collection('messages');
  }
  let query=collection.orderBy('createdAt','desc');
  if(cursor){const previous=await collection.doc(cursor).get();if(!previous.exists)throw new HttpsError('invalid-argument','Refresh notices.');query=query.startAfter(previous);}
  const result=await query.limit(21).get();
  return {items:result.docs.slice(0,20).map(doc=>({id:doc.id,...doc.data(),createdAt:doc.data().createdAt?.toDate().toISOString()||null})),cursor:result.docs.length>20?result.docs[19].id:null};
});

// Server-only destination catalog. Existing record text is never rewritten.
function tourismCatalogManager(user) {
  return policy.isSuper(user) || policy.roleOf(user) === 'admin';
}
function tourismCatalogMember(user) {
  const access = policy.accessOf(user);
  return !user.disabled && (policy.isSuper(user) || policy.approvedOf(user) &&
    policy.departmentsOf(user).includes('tourism') && access.tourism && (access.apps || access.dashboard));
}
async function tourismCatalogActor(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const user = await auth.getUser(request.auth.uid);
  if (!tourismCatalogMember(user)) throw new HttpsError('permission-denied', 'Approved Tourism access is required.');
  return user;
}
const catalogRef = () => db.collection('tourism_catalog').doc('destinations');
const editorsRef = () => db.collection('tourism_catalog').doc('editors');
function catalogAudit(actor, type, changes) {
  return {type, status:'completed', source:'tourism', actorUid:actor.uid,
    actorName:actor.displayName || '', actorEmail:actor.email || '', actorRole:policy.roleOf(actor),
    departments:['tourism'], occurredAt:FieldValue.serverTimestamp(), changes};
}
exports.getTourismDestinations = callable(async request => {
  const actor = await tourismCatalogActor(request);
  const [catalog, editors] = await Promise.all([catalogRef().get(), editorsRef().get()]);
  const canDelegate = tourismCatalogManager(actor);
  const canEdit = canDelegate || (editors.data()?.uids || []).includes(actor.uid);
  const data = catalog.data() || {version:0, destinations:[]};
  return {version:data.version, destinations:canEdit ? data.destinations : data.destinations.filter(d => d.active), canEdit, canDelegate};
});
exports.saveTourismDestination = callable(async request => {
  const actor = await tourismCatalogActor(request);
  const input = request.data || {};
  if (Object.keys(input).some(k => !['id','name','active','version'].includes(k)) ||
      typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 160 ||
      /[\u0000-\u001f\u007f]/.test(input.name) || typeof input.active !== 'boolean' ||
      !Number.isSafeInteger(input.version) || input.version < 0 ||
      input.id !== undefined && (typeof input.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(input.id))) {
    throw new HttpsError('invalid-argument', 'Enter a destination name of 1–160 characters. Reload the list before saving.');
  }
  const name = input.name.trim().replace(/\s+/g, ' ');
  const id = input.id || db.collection('tourism_catalog').doc().id;
  await db.runTransaction(async tx => {
    const [catalog, editors] = await Promise.all([tx.get(catalogRef()), tx.get(editorsRef())]);
    if (!tourismCatalogManager(actor) && !(editors.data()?.uids || []).includes(actor.uid)) {
      throw new HttpsError('permission-denied', 'Your Tourism admin must delegate destination management to you.');
    }
    const current = catalog.data() || {version:0, destinations:[]};
    if (input.version !== current.version) throw new HttpsError('failed-precondition', 'The list changed. Reload it before saving; your draft is retained.');
    const before = current.destinations.find(d => d.id === id) || null;
    if (input.id && !before) throw new HttpsError('not-found', 'Destination no longer exists. Reload the list.');
    if (current.destinations.some(d => d.id !== id && d.name.toLocaleLowerCase('en') === name.toLocaleLowerCase('en'))) {
      throw new HttpsError('already-exists', 'This destination already exists. Edit or reactivate its existing entry.');
    }
    if (!before && current.destinations.length >= 300) throw new HttpsError('resource-exhausted', 'The destination list supports up to 300 entries.');
    const after = {id, name, active:input.active};
    tx.set(catalogRef(), {version:current.version + 1,
      destinations:[...current.destinations.filter(d => d.id !== id), after], updatedBy:actor.uid, updatedAt:FieldValue.serverTimestamp()});
    tx.set(eventsFor(actor.uid).doc(), catalogAudit(actor, 'tourism_destination_changed', [{field:'destination', before, after}]));
  });
  return {saved:true};
});
exports.listTourismDestinationPersonnel = callable(async request => {
  const actor = await tourismCatalogActor(request);
  if (!tourismCatalogManager(actor)) throw new HttpsError('permission-denied', 'Only Tourism admins can delegate.');
  const token = request.data?.pageToken;
  if (token !== undefined && (typeof token !== 'string' || token.length > 2048)) throw new HttpsError('invalid-argument', 'Invalid page token.');
  const [page, editors] = await Promise.all([auth.listUsers(100, token || undefined), editorsRef().get()]);
  const uids = editors.data()?.uids || [];
  return {users:page.users.filter(u => u.uid !== policy.SUPER_ADMIN_UID && policy.roleOf(u) === 'regular' &&
    policy.departmentsOf(u).length === 1 && policy.departmentsOf(u)[0] === 'tourism').map(u => ({
      uid:u.uid, username:u.displayName || '', email:u.email || '', eligible:tourismCatalogMember(u), delegated:uids.includes(u.uid)
    })), pageToken:page.pageToken || null};
});
exports.setTourismDestinationEditor = callable(async request => {
  const actor = await tourismCatalogActor(request);
  if (!tourismCatalogManager(actor)) throw new HttpsError('permission-denied', 'Only Tourism admins can delegate.');
  const {uid, enabled} = request.data || {};
  if (typeof uid !== 'string' || !/^[^/]{1,128}$/.test(uid) || typeof enabled !== 'boolean' ||
      Object.keys(request.data).some(k => !['uid','enabled'].includes(k))) throw new HttpsError('invalid-argument', 'Select a Tourism personnel account.');
  const target = await auth.getUser(uid);
  if (target.uid === policy.SUPER_ADMIN_UID || policy.roleOf(target) !== 'regular' ||
      policy.departmentsOf(target).length !== 1 || policy.departmentsOf(target)[0] !== 'tourism' ||
      enabled && !tourismCatalogMember(target)) throw new HttpsError('permission-denied', 'Choose approved Tourism personnel with Tourism and app or dashboard access.');
  await db.runTransaction(async tx => {
    const previous = await tx.get(editorsRef());
    const old = previous.data()?.uids || [];
    const uids = old.filter(value => value !== uid);
    if (enabled) uids.push(uid);
    if (uids.length > 100) throw new HttpsError('resource-exhausted', 'At most 100 personnel can manage destinations.');
    tx.set(editorsRef(), {uids, updatedBy:actor.uid, updatedAt:FieldValue.serverTimestamp()});
    tx.set(eventsFor(target.uid).doc(), catalogAudit(actor, 'tourism_destination_delegated', [{field:'destinationManagement', before:old.includes(uid), after:enabled}]));
  });
  return {saved:true};
});

// Attendance collections remain inaccessible to direct clients under default deny.
for (const name of ['recordAttendance','listAttendance','editAttendance','listAttendanceChanges']) {
  exports[name] = callable(request => require('./attendance')({auth, db, policy, HttpsError, FieldValue, Timestamp, loginDevice})[name](request));
}
