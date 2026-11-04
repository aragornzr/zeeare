const overview = document.querySelector('#overview-panel');
const panel = document.querySelector('#users-panel');
const overviewTab = document.querySelector('#overview-tab');
const usersTab = document.querySelector('#users-tab');
const tourismPanel = document.querySelector('#tourism-panel');
const tourismTab = document.querySelector('#tourism-tab');
function selectTab(value) {
  const selected = value === true ? 'users' : value === false ? 'overview' : value;
  if (selected === 'users' && usersTab.hidden) return;
  overview.hidden = selected !== 'overview'; panel.hidden = selected !== 'users';
  tourismPanel.hidden = selected !== 'tourism';
  document.querySelector('#department-panel').hidden = !['engineering', 'rhu', 'mswd', 'treasurer', 'hrmo', 'mao', 'attendance'].includes(selected);
  document.dispatchEvent(new CustomEvent('department-selected', {detail: selected}));
  overviewTab.setAttribute('aria-selected', String(selected === 'overview'));
  usersTab.setAttribute('aria-selected', String(selected === 'users'));
  tourismTab.setAttribute('aria-selected', String(selected === 'tourism'));
}
tourismTab.addEventListener('click', () => {
  if (!tourismTab.hidden) selectTab('tourism');
});
overviewTab.addEventListener('click', () => selectTab(false));
usersTab.addEventListener('click', () => {
  selectTab(true);
  if (!request && window.dashboardSession) initializeUsers(window.dashboardSession);
});
if (window.location?.hash === '#users') selectTab(true);

