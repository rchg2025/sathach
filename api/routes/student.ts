import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Student lookup by CCCD
router.get('/lookup/:cccd', async (req, res) => {
  const { cccd } = req.params;
  try {
    const student = await prisma.student.findUnique({
      where: { cccd },
      include: {
        course: true,
        testResults: {
          include: {
            testType: true,
            progress: {
              include: {
                exam: true,
                examiner: true
              }
            },
            scores: {
              include: {
                criterion: true
              }
            }
          }
        }
      }
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    const assignments = await prisma.testAssignment.findMany({
      where: { examiner: { role: 'STATION_MANAGER' } },
      include: { testType: true, course: true }
    });

    res.json({
      ...student,
      assignments
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
