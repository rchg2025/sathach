const fs = require('fs');
const path = require('path');

const managerPath = path.join(__dirname, 'api', 'routes', 'manager.ts');
let content = fs.readFileSync(managerPath, 'utf-8');
content = content.replace(/\r\n/g, '\n');

// 1. Line 1066
content = content.replace(
  `    let testResult = await prisma.testResult.findUnique({
      where: { studentId_testTypeId: { studentId: Number(studentId), testTypeId: Number(testTypeId) } }
    });`,
  `    let testResult = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) },
      orderBy: { createdAt: 'desc' }
    });`
);

// 2. Line 1106
content = content.replace(
  `    const testResult = await prisma.testResult.findUnique({
      where: { studentId_testTypeId: { studentId: Number(studentId), testTypeId: Number(testTypeId) } },
      include: { scores: true }
    });`,
  `    const testResult = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) },
      orderBy: { createdAt: 'desc' },
      include: { scores: true }
    });`
);

// 3. Line 1128
content = content.replace(
  `    let testResult = await prisma.testResult.findUnique({
      where: { studentId_testTypeId: { studentId: Number(studentId), testTypeId: Number(testTypeId) } }
    });`,
  `    let testResult = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) },
      orderBy: { createdAt: 'desc' }
    });`
);

// 4. Line 1163
content = content.replace(
  `    const testResult = await prisma.testResult.findUnique({
      where: { studentId_testTypeId: { studentId: Number(studentId), testTypeId: Number(testTypeId) } }
    });`,
  `    const testResult = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) },
      orderBy: { createdAt: 'desc' }
    });`
);

// 5. Line 1381
content = content.replace(
  `      // Check if test result already exists
      const existingResult = await prisma.testResult.findUnique({
        where: {
          studentId_testTypeId: { studentId: student.id, testTypeId: testType.id }
        }
      });`,
  `      // Check if test result already exists
      const existingResult = await prisma.testResult.findFirst({
        where: {
          studentId: student.id, testTypeId: testType.id
        },
        orderBy: { createdAt: 'desc' }
      });`
);

fs.writeFileSync(managerPath, content, 'utf-8');
console.log('Replaced findUnique with findFirst successfully.');
