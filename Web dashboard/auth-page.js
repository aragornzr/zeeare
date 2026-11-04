(async () => {
  const status = document.querySelector('#auth-status');
  const isLogin = document.body.dataset.page === 'login';
  const form = document.querySelector('#login-form');
  const signInButton = document.querySelector('#sign-in');
  const signOutButton = document.querySelector('#sign-out');
  let signingIn = false;
  let signingOut = false;
  let publishedAccess;

  function browserDevice() {
    const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent || '';
    const platform = /Android/i.test(agent) ? 'android' : /iPhone|iPad|iPod/i.test(agent) ? 'ios' : 'web';
    const model = /iPhone/i.test(agent) ? 'iPhone browser' : /iPad/i.test(agent) ? 'iPad browser' : /Android/i.test(agent) ? 'Android browser' : 'Web browser';
    const version = agent.match(/(?:Android |OS )([\d_.]+)/)?.[1]?.replaceAll('_','.') || '';
    return {platform, model, manufacturer: platform === 'ios' ? 'Apple' : '', osVersion: version};
  }

  function publishAccess(detail, identityDetail = detail) {
    window.dashboardSession = detail;
    const identity = document.querySelector('#session-identity');
    if (identity) {
      identity.hidden = !identityDetail;
      if (identityDetail) {
        document.querySelector('#session-name').textContent = identityDetail.user.displayName || identityDetail.user.email || 'Registered user';
        document.querySelector('#session-role').textContent = identityDetail.claims ? DashboardPolicy.workspace(identityDetail.user.uid,identityDetail.claims).title.replace(' dashboard','') : 'Role unavailable';
      } else {
        document.querySelector('#session-name').textContent = '';
        document.querySelector('#session-role').textContent = '';
      }
    }
    // Token iat/exp change on every forced refresh. Only account/permission
    // changes should reinitialize editors and discard their in-memory drafts.
    const accessIdentity = detail ? JSON.stringify([
      detail.user.uid, detail.claims.role, detail.claims.approved === true,
      Object.keys(DashboardPolicy.departments).filter(key => Array.isArray(detail.claims.departments) && detail.claims.departments.includes(key)),
      ['dashboard', 'apps', ...Object.keys(DashboardPolicy.sectionDepartment)]
        .map(key => detail.claims.access?.[key] === true)
    ]) : null;
    if (accessIdentity === publishedAccess) return;
    publishedAccess = accessIdentity;
    document.dispatchEvent(new CustomEvent(detail ? 'dashboard-ready' : 'dashboard-denied', { detail }));
  }

  function showError(message) {
    status.textContent = message;
    status.classList.add('error');
  }
  function errorMessage(error) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-email': return 'Unable to sign in. Check your email and password and try again.';
      case 'auth/user-disabled': return 'This account has been disabled. Contact your administrator.';
      case 'auth/too-many-requests': return 'Too many attempts. Please wait a few minutes and try again.';
      case 'auth/network-request-failed': return 'Could not connect. Check your internet connection and try again.';
      case 'auth/operation-not-allowed': return 'Email and password sign-in is not enabled. Contact your administrator.';
      case 'auth/web-storage-unsupported': return 'Allow browser storage to sign in and save your session.';
      default: return 'Sign-in is unavailable right now. Please try again.';
    }
  }

  // Capture submit even while initialization is pending.
  form?.addEventListener('submit', event => event.preventDefault());
  try {
    const firebase = await import('./firebase-client.js');
    const { auth, onAuthStateChanged, setPersistence, browserLocalPersistence,
      browserSessionPersistence, signInWithEmailAndPassword, signOut } = firebase;

    signOutButton?.addEventListener('click', async () => {
      if (signingOut) return;
      signingOut = true;
      signOutButton.disabled = true;
      signOutButton.textContent = 'Signing out…';
      status.classList.remove('error');
      status.textContent = 'Signing out…';
      document.querySelector('#dashboard-content').hidden = true;
      publishAccess(null);
      try {
        await signOut(auth);
        window.location.replace('login.html');
      } catch {
        signingOut = false;
        signOutButton.disabled = false;
        signOutButton.textContent = 'Sign out';
        if (auth.currentUser) await checkDashboardAccess(auth.currentUser);
        showError('Could not sign out. Please try again.');
      }
    });

    let checkingAccess = false;
    let accessGeneration = 0;
    let sessionUid;
    let pageSuspended = false;
    let recordedSession = null;
    async function recordLogin(user) {
      const token = await user.getIdTokenResult();
      const session = `${user.uid}:${token.claims.auth_time}`;
      if (recordedSession === session) return;
      const {getFunctions, httpsCallable} = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js');
      await httpsCallable(getFunctions(auth.app, 'asia-southeast1'), 'recordAccountLogin')({source: 'dashboard', device: browserDevice()});
      recordedSession = session;
    }
    async function checkDashboardAccess(user) {
      if (checkingAccess || signingOut || pageSuspended) return;
      checkingAccess = true;
      const generation = ++accessGeneration;
      signOutButton.hidden = false;
      try {
        const token = await user.getIdTokenResult(true);
        if (generation !== accessGeneration || pageSuspended || signingOut || auth.currentUser?.uid !== user.uid) return;
        document.querySelector('#user-email').textContent = user.email || 'Registered user';
        const permitted = DashboardPolicy.hasAccess(user.uid, token.claims, 'dashboard');
        const workspace = DashboardPolicy.workspace(user.uid, token.claims);
        if (permitted && window.location.pathname && !window.location.pathname.endsWith('/' + workspace.path)) {
          window.location.replace(workspace.path);
          return;
        }
        document.querySelector('#dashboard-content').hidden = !permitted;
        status.classList.remove('error');
        status.textContent = permitted ? '' : 'Web dashboard access has not been assigned to your account. Contact an administrator.';
        publishAccess(permitted ? { user, claims: token.claims } : null, {user,claims:token.claims});
        try { await recordLogin(user); } catch { if (permitted && !signingOut && auth.currentUser?.uid === user.uid) status.textContent = 'Signed in. Login history could not be saved; it will retry when access refreshes.'; }
      } catch {
        if (generation !== accessGeneration || pageSuspended || signingOut || auth.currentUser?.uid !== user.uid) return;
        document.querySelector('#dashboard-content').hidden = true;
        publishAccess(null, {user,claims:null});
        showError('Could not verify your dashboard access. Reload to try again.');
      } finally { if (generation === accessGeneration) checkingAccess = false; }
    }
    onAuthStateChanged(auth, user => {
      if (!isLogin && user?.uid !== sessionUid) {
        sessionUid = user?.uid;
        accessGeneration++;
        checkingAccess = false;
        document.querySelector('#dashboard-content').hidden = true;
        publishAccess(null);
      }
      if (isLogin) {
        if (user && !signingIn) window.location.replace('dashboard.html');
        else if (!user && !signingIn) {
          signInButton.disabled = false;
          status.textContent = '';
        }
      } else if (!user) {
        document.querySelector('#dashboard-content').hidden = true;
        signOutButton.hidden = true;
        publishAccess(null);
        window.location.replace('login.html');
      } else { checkDashboardAccess(user); }
    }, () => showError('Could not check your sign-in. Reload this page to try again.'));
    if (!isLogin) {
      const refresh = () => {
        if (auth.currentUser) checkDashboardAccess(auth.currentUser);
        else {
          document.querySelector('#dashboard-content').hidden = true;
          publishAccess(null);
          window.location.replace('login.html');
        }
      };
      let timer;
      const startRefresh = () => {
        if (timer == null) timer = window.setInterval(refresh, 60000);
      };
      startRefresh();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
      window.addEventListener('pagehide', () => {
        pageSuspended = true;
        accessGeneration++;
        checkingAccess = false;
        window.clearInterval(timer);
        timer = null;
        document.querySelector('#dashboard-content').hidden = true;
        publishAccess(null);
      });
      window.addEventListener('pageshow', event => {
        if (!event.persisted) return;
        pageSuspended = false;
        startRefresh();
        refresh();
      });
    }

    form?.addEventListener('submit', async event => {
      event.preventDefault();
      if (signingIn || signInButton.disabled || !form.reportValidity()) return;
      signingIn = true;
      signInButton.disabled = true;
      signInButton.textContent = 'Signing in…';
      status.classList.remove('error');
      status.textContent = 'Checking your account…';
      try {
        await setPersistence(auth, document.querySelector('#save-login').checked
          ? browserLocalPersistence : browserSessionPersistence);
        await signInWithEmailAndPassword(auth,
          document.querySelector('#email').value.trim(), document.querySelector('#password').value);
        document.querySelector('#password').value = '';
        window.location.replace('dashboard.html');
      } catch (error) {
        showError(errorMessage(error));
        signingIn = false;
        signInButton.disabled = false;
        signInButton.textContent = 'Sign in ↗';
      }
    });


  } catch {
    showError('Could not load sign-in. Check your internet connection and reload this page.');
  }
})();
