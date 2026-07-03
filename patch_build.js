const fs = require('fs');
const path = require('path');

// 1. Fix ReportsManager.tsx
const reportsPath = path.join(__dirname, 'src', 'pages', 'ReportsManager.tsx');
let reportsContent = fs.readFileSync(reportsPath, 'utf-8');
reportsContent = reportsContent.replace(/\r\n/g, '\n');

reportsContent = reportsContent.replace(
  `    allTrs.forEach((t: any) => {
      const tDate = new Date(t.createdAt).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }).split(',')[0];
      const fDate = new Date(filterDate).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }).split(',')[0];
      // simplified comparison, filterDate is YYYY-MM-DD
      const tDateObj = new Date(t.createdAt);
      const tDateStr = new Date(tDateObj.getTime() + 7*3600*1000).toISOString().split('T')[0];
      if (tDateStr === filterDate) {
        todayTrs.push(t);
      } else {
        pastTrs.push(t);
      }
    });`,
  `    allTrs.forEach((t: any) => {
      // simplified comparison, filterDate is YYYY-MM-DD
      const tDateObj = new Date(t.createdAt);
      const tDateStr = new Date(tDateObj.getTime() + 7*3600*1000).toISOString().split('T')[0];
      if (tDateStr === filterDate) {
        todayTrs.push(t);
      } else {
        pastTrs.push(t);
      }
    });`
);
fs.writeFileSync(reportsPath, reportsContent, 'utf-8');

// 2. Fix RetakeManager export
const retakePath = path.join(__dirname, 'src', 'pages', 'RetakeManager.tsx');
let retakeContent = fs.readFileSync(retakePath, 'utf-8');
retakeContent = retakeContent.replace(/\r\n/g, '\n');
if (retakeContent.includes('export const RetakeManager =')) {
  retakeContent = retakeContent.replace('export const RetakeManager =', 'const RetakeManager =');
  retakeContent += '\nexport default RetakeManager;\n';
  fs.writeFileSync(retakePath, retakeContent, 'utf-8');
}

// 3. Fix App.tsx
const appPath = path.join(__dirname, 'src', 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf-8');
appContent = appContent.replace(/\r\n/g, '\n');
appContent = appContent.replace(
  `const RetakeManager = lazy(() => import('./pages/RetakeManager').then(m => ({ default: m.RetakeManager })));`,
  `const RetakeManager = lazy(() => import('./pages/RetakeManager'));`
);
fs.writeFileSync(appPath, appContent, 'utf-8');
console.log('Fixed build errors');
