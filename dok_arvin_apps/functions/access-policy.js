const SUPER_ADMIN_UID = 'z9I3AD77p5PWJjsP2Ae27nW7Tze2';
const ROLES = ['superadmin', 'admin', 'regular'];
const DEPARTMENTS = ['tourism', 'engineering', 'rhu', 'mswd', 'treasurer', 'hrmo', 'mao', 'attendance'];
const SECTION_DEPARTMENT = {tourism:'tourism', engineering:'engineering', rhu:'rhu', patients:'rhu', pharmacy:'rhu', mswd:'mswd', treasurer:'treasurer', hrmo:'hrmo', mao:'mao', attendance:'attendance'};
const SECTIONS = ['dashboard', 'apps', ...Object.keys(SECTION_DEPARTMENT)];
class PolicyError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function isSuper(user) { return user?.uid === SUPER_ADMIN_UID && user.customClaims?.role === 'superadmin'; }
function roleOf(user) {
  if (isSuper(user)) return 'superadmin';
  return user?.customClaims?.role === 'admin' ? 'admin' : 'regular';
}
function departmentsOf(user) {
  const value = user?.customClaims?.departments;
  return Array.isArray(value) ? DEPARTMENTS.filter(key => value.includes(key)) : [];
}
function approvedOf(user) { return isSuper(user) || user?.customClaims?.approved === true; }
function accessOf(user) {
  const departments = departmentsOf(user);
  return Object.fromEntries(SECTIONS.map(key => [key, !user?.disabled && approvedOf(user) &&
    (isSuper(user) || (user?.customClaims?.access?.[key] === true && departments.length > 0 &&
      (key === 'attendance' || !SECTION_DEPARTMENT[key] || departments.includes(SECTION_DEPARTMENT[key]))))]));
}
function assertManager(actor) {
  if (!actor || actor.disabled || !['superadmin', 'admin'].includes(roleOf(actor)) || !(accessOf(actor).dashboard || accessOf(actor).apps)) {
    throw new PolicyError('permission-denied', 'Approved department administrator access is required.');
  }
}
function validateInput(input, creating) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PolicyError('invalid-argument', 'Invalid user details.');
  const allowed = ['uid', 'username', 'email', 'password', 'role', 'access', 'disabled', 'approved', 'departments'];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new PolicyError('invalid-argument', 'Unknown user field.');
  if (!creating && (typeof input.uid !== 'string' || input.uid.length < 1 || input.uid.length > 128)) throw new PolicyError('invalid-argument', 'Select a user.');
  if (typeof input.username !== 'string' || !input.username.trim() || input.username.trim().length > 80) throw new PolicyError('invalid-argument', 'Username must contain 1–80 characters.');
  if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) throw new PolicyError('invalid-argument', 'Enter a valid email address.');
  if (!ROLES.includes(input.role) || typeof input.disabled !== 'boolean' || typeof input.approved !== 'boolean') throw new PolicyError('invalid-argument', 'Select a valid role, approval and account status.');
  if (!Array.isArray(input.departments) || input.departments.length > DEPARTMENTS.length || new Set(input.departments).size !== input.departments.length || input.departments.some(key => !DEPARTMENTS.includes(key))) throw new PolicyError('invalid-argument', 'Select valid departments.');
  if (input.role === 'regular' && input.departments.length > 1) throw new PolicyError('invalid-argument', 'A regular user belongs to one department.');
  if (input.role !== 'superadmin' && (input.approved || input.role === 'admin') && input.departments.length === 0) throw new PolicyError('invalid-argument', 'Assign a department before approving an account or assigning an admin.');
  if (!input.access || typeof input.access !== 'object' || Array.isArray(input.access) || Object.keys(input.access).some(key => !SECTIONS.includes(key)) || SECTIONS.some(key => typeof input.access[key] !== 'boolean')) throw new PolicyError('invalid-argument', 'Invalid section permissions.');
  if (input.role !== 'superadmin' && Object.entries(SECTION_DEPARTMENT).some(([key, department]) => key !== 'attendance' && input.access[key] && !input.departments.includes(department))) throw new PolicyError('invalid-argument', 'Section access must belong to an assigned department.');
  if (creating || input.password !== undefined && input.password !== '') {
    if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 128) throw new PolicyError('invalid-argument', 'New passwords must contain 8–128 characters.');
  }
  return { ...input, username: input.username.trim(), email: input.email.trim(), access: { ...input.access }, departments: [...input.departments] };
}
function canSee(actor, target) {
  if (isSuper(actor)) return true;
  const departments = departmentsOf(target);
  return roleOf(target) === 'regular' && target.uid !== SUPER_ADMIN_UID && departments.length === 1 && departmentsOf(actor).includes(departments[0]);
}
function assertCanManage(actor, target, input) {
  assertManager(actor);
  if (target?.uid === SUPER_ADMIN_UID || input.role === 'superadmin') {
    if (!isSuper(actor) || target?.uid !== SUPER_ADMIN_UID || input.role !== 'superadmin' || input.disabled || !input.approved || SECTIONS.some(key => input.access[key] !== true)) {
      throw new PolicyError('permission-denied', 'The protected super admin cannot be created, demoted, disabled or have access removed.');
    }
  }
  if (!isSuper(actor)) {
    if ((target && !canSee(actor, target)) || input.role !== 'regular') throw new PolicyError('permission-denied', 'Department admins may manage regular users in their assigned departments only.');
    const departments = departmentsOf(actor);
    if (input.departments.length !== 1 || !departments.includes(input.departments[0]) || (target && departmentsOf(target)[0] !== input.departments[0])) throw new PolicyError('permission-denied', 'Only the super admin can transfer users between departments.');
    const actorAccess = accessOf(actor);
    if (SECTIONS.some(key => input.access[key] && !actorAccess[key])) throw new PolicyError('permission-denied', 'You cannot grant sections beyond your own assignments.');
  }
}
function claimsFor(actor, target, input) {
  return {...target?.customClaims, role: input.role, access: input.access, departments: input.departments,
    approved: input.approved, approvedBy: input.approved ? actor.uid : null};
}
function publicUser(user) {
  return { uid: user.uid, username: user.displayName || '', email: user.email || '',
    registeredAt: user.metadata?.creationTime || null, lastSignInAt: user.metadata?.lastSignInTime || null,
    role: roleOf(user), access: accessOf(user), assignedAccess: Object.fromEntries(SECTIONS.map(key => [key, isSuper(user) || user.customClaims?.access?.[key] === true])),
    departments: departmentsOf(user), approved: approvedOf(user), protected: user.uid === SUPER_ADMIN_UID, disabled: user.disabled === true };
}
module.exports = { SUPER_ADMIN_UID, ROLES, SECTIONS, DEPARTMENTS, SECTION_DEPARTMENT, PolicyError, isSuper, roleOf, departmentsOf, approvedOf, accessOf, assertManager, validateInput, canSee, assertCanManage, claimsFor, publicUser };

function assertWorkspaceMember(user, department) {
  if (!DEPARTMENTS.includes(department)) throw new PolicyError('invalid-argument', 'Select a valid department.');
  if (!user || user.disabled || !approvedOf(user) || (!isSuper(user) && (!departmentsOf(user).includes(department) || !(accessOf(user).apps || accessOf(user).dashboard)))) throw new PolicyError('permission-denied', 'Approved access to this department is required.');
}
module.exports.assertWorkspaceMember = assertWorkspaceMember;
