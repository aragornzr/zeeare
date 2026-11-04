/* Shared department definitions and permission checks for the dashboard. */
const DashboardPolicy = (() => {
  const superUid = 'z9I3AD77p5PWJjsP2Ae27nW7Tze2';
  const departments = {tourism:'Tourism', engineering:'Engineering', rhu:'RHU', mswd:'MSWD', treasurer:'Treasurer', hrmo:'HRMO', mao:'MAO', attendance:'Attendance'};
  const sectionDepartment = {tourism:'tourism', engineering:'engineering', rhu:'rhu', patients:'rhu', pharmacy:'rhu', mswd:'mswd', treasurer:'treasurer', hrmo:'hrmo', mao:'mao', attendance:'attendance'};
  const isSuper = (uid, claims) => uid === superUid && claims.role === 'superadmin';
  function hasAccess(uid, claims, section) {
    if (isSuper(uid, claims)) return true;
    const assigned = Array.isArray(claims.departments) ? claims.departments.filter(key => key in departments) : [];
    return claims.approved === true && assigned.length > 0 && claims.access?.[section] === true &&
      (section === 'attendance' || !sectionDepartment[section] || assigned.includes(sectionDepartment[section]));
  }
  function workspace(uid, claims) {
    if (isSuper(uid, claims)) return {key:'superadmin', path:'super-admin.html', title:'Super admin dashboard', description:'Manage department admins, account approvals and access across all departments.', users:'All accounts & permissions'};
    if (claims.role === 'admin') return {key:'admin', path:'department-admin.html', title:'Department admin dashboard', description:'Manage regular users and services within your assigned departments.', users:'Department users'};
    return {key:'regular', path:'user-dashboard.html', title:'Regular user dashboard', description:'Open your assigned services. Contact your department admin for account changes.', users:''};
  }
  function mobileAccessStatus(user) {
    if (user.disabled) return 'Account disabled';
    if (!user.approved) return 'Blocked: account approval is off';
    if (!user.departments.length) return 'Blocked: no assigned department';
    if (!user.assignedAccess.apps) return 'Blocked: Mobile app access is off';
    if (!Object.entries(sectionDepartment).some(([section, department]) => (section === 'attendance' || user.departments.includes(department)) && user.assignedAccess[section])) return 'Blocked: no department service enabled';
    return 'Ready for assigned services';
  }
  return {superUid, departments, sectionDepartment, isSuper, hasAccess, workspace, mobileAccessStatus};
})();
if (typeof module !== 'undefined') module.exports = DashboardPolicy;
