(() => {
  const host = document.querySelector('#department-communications');
  const welcome = document.querySelector('#workspace-welcome');
  let session, department, kind = 'announcements', cursor = null, items = [], recipients = [];
  let epoch = 0, scanEpoch = 0, busy = false, error = '', draft = '', recipient = '';
  let composerOpen = false, expanded = false, readIds = new Set(), latest = new Map();
  let welcomeTimer, refreshTimer;
  const manager = () => session && (DashboardPolicy.isSuper(session.user.uid, session.claims) || session.claims.role === 'admin');
  const departments = () => session ? Object.keys(DashboardPolicy.departments).filter(key => DashboardPolicy.isSuper(session.user.uid, session.claims) || (session.claims.departments || []).includes(key)) : [];
  const el = (tag, text) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
  const button = (text, action) => { const node = el('button', text); node.type = 'button'; node.className = 'nav-action'; node.disabled = busy; node.addEventListener('click', action); return node; };
  const time = value => value ? new Intl.DateTimeFormat('en-PH', {timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value)) : 'Not recorded';
  const storageKey = uid => `communication_reads_v1:${uid}`;
  const readKey = (dept, feed, item) => typeof item.id === 'string' ? `${dept}/${feed}/${item.id}` : null;
  const unread = (dept, feed, item) => feed !== 'sent' && item.authorUid !== session?.user.uid && !readIds.has(readKey(dept, feed, item));
  const hasUnread = (dept, feed) => (latest.get(`${dept}/${feed}`) || []).some(item => unread(dept, feed, item));
  const departmentUnread = dept => hasUnread(dept, 'announcements') || hasUnread(dept, 'inboxes');

  async function call(name, data) {
    const [{auth}, {getFunctions, httpsCallable}] = await Promise.all([import('./firebase-client.js'), import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')]);
    return (await httpsCallable(getFunctions(auth.app, 'asia-southeast1'), name)(data)).data;
  }
  async function load(append = false) {
    if (!session || !department) return;
    const version = ++epoch;
    busy = true; error = ''; render();
    try {
      const data = await call('listDepartmentUpdates', {department, kind, ...(append && cursor ? {cursor} : {})});
      if (version !== epoch) return;
      items = append ? [...items, ...data.items] : data.items; cursor = data.cursor;
      if (kind !== 'sent') latest.set(`${department}/${kind}`, items);
    } catch (e) {
      if (version !== epoch) return;
      items = []; cursor = null; error = e.message || 'Could not load messages. Refresh to retry.';
    } finally { if (version === epoch) { busy = false; render(); } }
  }
  // Check recent announcements AND personal inboxes, including other assigned departments.
  // Read markers are device-local IDs; message bodies remain in memory only.
  async function scan() {
    if (!session) return;
    const version = ++scanEpoch, uid = session.user.uid;
    const results = await Promise.all(departments().flatMap(dept => ['announcements', 'inboxes']
      .filter(feed => dept !== department || feed !== kind)
      .map(async feed => {
        try { const data = await call('listDepartmentUpdates', {department: dept, kind: feed}); return [`${dept}/${feed}`, data.items]; }
        catch { return null; }
      })));
    if (version !== scanEpoch || session?.user.uid !== uid) return;
    for (const result of results) if (result) latest.set(...result);
    render();
  }
  function markRead() {
    const next = new Set(readIds);
    for (const item of items) { const key = readKey(department, kind, item); if (key) next.add(key); }
    try {
      window.localStorage.setItem(storageKey(session.user.uid), JSON.stringify([...next]));
      readIds = next; expanded = false; render();
      document.querySelector('#communications-toggle')?.focus();
    } catch { error = 'Could not save read status. Allow browser storage and try again.'; render(); }
  }
  async function loadRecipients() {
    const version = epoch; busy = true; error = ''; render();
    try {
      let token; const rows = [];
      do {
        const data = await call('listDashboardUsers', token ? {pageToken: token} : {});
        if (version !== epoch) return;
        rows.push(...data.users); token = data.pageToken;
      } while (token);
      recipients = rows.filter(u => !u.disabled && u.departments.includes(department));
    } catch (e) { if (version === epoch) error = e.message || 'Could not load recipients.'; }
    finally { if (version === epoch) { busy = false; render(); } }
  }
  async function send() {
    if (!draft.trim() || busy) return;
    const version = epoch; busy = true; error = ''; render();
    try {
      await call('publishDepartmentUpdate', {department, text: draft.trim(), ...(recipient ? {recipientUid: recipient} : {})});
      if (version !== epoch) return;
      draft = ''; kind = recipient ? 'sent' : 'announcements'; busy = false;
      load(); scan();
    } catch (e) { if (version === epoch) { busy = false; error = e.message || 'Could not send. Please try again.'; render(); } }
  }
  function render() {
    host.replaceChildren(); host.hidden = !session || !departments().length;
    if (host.hidden) return;
    host.className = 'dashboard-card communications-card';
    const toggle = button('Announcement/Messages', () => { expanded = !expanded; render(); document.querySelector('#communications-toggle')?.focus(); });
    toggle.id = 'communications-toggle'; toggle.disabled = false;
    toggle.setAttribute('aria-expanded', String(expanded)); toggle.setAttribute('aria-controls', 'communications-content');
    const summary = el('div'); summary.className = 'communications-summary';
    const unreadLabel = el('span', departments().some(departmentUnread) ? 'Unread updates available' : 'Open department updates');
    unreadLabel.className = departments().some(departmentUnread) ? 'unread-indicator' : 'field-hint';
    summary.append(toggle, unreadLabel); host.append(summary);
    if (!expanded) return;
    const content = el('div'); content.id = 'communications-content'; content.append(el('h2', 'Department announcements & messages'));
    const select = el('select'); select.setAttribute('aria-label', 'Communications department'); select.disabled = busy;
    for (const key of departments()) { const option = el('option', DashboardPolicy.departments[key] + (departmentUnread(key) ? ' • New' : '')); option.value = key; select.append(option); }
    select.value = department;
    select.addEventListener('change', () => { department = select.value; recipient = ''; recipients = []; items = []; cursor = null; load(); }); content.append(select);
    const tabs = el('div'); tabs.className = 'communication-actions';
    for (const [value, label] of Object.entries({announcements: 'Announcements', inboxes: 'My inbox', ...(manager() ? {sent: 'Sent messages'} : {})})) {
      const tab = button(label + (hasUnread(department, value) ? ' • New' : ''), () => { kind = value; items = []; cursor = null; load(); });
      tab.setAttribute('aria-pressed', String(kind === value)); tabs.append(tab);
    }
    content.append(tabs);
    if (manager()) {
      const composer = el('details'); composer.open = composerOpen; composer.addEventListener('toggle', () => { composerOpen = composer.open; }); composer.append(el('summary', 'Write an announcement or message'));
      const audience = el('select'); audience.disabled = busy; audience.setAttribute('aria-label', 'Message audience'); const all = el('option', 'Everyone in this department'); all.value = ''; audience.append(all);
      for (const user of recipients) { const option = el('option', `${user.username || user.email} · ${user.email}`); option.value = user.uid; audience.append(option); }
      audience.value = recipient; audience.addEventListener('change', () => { recipient = audience.value; });
      const textarea = el('textarea'); textarea.maxLength = 3000; textarea.rows = 4; textarea.value = draft; textarea.disabled = busy; textarea.placeholder = 'Write your announcement or message…'; textarea.setAttribute('aria-label', 'Announcement or message'); textarea.addEventListener('input', () => { draft = textarea.value; });
      composer.append(audience, button('Load department recipients', loadRecipients), textarea, button('Publish / send', send)); content.append(composer);
    }
    const status = el('p', error || (busy ? 'Loading…' : items.length ? '' : 'No updates yet.')); status.setAttribute('role', 'status'); content.append(status);
    const feed = el('div'); feed.className = 'communication-feed'; feed.tabIndex = 0; feed.setAttribute('aria-label', 'Department updates');
    for (const item of items) {
      const card = el('article'); card.className = 'communication-item';
      if (unread(department, kind, item)) card.append(el('strong', 'Unread'));
      const body = el('p', item.text); body.className = 'communication-text';
      card.append(body, el('small', `${item.authorName} · ${time(item.createdAt)}${kind === 'sent' ? ' · To ' + item.recipientName : ''}`)); feed.append(card);
    }
    content.append(feed);
    const actions = el('div'); actions.className = 'communication-actions';
    if (kind !== 'sent' && items.length) actions.append(button('Mark as read & close', markRead));
    actions.append(button('Refresh updates', () => { load(); scan(); }));
    if (cursor) actions.append(button('Load older', () => load(true)));
    content.append(actions); host.append(content);
  }
  function initialize(detail) {
    if (JSON.stringify([session?.user.uid, session?.claims]) === JSON.stringify([detail?.user.uid, detail?.claims])) return;
    const previousUid = session?.user.uid;
    epoch++; scanEpoch++; session = detail;
    department = departments()[0]; kind = 'announcements'; draft = ''; recipient = ''; recipients = []; items = []; latest = new Map(); readIds = new Set();
    cursor = null; busy = false; expanded = false; composerOpen = false; error = '';
    if (session) {
      try { const saved = JSON.parse(window.localStorage.getItem(storageKey(session.user.uid)) || '[]'); if (Array.isArray(saved)) readIds = new Set(saved.filter(id => typeof id === 'string')); } catch { /* Device storage may be unavailable. */ }
    }
    if (previousUid !== session?.user.uid) {
      window.clearTimeout(welcomeTimer);
      if (welcome) {
        welcome.hidden = !session;
        if (session) welcomeTimer = window.setTimeout(() => { welcome.hidden = true; }, 20000);
      }
    }
    render(); if (department) { load(); scan(); }
  }
  const refresh = () => { if (session && !busy && !draft && !document.hidden) { load(); scan(); } };
  const startRefresh = () => { if (refreshTimer == null) refreshTimer = window.setInterval(refresh, 60000); };
  document.addEventListener('dashboard-ready', event => initialize(event.detail));
  document.addEventListener('dashboard-denied', () => initialize(null));
  startRefresh();
  window.addEventListener('pagehide', () => { epoch++; scanEpoch++; window.clearInterval(refreshTimer); refreshTimer = null; });
  window.addEventListener('pageshow', event => { if (event.persisted) { startRefresh(); refresh(); } });
  window.addEventListener('storage', event => {
    if (!session || event.key !== storageKey(session.user.uid)) return;
    try { const ids = JSON.parse(event.newValue || '[]'); if (Array.isArray(ids)) { readIds = new Set(ids.filter(id => typeof id === 'string')); render(); } } catch { /* Ignore malformed markers. */ }
  });
  if (window.dashboardSession) initialize(window.dashboardSession);
})();
