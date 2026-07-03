const fs = require('fs');
const path = require('path');

// 1. Fix AdminLayout.tsx double hr
const layoutPath = path.join(__dirname, 'src', 'components', 'AdminLayout.tsx');
let layoutContent = fs.readFileSync(layoutPath, 'utf-8');
layoutContent = layoutContent.replace(/\r\n/g, '\n');

const oldHrLogic = `          <hr style={{ margin: '0.5rem 1rem', borderColor: 'var(--border)' }} />
          
          {((user?.role === 'ADMIN' || user?.username === 'quantri') || (user?.role === 'MANAGER' || user?.username === 'quantri')) && (
            <>
              <Link to="/manager/categories" className={\`sidebar-item \${isActive('/manager/categories')}\`} onClick={closeSidebar}>
                <BookOpen size={20} /> <span className="sidebar-item-text">Quản lý Danh mục</span>
              </Link>`;

const newHrLogic = `          {((user?.role === 'ADMIN' || user?.username === 'quantri') || (user?.role === 'MANAGER' || user?.username === 'quantri')) && (
            <>
              <hr style={{ margin: '0.5rem 1rem', borderColor: 'var(--border)' }} />
              <Link to="/manager/categories" className={\`sidebar-item \${isActive('/manager/categories')}\`} onClick={closeSidebar}>
                <BookOpen size={20} /> <span className="sidebar-item-text">Quản lý Danh mục</span>
              </Link>`;

layoutContent = layoutContent.replace(oldHrLogic, newHrLogic);
fs.writeFileSync(layoutPath, layoutContent, 'utf-8');

// 2. Fix manager.ts /system-logs bug
const managerPath = path.join(__dirname, 'api', 'routes', 'manager.ts');
let managerContent = fs.readFileSync(managerPath, 'utf-8');
managerContent = managerContent.replace(/\r\n/g, '\n');

// On line 1256 it uses targetDateMidnight and nextDateMidnight which are undefined!
// We should define targetDateMidnight and nextDateMidnight before line 1250, or just use todayUtcMidnight.
// Actually, nextDateMidnight is just todayUtcMidnight + 1 day.
const oldSmAssignmentsQuery = `    if (role === 'ADMIN' || role === 'MANAGER') {
      const users = await prisma.user.findMany({
        where: role === 'MANAGER' ? { role: { in: ['MANAGER', 'STATION_MANAGER', 'EXAMINER'] } } : {}
      });
      userIdsToFetch = users.map(u => u.id);
    } else if (role === 'STATION_MANAGER') {
      // Find assignments for this station manager today or null date
      const smAssignments = await prisma.testAssignment.findMany({
        where: {
          examinerId: Number(userId),
          OR: [
            { assignmentDate: null },
            { 
              assignmentDate: { 
                gte: targetDateMidnight,
                lt: nextDateMidnight
              } 
            }
          ]
        }
      });`;

const newSmAssignmentsQuery = `    if (role === 'ADMIN' || role === 'MANAGER') {
      const users = await prisma.user.findMany({
        where: role === 'MANAGER' ? { role: { in: ['MANAGER', 'STATION_MANAGER', 'EXAMINER'] } } : {}
      });
      userIdsToFetch = users.map(u => u.id);
    } else if (role === 'STATION_MANAGER') {
      // Find assignments for this station manager today or null date
      const nextDateMidnight = new Date(todayUtcMidnight);
      nextDateMidnight.setDate(nextDateMidnight.getDate() + 1);
      
      const smAssignments = await prisma.testAssignment.findMany({
        where: {
          examinerId: Number(userId),
          OR: [
            { assignmentDate: null },
            { 
              assignmentDate: { 
                gte: todayUtcMidnight,
                lt: nextDateMidnight
              } 
            }
          ]
        }
      });`;

managerContent = managerContent.replace(oldSmAssignmentsQuery, newSmAssignmentsQuery);

// Wait! Also on line 1273 it uses `todayUtcMidnight` but with only `gte`.
const oldExaminerQuery = `        const examinerAssignments = await prisma.testAssignment.findMany({
          where: {
            testTypeId: { in: assignedTestTypeIds },
            OR: [
              { assignmentDate: null },
              { assignmentDate: { gte: todayUtcMidnight } }
            ]
          },
          include: { examiner: true }
        });`;

const newExaminerQuery = `        const examinerAssignments = await prisma.testAssignment.findMany({
          where: {
            testTypeId: { in: assignedTestTypeIds },
            OR: [
              { assignmentDate: null },
              { 
                assignmentDate: { 
                  gte: todayUtcMidnight,
                  lt: nextDateMidnight
                } 
              }
            ]
          },
          include: { examiner: true }
        });`;
        
managerContent = managerContent.replace(oldExaminerQuery, newExaminerQuery);

// Wait, the user also wants to see themselves (the Station Manager).
// Currently `userIdsToFetch` only contains EXAMINERs. We should also push the STATION_MANAGER's ID so they see their own logs.
const oldSetUserIds = `        const examiners = examinerAssignments.map(a => a.examiner).filter(u => u && u.role === 'EXAMINER');
        userIdsToFetch = [...new Set(examiners.map(e => e.id))];`;
const newSetUserIds = `        const examiners = examinerAssignments.map(a => a.examiner).filter(u => u && u.role === 'EXAMINER');
        userIdsToFetch = [...new Set([...examiners.map(e => e.id), Number(userId)])];`;

managerContent = managerContent.replace(oldSetUserIds, newSetUserIds);

fs.writeFileSync(managerPath, managerContent, 'utf-8');
console.log('Fixed AdminLayout.tsx and manager.ts');
