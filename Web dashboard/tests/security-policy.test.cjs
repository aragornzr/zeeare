const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('every account entry page restricts scripts, embeds, form destinations and referrers', () => {
  for (const page of ['login.html', 'dashboard.html', 'super-admin.html', 'department-admin.html', 'user-dashboard.html']) {
    const html = fs.readFileSync(page, 'utf8');
    const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
    assert.ok(policy, `${page} needs a content security policy`);
    const directives = Object.fromEntries(policy.split(';').map(value => {
      const [name, ...sources] = value.trim().split(/\s+/);
      return [name, sources];
    }));
    assert.deepEqual(directives['script-src'], ["'self'", 'https://www.gstatic.com']);
    assert.deepEqual(directives['object-src'], ["'none'"]);
    assert.deepEqual(directives['base-uri'], ["'none'"]);
    assert.deepEqual(directives['form-action'], ["'self'"]);
    assert.ok(html.includes('name="referrer" content="no-referrer"'));
    assert.ok(!/<script\b[^>]*>\s*[^<\s]/i.test(html), 'account pages must use external scripts');
  }
});
