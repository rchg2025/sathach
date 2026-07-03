const fs = require('fs');
const path = require('path');

const managerPath = path.join(__dirname, 'api', 'routes', 'manager.ts');
let content = fs.readFileSync(managerPath, 'utf-8');
content = content.replace(/\r\n/g, '\n');

// Find the students query and remove the date filter on testResults
const oldQuery = `    const students = await prisma.student.findMany({
      where: studentWhere,
      include: { 
        course: true, 
        testResults: {
          where: {
            createdAt: {
              gte: targetDateMidnight,
              lt: nextDateMidnight
            }
          },
          include: { 
            stationManager: true, 
            vehicle: true, 
            testType: true,
            scores: {
              include: {
                criterion: {
                  include: { exam: true }
                }
              }
            }
          }
        }
      },
      orderBy: { id: 'desc' },
      take: 200 // Limit to avoid massive payloads for admin
    });`;

const newQuery = `    const students = await prisma.student.findMany({
      where: studentWhere,
      include: { 
        course: true, 
        testResults: {
          include: { 
            stationManager: true, 
            vehicle: true, 
            testType: true,
            scores: {
              include: {
                criterion: {
                  include: { exam: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { id: 'desc' },
      take: 500 // Limit to avoid massive payloads for admin
    });`;

content = content.replace(oldQuery, newQuery);

fs.writeFileSync(managerPath, content, 'utf-8');
console.log('Patched manager.ts: removed date filter on testResults');
