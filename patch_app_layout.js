const fs = require('fs');
const path = require('path');

// 1. Update App.tsx
const appPath = path.join(__dirname, 'src', 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf-8');
appContent = appContent.replace(/\r\n/g, '\n');

// Import RetakeManager
appContent = appContent.replace(
  `const ScoreImport = lazy(() => import('./pages/ScoreImport'));`,
  `const ScoreImport = lazy(() => import('./pages/ScoreImport'));
const RetakeManager = lazy(() => import('./pages/RetakeManager').then(m => ({ default: m.RetakeManager })));`
);

// Add Route
appContent = appContent.replace(
  `<Route path="/manager/assignments" element={<AssignmentManager />} />`,
  `<Route path="/manager/assignments" element={<AssignmentManager />} />
          <Route path="/manager/retakes" element={<RetakeManager />} />`
);

fs.writeFileSync(appPath, appContent, 'utf-8');
console.log('Patched App.tsx');

// 2. Update AdminLayout.tsx
const layoutPath = path.join(__dirname, 'src', 'components', 'AdminLayout.tsx');
let layoutContent = fs.readFileSync(layoutPath, 'utf-8');
layoutContent = layoutContent.replace(/\r\n/g, '\n');

// Add import for CalendarClock or similar icon, wait, let's just use existing imports or import CalendarClock from lucide-react.
// Actually, `lucide-react` is used. We can just add CalendarClock if it's not there, or use Calendar
layoutContent = layoutContent.replace(
  `import { Users, FileText, Database, Settings as SettingsIcon, LogOut, CheckSquare, List, History, User, Upload } from 'lucide-react';`,
  `import { Users, FileText, Database, Settings as SettingsIcon, LogOut, CheckSquare, List, History, User, Upload, Calendar } from 'lucide-react';`
);

// Add menu item for Retakes
const menuOld = `  { path: '/manager/students', label: 'Quản lý Học viên', icon: Users, roles: ['ADMIN', 'MANAGER'] },`;
const menuNew = `  { path: '/manager/students', label: 'Quản lý Học viên', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  { path: '/manager/retakes', label: 'Tổ chức Thi lại', icon: Calendar, roles: ['ADMIN', 'MANAGER'] },`;

layoutContent = layoutContent.replace(menuOld, menuNew);

fs.writeFileSync(layoutPath, layoutContent, 'utf-8');
console.log('Patched AdminLayout.tsx');
