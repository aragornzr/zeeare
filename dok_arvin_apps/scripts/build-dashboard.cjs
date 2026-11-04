const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.resolve(root, '../Web dashboard');
const output = path.join(root, 'build/web-dashboard');
const pages = ['index.html', 'login.html', 'dashboard.html', 'super-admin.html', 'department-admin.html', 'user-dashboard.html'];
const assets = [
  'styles.css', 'dashboard-theme.css', 'script.js', 'firebase-client.js',
  'auth-page.js', 'dashboard-policy.js', 'users-page.js', 'intro-pages.js',
  'tourism-destinations-page.js', 'communications-page.js', 'history-page.js',
  'tourism-report.js', 'departments-page.js', 'attendance-page.js', 'tourism-fee-page.js'
];
require(path.join(source, 'build-dashboard-pages.cjs'));
fs.mkdirSync(output, {recursive: true});
for (const name of [...pages, ...assets]) fs.copyFileSync(path.join(source, name), path.join(output, name));
fs.cpSync(path.join(source, 'assets'), path.join(output, 'assets'), {recursive: true});
console.log(`Prepared ${pages.length} dashboard pages and their assets in build/web-dashboard.`);
