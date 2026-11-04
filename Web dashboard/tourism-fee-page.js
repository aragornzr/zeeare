(() => {
  const panel = document.querySelector('#tourism-fee-panel');
  const input = document.querySelector('#tourism-fee-input');
  const status = document.querySelector('#tourism-fee-status');
  const current = document.querySelector('#tourism-current-fee');
  const save = document.querySelector('#save-tourism-fee');
  const refresh = document.querySelector('#refresh-tourism-fee');
  let session, identity, generation = 0, busy = false;
  const permitted = () => session && (DashboardPolicy.isSuper(session.user.uid, session.claims) ||
    session.claims.role === 'admin' && DashboardPolicy.hasAccess(session.user.uid, session.claims, 'dashboard') &&
    DashboardPolicy.hasAccess(session.user.uid, session.claims, 'tourism'));
  function setBusy(value) {busy = value; save.disabled = value; input.disabled = value; refresh.disabled = value;}
  async function call(name, data) {
    const [{auth}, {getFunctions, httpsCallable}] = await Promise.all([
      import('./firebase-client.js'), import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')
    ]);
    return (await httpsCallable(getFunctions(auth.app, 'asia-southeast1'), name)(data)).data;
  }
  function render(rate) {
    current.textContent = rate ? `Current fee: ₱ ${(rate.feePerPersonCentavos / 100).toFixed(2)} per tourist` : 'No fee has been declared. Set a rate before new Tourism records can be saved.';
    input.value = rate ? (rate.feePerPersonCentavos / 100).toFixed(2) : '';
  }
  async function load() {
    if (!permitted() || busy) return;
    const epoch = generation; setBusy(true); status.textContent = 'Loading Tourism rate…';
    try {
      const result = await call('getTourismFee', {});
      if (epoch !== generation) return;
      render(result.rate); status.textContent = '';
    } catch {if (epoch === generation) status.textContent = 'Could not load the Tourism rate. Try Refresh rate.';}
    finally {if (epoch === generation) setBusy(false);}
  }
  function clear() {
    generation++; identity = null; session = null; panel.hidden = true;
    input.value = ''; current.textContent = ''; status.textContent = ''; setBusy(false);
  }
  function initialize(detail) {
    const next = JSON.stringify([detail.user.uid, detail.claims]);
    if (next === identity) return;
    clear(); session = detail; identity = next;
    panel.hidden = !permitted(); if (permitted()) load();
  }
  document.querySelector('#tourism-fee-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!permitted() || busy) return;
    const text = input.value.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(text)) {status.textContent = 'Enter a fee with up to two decimal places.';return;}
    const [whole, fraction = ''] = text.split('.');
    const feePerPersonCentavos = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(feePerPersonCentavos) || feePerPersonCentavos > 100000000) {status.textContent = 'Enter a fee from ₱0 to ₱1,000,000.';return;}
    const epoch = generation; setBusy(true); status.textContent = 'Saving Tourism rate…';
    try {
      const result = await call('setTourismFee', {feePerPersonCentavos});
      if (epoch !== generation) return;
      render(result.rate); status.textContent = 'Tourism fee saved. New records will use this rate once the app receives it.';
    } catch (error) {if (epoch === generation) status.textContent = error.code === 'functions/permission-denied' ? 'Tourism administrator access is required.' : 'Could not save the fee. Refresh the rate before retrying.';}
    finally {if (epoch === generation) setBusy(false);}
  });
  refresh.addEventListener('click', load);
  document.addEventListener('dashboard-ready', event => initialize(event.detail));
  document.addEventListener('dashboard-denied', clear);
  window.addEventListener('pagehide', clear);
  if (window.dashboardSession) initialize(window.dashboardSession);
})();
