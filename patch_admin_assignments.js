const fs = require('fs');
const path = require('path');

const managerPath = path.join(__dirname, 'api', 'routes', 'manager.ts');
let managerContent = fs.readFileSync(managerPath, 'utf-8');
managerContent = managerContent.replace(/\r\n/g, '\n');

const searchAdmin = `    if (role === 'ADMIN' || role === 'MANAGER') {
      // Admin/Manager can see all students
      studentWhere = {}; 
    } else if (role === 'STATION_MANAGER') {`;

const replaceAdmin = `    if (role === 'ADMIN' || role === 'MANAGER') {
      // Admin/Manager can see all students
      studentWhere = {}; 
      // Admin/Manager needs assignments to know which test types are active today
      assignments = await prisma.testAssignment.findMany({
        where: { 
          examiner: { role: 'STATION_MANAGER' },
          OR: [
            { assignmentDate: null },
            { assignmentDate: { gte: todayUtcMidnight } }
          ]
        },
        include: { testType: true, course: true, vehicles: true }
      });
    } else if (role === 'STATION_MANAGER') {`;

managerContent = managerContent.replace(searchAdmin, replaceAdmin);
fs.writeFileSync(managerPath, managerContent, 'utf-8');
console.log('Patched manager.ts for admin assignments');
