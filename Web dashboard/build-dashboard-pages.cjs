// Keep all three role entry pages aligned with the shared dashboard layout.
const fs = require('node:fs');
const path = require('node:path');
const {workspace, superUid} = require('./dashboard-policy');
const source = fs.readFileSync(path.join(__dirname,'dashboard.html'),'utf8');
for (const [uid, claims] of [[superUid,{role:'superadmin'}],['department-admin',{role:'admin'}],['worker',{role:'regular'}]]) {
  const view = workspace(uid, claims);
  const html = source.replace('<title>Web Dashboard | San Antonio</title>', `<title>${view.title} | San Antonio</title>`)
    .replace('data-page="dashboard"', `data-page="dashboard" data-dashboard-role="${view.key}"`);
  fs.writeFileSync(path.join(__dirname,view.path),html);
}
