const fs = require('fs');
const path = require('path');

const managerPath = path.join(__dirname, 'api', 'routes', 'manager.ts');
let managerContent = fs.readFileSync(managerPath, 'utf-8');
managerContent = managerContent.replace(/\r\n/g, '\n');

// Patch manager.ts start-test
const startTestSearch = `    if (testResult) {
      testResult = await prisma.testResult.update({
        where: { id: testResult.id },
        data: { 
          status: 'IN_PROGRESS', 
          vehicleId: Number(vehicleId),
          stationManagerId: stationManagerId ? Number(stationManagerId) : null,
          startTime: new Date()
        }
      });
    } else {
      testResult = await prisma.testResult.create({
        data: { 
          studentId: Number(studentId), 
          testTypeId: Number(testTypeId), 
          vehicleId: Number(vehicleId),
          status: 'IN_PROGRESS',
          stationManagerId: stationManagerId ? Number(stationManagerId) : null,
          startTime: new Date()
        }
      });
    }`;

const startTestReplace = `    const testType = await prisma.testType.findUnique({ where: { id: Number(testTypeId) } });
    const maxScore = testType?.maxScore || 100;

    if (testResult) {
      testResult = await prisma.testResult.update({
        where: { id: testResult.id },
        data: { 
          status: 'IN_PROGRESS', 
          vehicleId: Number(vehicleId),
          stationManagerId: stationManagerId ? Number(stationManagerId) : null,
          startTime: new Date(),
          totalScore: testResult.status === 'PENDING' ? maxScore : testResult.totalScore
        }
      });
    } else {
      testResult = await prisma.testResult.create({
        data: { 
          studentId: Number(studentId), 
          testTypeId: Number(testTypeId), 
          vehicleId: Number(vehicleId),
          status: 'IN_PROGRESS',
          totalScore: maxScore,
          stationManagerId: stationManagerId ? Number(stationManagerId) : null,
          startTime: new Date()
        }
      });
    }`;

managerContent = managerContent.replace(startTestSearch, startTestReplace);
fs.writeFileSync(managerPath, managerContent, 'utf-8');
console.log('Patched manager.ts');

const examinerApiPath = path.join(__dirname, 'api', 'routes', 'examiner.ts');
let examinerApiContent = fs.readFileSync(examinerApiPath, 'utf-8');
examinerApiContent = examinerApiContent.replace(/\r\n/g, '\n');

// Patch examiner.ts for studentData
examinerApiContent = examinerApiContent.replace(
  `              currentExam: { name: result.testType.name, testTypeId: result.testTypeId }, \n              testResultId: result.id,`,
  `              currentExam: { name: result.testType.name, testTypeId: result.testTypeId }, \n              testType: result.testType,\n              testResultId: result.id,`
);

examinerApiContent = examinerApiContent.replace(
  `              currentExam: activeExamToUse, \n              allAvailableExams: myUncompletedExams,\n              testResultId: result.id,`,
  `              currentExam: activeExamToUse, \n              testType: result.testType,\n              allAvailableExams: myUncompletedExams,\n              testResultId: result.id,`
);

fs.writeFileSync(examinerApiPath, examinerApiContent, 'utf-8');
console.log('Patched examiner.ts');

const examinerUiPath = path.join(__dirname, 'src', 'pages', 'ExaminerDashboard.tsx');
let examinerUiContent = fs.readFileSync(examinerUiPath, 'utf-8');
examinerUiContent = examinerUiContent.replace(/\r\n/g, '\n');

// Patch ExaminerDashboard.tsx
examinerUiContent = examinerUiContent.replace(
  `    setBaseScore(tr ? tr.totalScore : 100);`,
  `    setBaseScore(tr ? tr.totalScore : (student.testType?.maxScore || 100));`
);

examinerUiContent = examinerUiContent.replace(
  `                color: currentScore >= 80 ? 'var(--success)' : 'var(--danger)',`,
  `                color: currentScore >= (selectedStudent.testType?.passingScore || 80) ? 'var(--success)' : 'var(--danger)',`
);

examinerUiContent = examinerUiContent.replace(
  `                const score = tr ? tr.totalScore : 100;`,
  `                const score = tr ? tr.totalScore : (s.testType?.maxScore || 100);`
);

fs.writeFileSync(examinerUiPath, examinerUiContent, 'utf-8');
console.log('Patched ExaminerDashboard.tsx');
