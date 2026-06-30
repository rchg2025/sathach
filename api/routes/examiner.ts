import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Examiner get assigned students
router.get('/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        testResults: true
      }
    });
    res.json(students);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Examiner get criteria for a test type
router.get('/criteria/:testTypeId', async (req, res) => {
  try {
    const criteria = await prisma.criterion.findMany({
      where: { testTypeId: Number(req.params.testTypeId) }
    });
    res.json(criteria);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Examiner deducts score
router.post('/score', async (req, res) => {
  const { studentId, testTypeId, criterionId } = req.body;
  
  try {
    const criterion = await prisma.criterion.findUnique({ where: { id: Number(criterionId) } });
    if (!criterion) return res.status(404).json({ error: 'Criterion not found' });
    
    const pointsToDeduct = criterion.pointsToDeduct;
    let result = await prisma.testResult.findFirst({
      where: { studentId: Number(studentId), testTypeId: Number(testTypeId) }
    });

    if (!result) {
      result = await prisma.testResult.create({
        data: {
          studentId: Number(studentId),
          testTypeId: Number(testTypeId),
          totalScore: 100
        }
      });
    }

    const newScore = result.totalScore - Number(pointsToDeduct);
    const status = newScore < 80 ? 'FAILED' : 'PENDING';

    const updatedResult = await prisma.testResult.update({
      where: { id: result.id },
      data: { totalScore: newScore, status },
      include: { student: true, testType: true }
    });

    await prisma.score.create({
      data: { testResultId: result.id, criterionId: Number(criterionId) }
    });

    res.json(updatedResult);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

export default router;
