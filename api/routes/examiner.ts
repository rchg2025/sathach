import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Examiner get assigned students sequentially
router.get('/students', async (req, res) => {
  const examinerId = Number(req.query.examinerId);
  if (!examinerId) return res.status(400).json({ error: 'Missing examinerId' });

  try {
    const vnTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const vnTime = new Date(vnTimeString);
    const vnYear = vnTime.getFullYear();
    const vnMonth = String(vnTime.getMonth() + 1).padStart(2, '0');
    const vnDate = String(vnTime.getDate()).padStart(2, '0');
    const todayUtcMidnight = new Date(`${vnYear}-${vnMonth}-${vnDate}T00:00:00+07:00`);

    const assignments = await prisma.testAssignment.findMany({
      where: { 
        examinerId,
        OR: [
          { assignmentDate: null },
          { assignmentDate: { gte: todayUtcMidnight } }
        ]
      },
      include: { vehicles: true }
    });
    
    if (assignments.length === 0) return res.json([]);

    const testTypeIds = [...new Set(assignments.map(a => a.testTypeId))];

    // Fetch all exams for these TestTypes, ordered by name to define the sequence
    const allExams = await prisma.exam.findMany({
      where: { testTypeId: { in: testTypeIds } },
      orderBy: { name: 'asc' },
      include: { assignments: true }
    });

    // We only care about exams that have at least one assignment (i.e. someone is grading them)
    const activeExams = allExams.filter(exam => exam.assignments.length > 0);

    // Fetch all students who are "IN_PROGRESS" for these testTypes
    const testResults = await prisma.testResult.findMany({
      where: { 
        testTypeId: { in: testTypeIds },
        status: 'IN_PROGRESS' 
      },
      include: {
        student: { include: { testResults: true, course: true } },
        progress: true,
        vehicle: true
      }
    });

    const studentsForExaminer = [];

    for (const result of testResults) {
      // Find the first active exam the student has NOT completed
      const completedExamIds = result.progress.filter((p: any) => p.status === 'COMPLETED').map((p: any) => p.examId);
      
      const nextExam = activeExams.find(exam => 
        exam.testTypeId === result.testTypeId && !completedExamIds.includes(exam.id)
      );

      // If there is a next exam, check if the current examiner is assigned to it
      if (nextExam && nextExam.assignments.some(a => a.examinerId === examinerId)) {
        const myAssignment = assignments.find(a => 
          a.examinerId === examinerId && 
          (a.examId === nextExam.id || (a.testTypeId === nextExam.testTypeId && !a.examId))
        );

        if (myAssignment && myAssignment.vehicles && myAssignment.vehicles.length > 0) {
          const hasVehicle = myAssignment.vehicles.some((v: any) => v.id === result.vehicleId);
          if (!hasVehicle) continue; // Skip if student's vehicle is not assigned to this examiner
        }

        const currentProgress = result.progress.find((p: any) => p.examId === nextExam.id);
        const studentData = { 
          ...result.student, 
          currentExam: nextExam, 
          testResultId: result.id,
          vehicle: result.vehicle,
          currentProgress,
          assignmentDate: myAssignment?.assignmentDate
        };
        studentsForExaminer.push(studentData);
      }
    }

    res.json(studentsForExaminer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Examiner get criteria for an EXAM (not testType)
router.get('/criteria/:examId', async (req, res) => {
  try {
    const criteria = await prisma.criterion.findMany({
      where: { examId: Number(req.params.examId) }
    });
    res.json(criteria);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

// Start exam grading
router.post('/start-exam', async (req, res) => {
  const { studentId, testTypeId, examId, examinerId } = req.body;
  try {
    let result = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) }
    });
    if (!result) return res.status(404).json({ error: 'TestResult not found' });

    const progress = await prisma.examProgress.upsert({
      where: {
        testResultId_examId: {
          testResultId: result.id,
          examId: Number(examId)
        }
      },
      update: {
        status: 'IN_PROGRESS',
        examinerId: Number(examinerId),
        startTime: new Date()
      },
      create: {
        testResultId: result.id,
        examId: Number(examId),
        examinerId: Number(examinerId),
        status: 'IN_PROGRESS',
        startTime: new Date()
      }
    });
    res.json({ success: true, progress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit exam grading
router.post('/submit-exam', async (req, res) => {
  const { studentId, testTypeId, examId, examinerId, errors } = req.body;
  // errors is an array of { criterionId, errorCount }
  
  try {
    let result = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) }
    });

    if (!result) return res.status(404).json({ error: 'TestResult not found' });

    // Mark exam progress as completed
    await prisma.examProgress.upsert({
      where: {
        testResultId_examId: {
          testResultId: result.id,
          examId: Number(examId)
        }
      },
      update: {
        status: 'COMPLETED',
        examinerId: Number(examinerId),
        endTime: new Date()
      },
      create: {
        testResultId: result.id,
        examId: Number(examId),
        examinerId: Number(examinerId),
        status: 'COMPLETED',
        endTime: new Date()
      }
    });

    // Deduct points
    let totalDeducted = 0;
    for (const err of errors) {
      if (err.errorCount > 0) {
        const criterion = await prisma.criterion.findUnique({ where: { id: err.criterionId } });
        if (criterion) {
          totalDeducted += criterion.pointsToDeduct * err.errorCount;
          // create score records
          await prisma.score.create({
            data: { 
              testResultId: result.id, 
              criterionId: criterion.id,
              timesDeducted: err.errorCount
            }
          });
        }
      }
    }

    const newScore = result.totalScore - totalDeducted;
    const testType = await prisma.testType.findUnique({ where: { id: Number(testTypeId) } });
    
    const status = newScore < (testType?.passingScore || 80) ? 'FAILED' : result.status;

    const updatedResult = await prisma.testResult.update({
      where: { id: result.id },
      data: { totalScore: newScore, status }
    });

    res.json({ success: true, updatedResult });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

export default router;
