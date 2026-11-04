const policy = require('./access-policy');
function snapshot(user) {
  const value = policy.publicUser(user);
  return Object.fromEntries(['username', 'email', 'role', 'departments', 'approved', 'disabled', 'assignedAccess'].map(key => [key, value[key]]));
}
function differences(before, after, passwordChanged) {
  const changes = Object.keys(after).filter(key => JSON.stringify(before?.[key]) !== JSON.stringify(after[key]))
    .map(field => ({field, before: before?.[field] ?? null, after: after[field]}));
  if (passwordChanged) changes.push({field: 'password', before: null, after: 'Changed (value never stored)'});
  return changes;
}
module.exports = {snapshot, differences};

function loginDevice(input) {
  if (input === undefined) return {platform:'unknown', manufacturer:'', model:'Not reported', osVersion:''};
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new policy.PolicyError('invalid-argument','Invalid device details.');
  const keys = ['platform','manufacturer','model','osVersion'];
  if (Object.keys(input).some(key => !keys.includes(key)) || Object.values(input).some(value => typeof value !== 'string' || value.length > 120 || /[\u0000-\u001f]/.test(value))) throw new policy.PolicyError('invalid-argument','Invalid device details.');
  if (!['android','ios','web','macos','windows','linux','unknown'].includes(input.platform)) throw new policy.PolicyError('invalid-argument','Invalid device platform.');
  return Object.fromEntries(keys.map(key=>[key,(input[key] || '').trim()]));
}
function canReadHistory(actor, target) {
  policy.assertManager(actor);
  return policy.isSuper(actor) || actor.uid === target.uid || policy.canSee(actor,target);
}
function canReadEvent(actor, event) {
  if (policy.isSuper(actor)) return true;
  const assigned = policy.departmentsOf(actor);
  const scopes = [event.departments,event.before?.departments,event.after?.departments].filter(value=>Array.isArray(value) && value.length);
  return scopes.length > 0 && scopes.every(scope=>scope.every(department=>assigned.includes(department)));
}
module.exports.loginDevice = loginDevice;
module.exports.canReadHistory = canReadHistory;
module.exports.canReadEvent = canReadEvent;
