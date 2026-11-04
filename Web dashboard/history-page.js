(() => {
  const panel = document.querySelector('#history-panel');
  const list = document.querySelector('#history-list');
  const status = document.querySelector('#history-status');
  const more = document.querySelector('#more-history');
  const refresh = document.querySelector('#refresh-history');
  const format = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'medium', hour12: true
  }).format(new Date(value)) : 'Unavailable';
  let session, selected, cursor = null, generation = 0, loading = false;
  const allowed = () => session && (DashboardPolicy.isSuper(session.user.uid, session.claims) || session.claims.role === 'admin' && DashboardPolicy.hasAccess(session.user.uid,session.claims,'dashboard'));
  const targetAllowed = target => allowed() && (DashboardPolicy.isSuper(session.user.uid,session.claims) || target.uid === session.user.uid || target.role === 'regular' && target.departments?.length === 1 && session.claims.departments?.includes(target.departments[0]));
  const myHistory = document.querySelector('#my-history');
  function clear() {
    generation++; selected = null; cursor = null; loading = false;
    panel.hidden = true; more.hidden = true; list.replaceChildren(); status.textContent = '';
  }
  function pretty(value) {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
  async function load(append = false) {
    if (!allowed() || !selected || loading) return;
    const epoch = generation;
    loading = true; refresh.disabled = true; more.disabled = true;
    status.textContent = 'Loading account history…';
    try {
      const [{auth}, {getFunctions, httpsCallable}] = await Promise.all([
        import('./firebase-client.js'), import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')
      ]);
      if (epoch !== generation) return;
      const {data} = await httpsCallable(getFunctions(auth.app, 'asia-southeast1'), 'listAccountHistory')({uid: selected.uid, ...(append && cursor ? {cursor} : {})});
      if (epoch !== generation || !allowed()) return;
      if (!append) list.replaceChildren();
      for (const event of data.events) {
        const row = document.createElement('tr');
        const labels = {login:'Signed in', registered:'Registered / enrolled', account_created:'Account created', account_updated:'Account changed', tourism_destination_changed:'Tourism destination changed', tourism_destination_delegated:'Destination management delegation', tourism_fee_changed:'Tourism fee changed', attendance_corrected:'Attendance corrected', department_message_sent:'Department message sent', department_announcement_published:'Department announcement published', intro_page_updated:'Intro page updated', intro_notice_published:'Intro notice published'};
        const device = event.type === 'login' ? (event.device ? [event.device.manufacturer,event.device.model,event.device.platform,event.device.osVersion].filter(Boolean).join(' · ') + ' (device reported by client)' : 'Device not reported (older client)') : '';
        const details = (event.changes || []).map(change => change.field === 'password' ? 'Password changed (value never stored)' : change.field === 'feePerPersonCentavos' ? `Fee per tourist: ${change.before === null ? 'Not declared' : '₱ ' + (change.before / 100).toFixed(2)} → ₱ ${(change.after / 100).toFixed(2)}` : `${change.field}: ${pretty(change.before)} → ${pretty(change.after)}`).join('; ');
        for (const value of [format(event.occurredAt), labels[event.type] || event.type,
          `${event.actorEmail || event.actorUid || 'System'} (${event.source})`, `${event.status}${device ? ' · ' + device : ''}${details ? ': ' + details : ''}`]) {
          const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
        }
        list.append(row);
      }
      cursor = data.cursor; more.hidden = !cursor;
      status.textContent = list.children.length ? '' : 'No history has been recorded for this account yet.';
    } catch (error) {
      if (epoch === generation) status.textContent = error.code === 'functions/permission-denied' ? 'History access is limited to your assigned department.' : 'Could not load account history. Try Refresh history.';
    } finally {
      if (epoch === generation) {loading = false; refresh.disabled = false; more.disabled = false;}
    }
  }
  document.addEventListener('dashboard-ready', event => {
    const previous = JSON.stringify([session?.user.uid,session?.claims]);
    session = event.detail;
    if (previous !== JSON.stringify([session?.user.uid,session?.claims])) clear();
    if (myHistory) myHistory.hidden = !allowed();
  });
  document.addEventListener('dashboard-denied', () => {session = null; clear(); if (myHistory) myHistory.hidden = true;});
  document.addEventListener('account-history-open', event => {
    if (!targetAllowed(event.detail)) return;
    clear(); selected = event.detail; panel.hidden = false;
    document.querySelector('#history-account').textContent = `${selected.username || 'Unnamed user'} — ${selected.email}`;
    document.querySelector('#history-registration').textContent = `Registered / enrolled: ${format(selected.registeredAt)}. Latest Firebase sign-in: ${format(selected.lastSignInAt)}.`;
    panel.scrollIntoView({behavior: 'smooth', block: 'start'}); load();
  });
  refresh.addEventListener('click', () => load());
  more.addEventListener('click', () => load(true));
  document.querySelector('#close-history').addEventListener('click', clear);
  window.addEventListener('pagehide', clear);
  session = window.dashboardSession;
  if (myHistory) {
    myHistory.hidden = !allowed();
    myHistory.addEventListener('click', () => {
      if (!allowed()) return;
      document.dispatchEvent(new CustomEvent('account-history-open',{detail:{uid:session.user.uid,username:session.user.displayName,email:session.user.email}}));
    });
  }
})();
