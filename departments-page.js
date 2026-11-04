/* Read-only workspaces for the existing mobile collections. No local app data is changed. */
(() => {
  const hosts = {tourism: document.querySelector('#tourism-records-workspace'), other: document.querySelector('#department-panel')};
  const definitions = {
    tourism: {title: 'Tourism', subtitle: 'Visitor registrations, group arrivals and recorded fees.', collection: 'tourism_records', section: 'tourism', date: 'createdAt', columns: ['Visitor / group', 'Destination', 'Tourists', 'Recorded fee', 'Registered'], fields: ['name', 'company', 'destination', 'plateNumber']},
    patients: {title: 'Patient visits', collection: 'patient_records', section: 'patients', date: 'checkedAt', columns: ['Patient', 'Patient ID', 'Doctor', 'Checkup'], fields: ['patientName', 'patientNumber', 'doctorName']},
    pharmacy: {title: 'Medicine inventory', collection: 'pharmacy_inventory', section: 'pharmacy', date: 'updatedAt', columns: ['Medicine', 'Strength / form', 'Stock', 'Updated'], fields: ['name', 'strength']}
  };
  let session = null, identity = null, active = 'overview', rhuView = 'patients', epoch = 0;
  const states = new Map();
  const tourismManager = () => session && (DashboardPolicy.isSuper(session.user.uid, session.claims) || session.claims.role === 'admin' && allowed('dashboard') && allowed('tourism'));
  const allowed = key => session && DashboardPolicy.hasAccess(session.user.uid, session.claims, key);
  const el = (tag, className, text) => {const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node;};
  const button = (text, action, className = 'nav-action') => {const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node;};
  const dateOf = value => value?.toDate ? value.toDate() : value ? new Date(value) : null;
  const dateText = value => {const date = dateOf(value); return date && !Number.isNaN(date.valueOf()) ? new Intl.DateTimeFormat('en-PH', {dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Manila'}).format(date) : 'Not recorded';};
  const day = value => {const date = dateOf(value); return date && !Number.isNaN(date.valueOf()) ? new Intl.DateTimeFormat('en-CA', {year:'numeric', month:'2-digit', day:'2-digit', timeZone:'Asia/Manila'}).format(date) : '';};
  const money = value => new Intl.NumberFormat('en-PH', {style:'currency', currency:'PHP'}).format(value);
  const fee = row => Number.isSafeInteger(row.feeTotalCentavos) ? row.feeTotalCentavos / 100 : typeof row.fee === 'number' ? row.fee : null;
  function getState(key) {if (!states.has(key)) states.set(key, {rows:[], cursor:null, more:false, loaded:false, busy:false, search:'', period:'day', selected:TourismReport.day(new Date()), from:key === 'tourism' ? TourismReport.day(new Date()) : '', to:key === 'tourism' ? TourismReport.day(new Date()) : '', stock:'all', message:'', error:false, version:0}); return states.get(key);}
  function filtered(key) {
    const d = definitions[key], s = getState(key);
    return s.rows.filter(row => (!s.search || d.fields.some(field => String(row[field] || '').toLowerCase().includes(s.search.toLowerCase()))) &&
      (!s.from || day(row[d.date]) >= s.from) && (!s.to || day(row[d.date]) && day(row[d.date]) <= s.to) &&
      (key !== 'pharmacy' || s.stock === 'all' || (s.stock === 'empty' ? row.quantity === 0 : row.quantity > 0)))
      .sort((a,b) => key === 'pharmacy' ? String(a.name).localeCompare(String(b.name)) : (dateOf(b[d.date])?.valueOf() || 0) - (dateOf(a[d.date])?.valueOf() || 0));
  }
  async function load(key, append = false) {
    if (!allowed(definitions[key].section)) return;
    if (key === 'tourism') return loadTourism();
    const s = getState(key); if (s.busy) return;
    const generation = epoch, version = ++s.version, uid = session.user.uid;
    s.busy = true; s.error = false; s.message = 'Loading saved records…'; render();
    try {
      const [{auth}, sdk] = await Promise.all([import('./firebase-client.js'), import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js')]);
      if (generation !== epoch || version !== s.version) return;
      const constraints = [sdk.where('ownerId', '==', uid), sdk.orderBy(sdk.documentId()), sdk.limit(100)];
      if (append && s.cursor) constraints.push(sdk.startAfter(s.cursor));
      const snapshot = await sdk.getDocsFromServer(sdk.query(sdk.collection(sdk.getFirestore(auth.app), definitions[key].collection), ...constraints));
      if (generation !== epoch || version !== s.version || session?.user.uid !== uid) return;
      const rows = snapshot.docs.map(doc => ({...doc.data(), id:doc.id}));
      s.rows = append ? [...s.rows, ...rows] : rows;
      s.cursor = snapshot.docs.at(-1) || null; s.more = rows.length === 100; s.loaded = true;
      s.message = `Updated ${new Intl.DateTimeFormat('en-PH', {timeStyle:'short', timeZone:'Asia/Manila'}).format(new Date())} · Philippine time`;
    } catch (error) {
      if (generation !== epoch || version !== s.version) return;
      s.error = true;
      if (error.code === 'permission-denied') {s.rows = []; s.cursor = null; s.more = false; s.loaded = false; document.querySelectorAll('.record-dialog').forEach(dialog => dialog.remove());}
      s.message = error.code === 'permission-denied' ? 'Record access was denied. Current cloud rules require ownership and Mobile app access plus this feature’s permission. Ask your administrator to check your assignments.' : 'Could not load records. Check your connection and choose Refresh.';
    } finally {if (generation === epoch && version === s.version) {s.busy = false; render();}}
  }
  async function loadTourism() {
    if (!tourismManager()) return;
    const s = getState('tourism'); if (s.busy) return;
    const generation = epoch, version = ++s.version;
    s.busy = true; s.error = false; s.loaded = false; s.rows = []; s.more = false;
    s.message = 'Loading Tourism report…'; render();
    try {
      const [{auth}, {getFunctions, httpsCallable}] = await Promise.all([import('./firebase-client.js'), import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')]);
      if (generation !== epoch || version !== s.version) return;
      const call = httpsCallable(getFunctions(auth.app, 'asia-southeast1'), 'listTourismRecords');
      let cursor;
      do {
        const {data} = await call({from:s.from, to:s.to, ...(cursor ? {cursor} : {})});
        if (generation !== epoch || version !== s.version) return;
        s.rows.push(...data.records); cursor = data.cursor;
        s.message = `Loading Tourism report… ${s.rows.length} records received`; render();
      } while (cursor);
      s.loaded = true;
      s.message = `Complete report · ${s.from} to ${s.to} · Philippine time`;
    } catch (error) {
      if (generation !== epoch || version !== s.version) return;
      s.error = true; s.rows = []; s.loaded = false;
      document.querySelectorAll('.record-dialog').forEach(dialog => dialog.remove());
      s.message = error.code === 'functions/permission-denied' ? 'Tourism administrator access is required to view department records.' : 'Could not load the complete Tourism report. Choose Refresh to retry.';
    } finally {if (generation === epoch && version === s.version) {s.busy = false; render();}}
  }
  function heading(host, title, subtitle) {
    const top = el('div', 'department-heading');
    const text = el('div'); text.append(el('p','eyebrow','DEPARTMENT WORKSPACE'),el('h2','department-title',title),el('p','account-intro',subtitle));
    top.append(text, button('← Your departments', () => document.dispatchEvent(new CustomEvent('department-navigate', {detail:'overview'})))); host.append(top);
  }
  function showDetail(key, row) {
    const dialog = el('dialog','record-dialog');
    const close = button('Close ✕', () => dialog.close());
    dialog.append(close, el('p','eyebrow',definitions[key].title.toUpperCase()), el('h2','',row.name || row.patientName || 'Record details'));
    const fields = key === 'tourism' ? [['Company / group', row.company], ['Destination',row.destination], ['Tourists',row.touristCount ?? 'Not recorded (legacy entry)'], ['Plate number', row.plateNumber], ['Fee per tourist', Number.isSafeInteger(row.feePerPersonCentavos) ? money(row.feePerPersonCentavos / 100) : 'Not recorded (legacy entry)'], ['Recorded total',fee(row) === null ? 'Not recorded' : money(fee(row))], ['Registered',dateText(row.createdAt)]] : key === 'patients' ? [['Patient ID',row.patientNumber],['Doctor',row.doctorName],['Checkup',dateText(row.checkedAt)],['Notes',row.notes]] : [['Strength / form',row.strength],['Quantity',row.quantity],['Created',dateText(row.createdAt)],['Last updated',dateText(row.updatedAt)]];
    if (key === 'tourism') fields.push(['Recorded by (account ID)',row.ownerId]);
    fields.push(['Cloud upload',dateText(row.uploadedAt)],['Record ID',row.id]);
    const list = el('dl','record-details');
    for (const [label,value] of fields) list.append(el('dt','',label),el('dd','',value === undefined || value === '' ? 'Not recorded' : String(value)));
    dialog.append(list);
    if (key === 'tourism' && Object.keys(row.photos || {}).length) dialog.append(el('p','account-note','Photo references are saved with this record. View photos in the mobile app.'));
    dialog.addEventListener('close', () => dialog.remove()); document.body.append(dialog); dialog.showModal();
  }
  function renderRecords(host, key) {
    const d = definitions[key], s = getState(key);
    if (!allowed(d.section) || key === 'tourism' && !tourismManager()) {host.append(el('div','workspace-empty',key === 'tourism' ? 'Tourism administrator access is required to view department reports.' : 'This section has not been assigned to your account.')); return;}
    const card = el('section','records-card'); card.setAttribute('aria-label',d.title);
    const toolbar = el('div','records-toolbar'); const label = el('div'); label.append(el('h3','',d.title),el('p','account-note',key === 'tourism' ? 'Read-only Tourism records synced from the Flutter app by Tourism staff. Device-only records appear after mobile sync.' : 'Cloud records saved by your signed-in account. Device-only records appear after mobile sync.'));
    const refresh = button('↻ Refresh', () => load(key)); refresh.disabled = s.busy; toolbar.append(label,refresh); card.append(toolbar);
    const stats = el('div','record-stats'); card.append(stats);
    const filters = el('div','record-filters');
    const searchLabel = el('label','','Search records'); const search = el('input'); search.type = 'search'; search.placeholder = key === 'tourism' ? 'Visitor, company, destination or plate…' : key === 'patients' ? 'Patient name, ID or doctor…' : 'Medicine name or strength…'; search.value = s.search; searchLabel.append(search); filters.append(searchLabel);
    if (key !== 'tourism') for (const [field,text] of [['from','From date'],['to','To date']]) {const label = el('label','',text); const input = el('input'); input.type = 'date'; input.value = s[field]; input.addEventListener('change', () => {s[field] = input.value; update();}); label.append(input); filters.append(label);}
    if (key === 'tourism') {
      const label = el('label','','Report period'), select = el('select');
      for (const [value,text] of [['day','Day'],['week','Week (Monday–Sunday)'],['month','Month']]) {const option=el('option','',text);option.value=value;select.append(option);}
      select.value=s.period; select.disabled=s.busy;label.append(select);filters.append(label);
      const dateLabel=el('label','','Date in period'), date=el('input');date.type='date';date.value=s.selected;date.disabled=s.busy;dateLabel.append(date);filters.append(dateLabel);
      const change=()=>{if (!date.value) return;s.period=select.value;s.selected=date.value;Object.assign(s,TourismReport.range(s.period,s.selected));load(key);};
      select.addEventListener('change',change);date.addEventListener('change',change);
    }
    if (key === 'pharmacy') {const label = el('label','','Stock'); const select = el('select'); for (const [value,text] of [['all','All stock'],['available','In stock'],['empty','Out of stock']]) {const option = el('option','',text); option.value = value; select.append(option);} select.value = s.stock; select.addEventListener('change',()=>{s.stock=select.value;update();}); label.append(select);filters.append(label);}
    filters.append(button('Clear filters', () => {s.search='';if(key !== 'tourism'){s.from='';s.to='';}s.stock='all';render();})); card.append(filters);
    const status = el('p',`auth-status${s.error ? ' error' : ''}`,s.message);status.setAttribute('role','status');card.append(status);
    const count = el('p','result-count');card.append(count);
    const daily = el('section','tourism-daily');if(key === 'tourism')card.append(daily);
    const scroll = el('div','table-scroll'), table = el('table','records-table'), thead = el('thead'), tr = el('tr');
    for (const title of [...d.columns,'Details']) {const th = el('th','',title);th.scope='col';tr.append(th);} thead.append(tr);table.append(thead); const tbody=el('tbody');table.append(tbody);scroll.append(table);card.append(scroll);
    const empty=el('div','workspace-empty');card.append(empty);
    const more=button('Load next 100 records',()=>load(key,true));more.hidden=!s.more;more.disabled=s.busy;card.append(more);
    function update() {
      const rows=filtered(key);stats.replaceChildren();tbody.replaceChildren();
      const total = key === 'tourism' ? TourismReport.totals(rows) : null;
      const metrics = key==='tourism' ? [['Registrations',total.registrations],['Recorded tourists',total.tourists],['Recorded fees',money(total.centavos / 100)]] : key==='patients' ? [['Visits',rows.length],['Unique patient IDs',new Set(rows.map(r=>r.patientNumber)).size],['Doctors recorded',new Set(rows.map(r=>r.doctorName)).size]] : [['Medicines',rows.length],['Units in stock',rows.reduce((n,r)=>n+(Number(r.quantity)||0),0)],['Out of stock',rows.filter(r=>r.quantity===0).length]];
      for (const [label,value] of metrics) {const stat=el('div','record-stat');stat.append(el('span','',label),el('strong','',key === 'tourism' && !s.loaded ? '—' : String(value)));stats.append(stat);}
      count.textContent=`${rows.length} matching of ${s.rows.length} loaded records${s.more?' · More records available':''}. Summaries use the loaded, filtered records.`;
      if (key==='tourism') {
        count.textContent = s.loaded ? `${rows.length} matching of ${s.rows.length} records in this ${s.period}. Totals follow the search filter. ${total.unknownCounts} entries have no tourist count; ${total.unknownFees} have no recorded fee. Fees are recorded amounts, not verified payments.` : 'Totals appear after the complete report has loaded.';
        daily.replaceChildren();
        if (s.loaded && s.period !== 'day') {
          daily.append(el('h3','','Daily totals'));
          const wrap=el('div','table-scroll'), table=el('table','records-table'), head=el('thead'), titles=el('tr');
          for(const title of ['Date (Philippines)','Registrations','Recorded tourists','Recorded fees'])titles.append(el('th','',title));head.append(titles);table.append(head);
          const body=el('tbody');for(const entry of TourismReport.daily(rows)){const tr=el('tr');for(const value of [entry.date,entry.registrations,entry.tourists,money(entry.centavos/100)])tr.append(el('td','',String(value)));body.append(tr);}table.append(body);wrap.append(table);daily.append(wrap);
        }
      }
      for(const row of rows) {
        const tr=el('tr');
        const values=key==='tourism' ? [row.name,row.destination||'—',row.touristCount??'Not recorded',fee(row)===null?'Not recorded':money(fee(row)),dateText(row.createdAt)] : key==='patients' ? [row.patientName,row.patientNumber,row.doctorName,dateText(row.checkedAt)] : [row.name,row.strength||'—',row.quantity,dateText(row.updatedAt)];
        values.forEach((value,index)=>{const td=el('td','',String(value??'—'));if(index===0&&key==='tourism'&&row.company)td.append(el('small','',row.company));if(key==='pharmacy'&&index===2)td.className=row.quantity===0?'stock-empty':'stock-available';tr.append(td);});
        const actions=el('td');const view=button('View',()=>showDetail(key,row));view.setAttribute('aria-label',`View ${row.name||row.patientName||'record'}`);actions.append(view);tr.append(actions);tbody.append(tr);
      }
      empty.hidden=rows.length>0;
      empty.textContent=s.busy?'Loading saved records…':s.error?'Records are unavailable. Use Refresh to try again.':!s.loaded?'Choose Refresh to load your saved cloud records.':s.rows.length?'No records match these filters.':key === 'tourism' ? 'No synced Tourism records for this period. Choose another date or sync records from the Flutter app, then refresh.' : 'No cloud records found for this account. Sync records from the mobile app, then refresh.';
    }
    search.addEventListener('input',()=>{s.search=search.value;update();});update();host.append(card);
  }
  function render() {
    hosts.tourism.replaceChildren();hosts.other.replaceChildren();
    if (!session) return;
    if (active==='tourism' && allowed('tourism')) {heading(hosts.tourism,'Tourism','Visitor registrations, group arrivals and recorded fees.');renderRecords(hosts.tourism,'tourism');}
    else if(active==='rhu'&&allowed('rhu')) {
      heading(hosts.other,'Rural Health Unit','Patient visit history and medicine inventory.');
      hosts.other.querySelector('h2').id='department-title';
      const nav=el('nav','service-tabs');nav.setAttribute('aria-label','RHU services');
      const keys=['patients','pharmacy'].filter(allowed);
      if(!keys.includes(rhuView))rhuView=keys[0];
      for(const key of keys){const tab=button(definitions[key].title,()=>{rhuView=key;render();if(!getState(key).loaded)load(key);});tab.setAttribute('aria-pressed',String(rhuView===key));nav.append(tab);}hosts.other.append(nav);
      if(rhuView)renderRecords(hosts.other,rhuView);else hosts.other.append(el('div','workspace-empty','Ask your administrator to assign Patient records or Pharmacy access.'));
    } else if(DashboardPolicy.departments[active]&&allowed(active)) {
      heading(hosts.other,DashboardPolicy.departments[active],'Your department workspace.');hosts.other.querySelector('h2').id='department-title';
      const card=el('section','dashboard-card');card.append(el('p','eyebrow','DEPARTMENT SERVICES'),el('h3','',`${DashboardPolicy.departments[active]} workspace`),el('p','','This department is ready to open. A record system has not been connected to this dashboard yet.'));hosts.other.append(card);
    }
  }
  function clear() {epoch++; states.clear();document.querySelectorAll('.record-dialog').forEach(dialog=>dialog.remove());hosts.tourism.replaceChildren();hosts.other.replaceChildren();}
  function initialize(detail) {const next=JSON.stringify([detail.user.uid,detail.claims]);if(next===identity)return;clear();session=detail;identity=next;render();activate(active);}
  function activate(key){active=key;render();const target=key==='tourism'?'tourism':key==='rhu'?rhuView:null;if(target&&allowed(definitions[target].section)&&!getState(target).loaded)load(target);}
  document.addEventListener('department-selected',event=>activate(event.detail));
  document.addEventListener('dashboard-ready',event=>initialize(event.detail));
  document.addEventListener('dashboard-denied',()=>{clear();session=null;identity=null;active='overview';});
  window.addEventListener('pagehide',()=>{clear();identity=null;});
  window.addEventListener('pageshow',event=>{if(event.persisted&&window.dashboardSession)initialize(window.dashboardSession);});
  if(window.dashboardSession)initialize(window.dashboardSession);
})();
