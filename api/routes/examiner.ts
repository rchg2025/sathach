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
      include: { 
        vehicles: {
          where: { isActive: true }
        } 
      }
    });
    
    if (assignments.length === 0) return res.json([]);

    const testTypeIds = [...new Set(assignments.map(a => a.testTypeId))];

    // Fetch all exams for these TestTypes, ordered by name to define the sequence
    const allExams = await prisma.exam.findMany({
      where: { testTypeId: { in: testTypeIds } },
      include: { assignments: true }
    });

    allExams.sort((a, b) => {
      const matchA = a.name.match(/\d+/);
      const matchB = b.name.match(/\d+/);
      const numA = matchA ? parseInt(matchA[0], 10) : 0;
      const numB = matchB ? parseInt(matchB[0], 10) : 0;
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
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
        vehicle: true,
        testType: true
      }
    });

    const studentsForExaminer = [];

    for (const result of testResults) {
      const isDuongTruong = result.testType.name.toLowerCase().includes('đường trường');
      
      const completedExamIds = result.progress.filter((p: any) => p.status === 'COMPLETED').map((p: any) => p.examId);
      
      if (isDuongTruong) {
        const allActiveExams = activeExams.filter(exam => exam.testTypeId === result.testTypeId);
        const uncompletedExams = allActiveExams.filter(exam => !completedExamIds.includes(exam.id));
        
        if (uncompletedExams.length > 0) {
          const myAssignment = assignments.find(a => 
            a.examinerId === examinerId && 
            a.testTypeId === result.testTypeId
          );

          if (myAssignment) {
            if (myAssignment.vehicles && myAssignment.vehicles.length > 0) {
              const hasVehicle = myAssignment.vehicles.some((v: any) => v.id === result.vehicleId);
              if (!hasVehicle) continue;
            }

            const inProgressExamIds = result.progress.filter((p: any) => p.status === 'IN_PROGRESS').map((p: any) => p.examId);
            const anyInProgress = uncompletedExams.some(e => inProgressExamIds.includes(e.id));
            const currentProgress = anyInProgress ? { status: 'IN_PROGRESS', startTime: result.progress.find((p:any) => p.status === 'IN_PROGRESS')?.startTime } : { status: 'PENDING' };
            
            const studentData = { 
              ...result.student, 
              currentExam: { name: result.testType.name, testTypeId: result.testTypeId }, 
              testType: result.testType,
              testResultId: result.id,
              vehicle: result.vehicle,
              currentProgress,
              assignmentDate: myAssignment.assignmentDate,
              showScore: myAssignment.showScore,
              isCombinedExam: true,
              allExams: uncompletedExams
            };
            studentsForExaminer.push(studentData);
          }
        }
      } else {
        // Find ALL active exams for this test type, in sequential order
        const allStudentActiveExams = activeExams.filter(exam => exam.testTypeId === result.testTypeId);
        
        // Find the globally next uncompleted exam for the student
        const firstUncompletedExam = allStudentActiveExams.find(exam => !completedExamIds.includes(exam.id));

        if (firstUncompletedExam) {
          // Only show the student to THIS examiner if the next exam is assigned to them
          const isAssignedToMe = firstUncompletedExam.assignments.some(a => a.examinerId === examinerId);
          
          if (isAssignedToMe) {
            const myAssignment = assignments.find(a => 
              a.examinerId === examinerId && 
              (a.examId === firstUncompletedExam.id || (a.testTypeId === firstUncompletedExam.testTypeId && !a.examId))
            );

            if (myAssignment) {
              if (myAssignment.vehicles && myAssignment.vehicles.length > 0) {
                const hasVehicle = myAssignment.vehicles.some((v: any) => v.id === result.vehicleId);
                if (!hasVehicle) continue;
              }

              // Check if any of my assigned exams are currently IN_PROGRESS
              const inProgressExam = allStudentActiveExams.find(e => 
                result.progress.some((p: any) => p.examId === e.id && p.status === 'IN_PROGRESS') &&
                e.assignments.some(a => a.examinerId === examinerId)
              );
              
              const activeExamToUse = inProgressExam || firstUncompletedExam;
              const currentProgress = result.progress.find((p: any) => p.examId === activeExamToUse.id);

              const studentData = { 
                ...result.student, 
                currentExam: activeExamToUse, 
                testType: result.testType,
                allAvailableExams: allStudentActiveExams.filter(e => e.assignments.some(a => a.examinerId === examinerId) && !completedExamIds.includes(e.id)),
                testResultId: result.id,
                vehicle: result.vehicle,
                currentProgress: currentProgress || { status: 'PENDING' },
                assignmentDate: myAssignment.assignmentDate,
                showScore: myAssignment.showScore
              };
              studentsForExaminer.push(studentData);
            }
          }
        }
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

// Examiner get criteria for all exams of a TEST TYPE
router.get('/criteria/test-type/:testTypeId', async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      where: { testTypeId: Number(req.params.testTypeId) },
      orderBy: { name: 'asc' },
      include: { criteria: true }
    });
    res.json(exams);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

// Start exam grading
router.post('/start-exam', async (req, res) => {
  const { studentId, testTypeId, examId, examIds, examinerId } = req.body;
  try {
    let result = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) }
    });
    if (!result) return res.status(404).json({ error: 'TestResult not found' });

    const targetExamIds = examIds ? examIds : (examId ? [examId] : []);

    const progressPromises = targetExamIds.map((eId: number) => 
      prisma.examProgress.upsert({
        where: {
          testResultId_examId: {
            testResultId: result.id,
            examId: Number(eId)
          }
        },
        update: {
          status: 'IN_PROGRESS',
          examinerId: Number(examinerId),
          startTime: new Date()
        },
        create: {
          testResultId: result.id,
          examId: Number(eId),
          examinerId: Number(examinerId),
          status: 'IN_PROGRESS',
          startTime: new Date()
        }
      })
    );

    const progress = await Promise.all(progressPromises);
    res.json({ success: true, progress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit exam grading
router.post('/submit-exam', async (req, res) => {
  const { studentId, testTypeId, examId, examIds, examinerId, errors } = req.body;
  // errors is an array of { criterionId, errorCount }
  
  try {
    let result = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) }
    });

    if (!result) return res.status(404).json({ error: 'TestResult not found' });

    const targetExamIds = examIds ? examIds : (examId ? [examId] : []);

    // Mark exam progress as completed
    const progressPromises = targetExamIds.map((eId: number) => 
      prisma.examProgress.upsert({
        where: {
          testResultId_examId: {
            testResultId: result.id,
            examId: Number(eId)
          }
        },
        update: {
          status: 'COMPLETED',
          examinerId: Number(examinerId),
          endTime: new Date()
        },
        create: {
          testResultId: result.id,
          examId: Number(eId),
          examinerId: Number(examinerId),
          status: 'COMPLETED',
          endTime: new Date()
        }
      })
    );
    await Promise.all(progressPromises);

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
    
    const status = newScore < (testType?.passingScore || 80) ? 'FAILED' : 'PASSED';

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