const form = document.querySelector('#user-form');
const editor = document.querySelector('#user-editor');
const status = document.querySelector('#users-status');
function addCheckbox(container, name, value, label) {
  const wrapper = document.createElement('label'); wrapper.className = 'remember-label';
  const input = document.createElement('input'); input.type = 'checkbox'; input.name = name; input.value = value;
  wrapper.append(input, document.createTextNode(` ${label}`)); container.append(wrapper);
}
Object.entries(DashboardPolicy.departments).forEach(([key, label]) => {
  addCheckbox(document.querySelector('#department-options'), 'user-department', key, label);
  if (!['tourism', 'rhu'].includes(key)) addCheckbox(document.querySelector('#extra-section-options'), 'user-access', key, label);
});
const departmentBoxes = [...form.querySelectorAll('[name="user-department"]')];
const roleBoxes = [...form.querySelectorAll('[name="user-role"]')];
const accessBoxes = [...form.querySelectorAll('[name="user-access"]')];
const save = document.querySelector('#save-user');
let actorClaims = {}, actorUid, selectedUid = null, pageToken = null, busy = false, request;
let generation = 0;
let selectedUser = null;
const isSuper = () => DashboardPolicy.isSuper(actorUid, actorClaims);
let lastIdentity = null;
function message(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
function errorText(error) {
  if (error.code === 'functions/not-found' || error.code === 'functions/unavailable' || error.code === 'functions/internal') return 'User management is unavailable. The secure backend may not be activated yet. Refresh users before retrying.';
  if (error.code === 'functions/unauthenticated') return 'Your session has expired. Sign out and sign in again.';
  return error.code?.startsWith('functions/') ? error.message : 'Could not connect to user management. Check your connection and try again.';
}
function applyRole() {
  const role = roleBoxes.find(box => box.checked)?.value || 'regular';
  const protectedAccount = selectedUser?.protected === true;
  roleBoxes.forEach(box => {
    box.disabled = busy || protectedAccount || !isSuper() || box.value === 'superadmin';
  });
  departmentBoxes.forEach(box => {
    box.disabled = busy || protectedAccount || (!isSuper() && (selectedUid !== null || !actorClaims.departments?.includes(box.value)));
  });
  const assigned = departmentBoxes.filter(box => box.checked).map(box => box.value);
  accessBoxes.forEach(box => {
    const department = DashboardPolicy.sectionDepartment[box.value];
    const outside = box.value !== 'attendance' && department && !assigned.includes(department);
    const forbidden = !isSuper() && !DashboardPolicy.hasAccess(actorUid, actorClaims, box.value);
    box.disabled = busy || protectedAccount || outside || forbidden;
    if (protectedAccount) box.checked = true;
    else if (outside || forbidden) box.checked = false;
  });
  document.querySelector('#user-approved').disabled = busy || protectedAccount;
  document.querySelector('#user-disabled').disabled = busy || protectedAccount;
  document.querySelector('#role-options').hidden = !isSuper();
  document.querySelector('#department-assignment').hidden = !isSuper();
  document.querySelector('#apply-admin-access').hidden = !isSuper() || role !== 'admin' || protectedAccount;
  document.querySelector('#apply-admin-access').disabled = busy || !assigned.length;
  document.querySelector('#user-access-summary').textContent = DashboardPolicy.mobileAccessStatus({
    disabled: document.querySelector('#user-disabled').checked,
    approved: document.querySelector('#user-approved').checked,
    departments: assigned,
    assignedAccess: Object.fromEntries(accessBoxes.map(box => [box.value, box.checked]))
  });
}
departmentBoxes.forEach(box => box.addEventListener('change', () => {
  if (roleBoxes.find(role => role.checked)?.value !== 'admin' && box.checked) {
    departmentBoxes.forEach(other => { if (other !== box) other.checked = false; });
  }
  applyRole();
}));
roleBoxes.forEach(box => box.addEventListener('change', () => {
  roleBoxes.forEach(other => { other.checked = other === box; });
  if (box.value === 'regular') {
    let kept = false;
    departmentBoxes.forEach(department => { if (department.checked && !kept) kept = true; else department.checked = false; });
  }
  applyRole();
}));
accessBoxes.forEach(box => box.addEventListener('change', applyRole));
document.querySelector('#user-approved').addEventListener('change', applyRole);
document.querySelector('#user-disabled').addEventListener('change', applyRole);
document.querySelector('#apply-admin-access').addEventListener('click', () => {
  if (busy || !isSuper() || selectedUser?.protected || roleBoxes.find(box => box.checked)?.value !== 'admin') return;
  const assigned = departmentBoxes.filter(box => box.checked).map(box => box.value);
  if (!assigned.length) return;
  document.querySelector('#user-approved').checked = true;
  accessBoxes.forEach(box => {
    const department = DashboardPolicy.sectionDepartment[box.value];
    box.checked = ['dashboard', 'apps'].includes(box.value) || assigned.includes(department);
  });
  applyRole();
});
function resetForm() {
  editor.hidden = true;
  selectedUid = null; selectedUser = null; form.reset();
  document.querySelector('#user-form-title').textContent = 'Add user';
  document.querySelector('#user-password').required = true;
  document.querySelector('#password-hint').textContent = 'At least 8 characters. Passwords are never displayed or saved on this page.';
  save.textContent = 'Create user';
  if (!isSuper()) departmentBoxes.forEach(box => { box.checked = box.value === actorClaims.departments?.[0]; });
  setBusy(false);
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('#user-management button').forEach(button => { button.disabled = value; });
  form.querySelectorAll('input').forEach(input => { input.disabled = value; });
  applyRole();
}
function editUser(user) {
  if (busy) return;
  selectedUid = user.uid; selectedUser = user;
  editor.hidden = false;
  document.querySelector('#user-form-title').textContent = `Edit ${user.username || user.email || 'user'}`;
  document.querySelector('#username').value = user.username;
  document.querySelector('#user-email-input').value = user.email;
  const password = document.querySelector('#user-password'); password.value = ''; password.required = false;
  document.querySelector('#password-hint').textContent = 'Leave blank to keep the current password. Enter a new password to change it.';
  document.querySelector('#user-disabled').checked = user.disabled;
  document.querySelector('#user-approved').checked = user.approved;
  departmentBoxes.forEach(box => { box.checked = user.departments.includes(box.value); });
  roleBoxes.forEach(box => { box.checked = box.value === user.role; });
  accessBoxes.forEach(box => { box.checked = user.assignedAccess[box.value] === true; });
  save.textContent = 'Save changes'; setBusy(false);
  document.querySelector('#username').focus({preventScroll: true});
  form.scrollIntoView?.({behavior: 'smooth', block: 'start'});
}
function renderUser(user) {
  const row = document.createElement('tr');
  const nameCell = document.createElement('td'); nameCell.className = 'user-name-cell';
  const nameActions = document.createElement('div'); nameActions.className = 'user-name-actions';
  const name = document.createElement('span'); name.className = 'user-row-name';
  name.textContent = user.username || 'Unnamed user'; name.title = name.textContent;
  const edit = document.createElement('button'); edit.className = 'nav-action user-edit';
  edit.setAttribute('aria-label', `Edit account for ${user.username || user.email || 'user'}`);
  edit.textContent = 'Edit'; edit.addEventListener('click', () => editUser(user));
  nameActions.append(name, edit); nameCell.append(nameActions); row.append(nameCell);
  for (const value of [
    user.email,
    user.role === 'superadmin' ? 'Super admin (protected)' : user.role === 'admin' ? 'Department admin' : 'Regular user',
    user.departments.map(key => DashboardPolicy.departments[key]).join(', ') || 'Unassigned',
    user.disabled ? 'Disabled' : user.approved ? 'Approved' : 'Pending approval',
    DashboardPolicy.mobileAccessStatus(user),
  ]) {
    const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
  }
  const cell = document.createElement('td');
  if (isSuper() || actorClaims.role === 'admin') { const button = document.createElement('button'); button.className = 'nav-action'; button.textContent = 'History'; button.addEventListener('click', () => document.dispatchEvent(new CustomEvent('account-history-open', {detail: user}))); cell.append(button); }
  row.append(cell); document.querySelector('#users-list').append(row);
}
async function loadUsers(append = false) {
  if (busy || !request) return;
  const epoch = generation;
  setBusy(true); message('Loading registered users…');
  try {
    const result = await request('listDashboardUsers', append && pageToken ? {pageToken} : {});
    if (epoch !== generation) return;
    if (!append) document.querySelector('#users-list').replaceChildren();
    result.users.forEach(renderUser); pageToken = result.pageToken;
    document.querySelector('#more-users').hidden = !pageToken;
    message(result.users.length ? '' : (pageToken ? 'No eligible users on this page. Load more to continue.' : 'No eligible users found.'));
  } catch (error) { message(errorText(error), true); }
  finally { if (epoch === generation) setBusy(false); }
}
document.querySelector('#new-user').addEventListener('click', () => {
  if (busy) return;
  resetForm(); editor.hidden = false;
  document.querySelector('#username').focus({preventScroll: true});
  form.scrollIntoView?.({behavior: 'smooth', block: 'start'});
});
document.querySelector('#cancel-user').addEventListener('click', resetForm);
document.querySelector('#refresh-users').addEventListener('click', () => {
  if (request) loadUsers();
  else if (window.dashboardSession) initializeUsers(window.dashboardSession);
  else message('Your account access is still loading. Reload the dashboard if this continues.', true);
});
document.querySelector('#more-users').addEventListener('click', () => loadUsers(true));
form.addEventListener('submit', async event => {
  event.preventDefault(); if (busy || !request || !form.reportValidity()) return;
  const data = { username: document.querySelector('#username').value.trim(),
    email: document.querySelector('#user-email-input').value.trim(),
    role: roleBoxes.find(box => box.checked)?.value || 'regular',
    access: Object.fromEntries(accessBoxes.map(box => [box.value, box.checked])),
    disabled: document.querySelector('#user-disabled').checked,
    approved: document.querySelector('#user-approved').checked,
    departments: departmentBoxes.filter(box => box.checked).map(box => box.value) };
  const password = document.querySelector('#user-password');
  if (password.value) data.password = password.value;
  if (selectedUid) data.uid = selectedUid;
  const creating = !selectedUid;
  setBusy(true); message(creating ? 'Creating user…' : 'Saving changes…');
  try {
    await request(creating ? 'createDashboardUser' : 'updateDashboardUser', data);
    password.value = ''; resetForm(); setBusy(false);
    await loadUsers(); message(creating ? (data.approved ? 'User created and approved for the assigned sections.' : 'User created. Menu access remains pending until approval.') : `User updated. Mobile app: ${DashboardPolicy.mobileAccessStatus({...data, assignedAccess:data.access})}. They should sign out and sign in again.`);
  } catch (error) { password.value = ''; message(errorText(error), true); }
  finally { setBusy(false); }
});
async function initializeUsers(detail) {
  const identity = JSON.stringify([detail.user.uid, detail.claims.role, detail.claims.access, detail.claims.approved, detail.claims.departments]);
  if (identity === lastIdentity) return;
  lastIdentity = identity;
  generation++;
  const epoch = generation;
  request = null; editor.hidden = true;
  document.querySelector('#users-list').replaceChildren();
  document.querySelector('#user-password').value = '';
  actorClaims = detail.claims; actorUid = detail.user.uid;
  const workspaceView = DashboardPolicy.workspace(actorUid, actorClaims);
  document.querySelector('#dashboard-role').textContent = workspaceView.title.toUpperCase();
  document.querySelector('#dashboard-title').textContent = workspaceView.title;
  document.querySelector('#dashboard-description').textContent = workspaceView.description;
  usersTab.textContent = workspaceView.users;
  document.querySelector('#users-title').textContent = workspaceView.users;
  const manager = isSuper() || actorClaims.role === 'admin';
  usersTab.hidden = !manager;
  if (manager && window.location?.hash === '#users') selectTab(true);
  const tourismAllowed = DashboardPolicy.hasAccess(actorUid, actorClaims, 'tourism');
  tourismTab.hidden = !tourismAllowed;
  if (!tourismAllowed && !tourismPanel.hidden) selectTab(false);
  if (tourismAllowed && window.location?.hash === '#tourism') selectTab('tourism');
  if (!manager) selectTab(false);
  const assigned = isSuper() ? Object.keys(DashboardPolicy.departments) : (actorClaims.departments || []);
  const menuSections = [...assigned];
  if (!menuSections.includes('attendance') && (actorClaims.role === 'admin' || DashboardPolicy.hasAccess(actorUid, actorClaims, 'attendance'))) menuSections.push('attendance');
  document.querySelector('#workspace-summary').textContent = isSuper()
    ? 'You control all department admins, dashboard sections and account approvals.'
    : actorClaims.role === 'admin' ? 'Manage your assigned departments and their regular users.' : 'Your assigned services are listed below. Account management belongs to your department admin.';
  const workspace = document.querySelector('#department-workspace'); workspace.replaceChildren();
  menuSections.filter(key => key === 'attendance' && actorClaims.role === 'admin' || DashboardPolicy.hasAccess(actorUid, actorClaims, key)).forEach(key => {
    const label = document.createElement('button'); label.type = 'button'; label.className = 'department-link'; label.setAttribute('data-department', key);
    const name = document.createElement('span'); name.textContent = DashboardPolicy.departments[key];
    const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    const detail = document.createElement('small'); detail.textContent = key === 'tourism' ? 'Visitors & department reports' : key === 'rhu' ? 'Patient care & pharmacy' : key === 'attendance' ? 'Daily attendance workspace' : 'Department workspace';
    label.append(name, arrow, detail); label.addEventListener('click', () => selectTab(key)); workspace.append(label);
  });
  document.querySelector('#user-management').hidden = !manager;
  if (manager) { setBusy(true); message('Loading user list and account settings…'); }
  document.querySelector('#manager-description').textContent = manager
    ? (isSuper() ? 'Assign department admins and their visible sections. Route unassigned registrations to a department, or approve accounts here. The super admin account is protected.' : 'Approve and manage regular users in your assigned departments. Admin assignments and department transfers are controlled by the super admin.')
    : 'Contact your department administrator to change your account access.';
  if (!manager) return;
  try {
    const [{ auth }, { getFunctions, httpsCallable }] = await Promise.all([
      import('./firebase-client.js'), import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')
    ]);
    if (epoch !== generation) return;
    const functions = getFunctions(auth.app, 'asia-southeast1');
    request = async (name, data) => (await httpsCallable(functions, name)(data)).data;
    setBusy(false); resetForm(); await loadUsers();
  } catch {
    if (epoch !== generation) return;
    lastIdentity = null;
    message('Could not load user management. Check your connection, then press Refresh users to retry.', true);
    document.querySelector('#refresh-users').disabled = false;
  }
}
document.addEventListener('dashboard-ready', event => initializeUsers(event.detail));
if (window.dashboardSession) initializeUsers(window.dashboardSession);
window.addEventListener('pagehide', () => { generation++; document.querySelector('#user-password').value = ''; });

document.addEventListener('dashboard-denied', () => {
  generation++; lastIdentity = null; request = null; editor.hidden = true;
  document.querySelector('#users-list').replaceChildren();
  document.querySelector('#user-password').value = '';
  document.querySelector('#user-management').hidden = true;
  tourismTab.hidden = true; usersTab.hidden = true; selectTab(false);
});

document.addEventListener('department-navigate', event => {
  const key = event.detail;
  if (window.dashboardSession && (key === 'overview' || key === 'attendance' && window.dashboardSession.claims.role === 'admin' || DashboardPolicy.hasAccess(window.dashboardSession.user.uid, window.dashboardSession.claims, key))) selectTab(key);
});
