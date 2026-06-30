import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Examiner get assigned students sequentially
router.get('/students', async (req, res) => {
  const examinerId = Number(req.query.examinerId);
  if (!examinerId) return res.status(400).json({ error: 'Missing examinerId' });

  try {
    const assignments = await prisma.testAssignment.findMany({
      where: { examinerId }
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
        progress: true
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
        // We append the `nextExam` info to the student object so the frontend knows WHICH exam to grade.
        const studentData = { ...result.student, currentExam: nextExam, testResultId: result.id };
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
        examinerId: Number(examinerId)
      },
      create: {
        testResultId: result.id,
        examId: Number(examId),
        examinerId: Number(examinerId),
        status: 'COMPLETED'
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
