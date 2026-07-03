const fs = require('fs');
const path = require('path');

const managerPath = path.join(__dirname, 'api', 'routes', 'manager.ts');
let managerContent = fs.readFileSync(managerPath, 'utf-8');
managerContent = managerContent.replace(/\r\n/g, '\n');

// Replace the assignment POST logic
const oldPostAssignment = `    for (const tId of tIds) {
      if (!tId) continue;
      
      const whereData: any = {
        examinerId: Number(examinerId),
        testTypeId: Number(tId),
      };
      if (courseId) whereData.courseId = Number(courseId);
      if (assignmentDate) whereData.assignmentDate = new Date(assignmentDate);

      const baseData = { ...whereData };
      if (vehicleIds && Array.isArray(vehicleIds) && vehicleIds.length > 0) {
        baseData.vehicles = { connect: vehicleIds.map((vId: any) => ({ id: Number(vId) })) };
      }

      if (examIds && Array.isArray(examIds) && examIds.length > 0) {
        for (const eId of examIds) {
          const recordWhere = { ...whereData, examId: Number(eId) };
          const existing = await prisma.testAssignment.findFirst({ where: recordWhere });
          if (existing) {
            const exam = await prisma.exam.findUnique({ where: { id: recordWhere.examId } });
            return res.status(400).json({ error: \`Bài thi "\${exam?.name || 'này'}" đã được phân công cho người này với cùng khóa đào tạo và thời gian. Vui lòng kiểm tra lại.\` });
          }
        }

        for (const eId of examIds) {
          await prisma.testAssignment.create({ data: { ...baseData, examId: Number(eId) } });
          count++;
        }
      } else {
        const existing = await prisma.testAssignment.findFirst({ where: whereData });
        if (existing) {
          const tt = await prisma.testType.findUnique({ where: { id: Number(tId) }});
          return res.status(400).json({ error: \`Người này đã được phân công ở trạm "\${tt?.name}" với cùng khóa đào tạo và thời gian. Vui lòng kiểm tra lại.\` });
        }

        await prisma.testAssignment.create({ data: baseData });
        count++;
      }
    }`;

const newPostAssignment = `    if (examIds && Array.isArray(examIds) && examIds.length > 0) {
      for (const eId of examIds) {
        const exam = await prisma.exam.findUnique({ where: { id: Number(eId) } });
        if (!exam) continue;

        if (!tIds.includes(String(exam.testTypeId)) && !tIds.includes(Number(exam.testTypeId))) {
           continue; 
        }
        
        const recordWhere: any = {
          examinerId: Number(examinerId),
          testTypeId: exam.testTypeId,
          examId: exam.id
        };
        if (courseId) recordWhere.courseId = Number(courseId);
        if (assignmentDate) recordWhere.assignmentDate = new Date(assignmentDate);

        const existing = await prisma.testAssignment.findFirst({ where: recordWhere });
        if (existing) {
          return res.status(400).json({ error: \`Bài thi "\${exam.name}" đã được phân công cho người này với cùng khóa đào tạo và thời gian.\` });
        }

        const baseData = { ...recordWhere };
        if (vehicleIds && Array.isArray(vehicleIds) && vehicleIds.length > 0) {
          baseData.vehicles = { connect: vehicleIds.map((vId: any) => ({ id: Number(vId) })) };
        }
        
        await prisma.testAssignment.create({ data: baseData });
        count++;
      }
    } else {
      for (const tId of tIds) {
        if (!tId) continue;
        
        const whereData: any = {
          examinerId: Number(examinerId),
          testTypeId: Number(tId),
        };
        if (courseId) whereData.courseId = Number(courseId);
        if (assignmentDate) whereData.assignmentDate = new Date(assignmentDate);

        const baseData = { ...whereData };
        if (vehicleIds && Array.isArray(vehicleIds) && vehicleIds.length > 0) {
          baseData.vehicles = { connect: vehicleIds.map((vId: any) => ({ id: Number(vId) })) };
        }

        const existing = await prisma.testAssignment.findFirst({ where: whereData });
        if (existing) {
          const tt = await prisma.testType.findUnique({ where: { id: Number(tId) }});
          return res.status(400).json({ error: \`Người này đã được phân công ở trạm "\${tt?.name}" với cùng khóa đào tạo và thời gian.\` });
        }

        await prisma.testAssignment.create({ data: baseData });
        count++;
      }
    }`;

managerContent = managerContent.replace(oldPostAssignment, newPostAssignment);
fs.writeFileSync(managerPath, managerContent, 'utf-8');
console.log('Patched manager.ts POST /assignments');

const uiPath = path.join(__dirname, 'src', 'pages', 'AssignmentManager.tsx');
let uiContent = fs.readFileSync(uiPath, 'utf-8');
uiContent = uiContent.replace(/\r\n/g, '\n');

// 1. Change isMulti for testTypes
uiContent = uiContent.replace(
  `isMulti={roleType === 'STATION_MANAGER' && !editingId}`,
  `isMulti={!editingId}`
);

// 2. Change filteredExams logic
uiContent = uiContent.replace(
  `const filteredExams = exams.filter(e => e.testTypeId === Number(selectedTestTypes[0]));`,
  `const filteredExams = exams.filter(e => selectedTestTypes.includes(String(e.testTypeId)));`
);

fs.writeFileSync(uiPath, uiContent, 'utf-8');
console.log('Patched AssignmentManager.tsx');
