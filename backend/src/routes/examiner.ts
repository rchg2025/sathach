import { Router } from 'express';
import prisma from '../prisma';
import { io } from '../server';

const router = Router();

// Lấy danh sách học viên trong môn thi mà giám khảo được phân công
router.get('/assignments/:examinerId', async (req, res) => {
  const { examinerId } = req.params;
  try {
    const assignments = await prisma.testAssignment.findMany({
      where: { examinerId: Number(examinerId) },
      include: {
        testType: {
          include: { criteria: true }
        }
      }
    });
    
    // Lấy danh sách học viên theo từng khóa học được phân công
    const result = await Promise.all(assignments.map(async (assignment) => {
      const students = await prisma.student.findMany({
        where: { courseId: assignment.courseId || undefined },
        include: {
          testResults: {
            where: { testTypeId: assignment.testTypeId }
          }
        }
      });
      return { ...assignment, students };
    }));

    res.json(result);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Chấm điểm
router.post('/score', async (req, res) => {
  const { studentId, testTypeId, criterionId, pointsToDeduct } = req.body;
  try {
    let result = await prisma.testResult.findUnique({
      where: { studentId_testTypeId: { studentId: Number(studentId), testTypeId: Number(testTypeId) } }
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

    // Cập nhật điểm
    const newScore = result.totalScore - Number(pointsToDeduct);
    const status = newScore < 80 ? 'FAILED' : 'PENDING'; // Giả sử dưới 80 là rớt

    const updatedResult = await prisma.testResult.update({
      where: { id: result.id },
      data: { totalScore: newScore, status },
      include: { student: true, testType: true }
    });

    // Lưu chi tiết lỗi
    await prisma.score.create({
      data: { testResultId: result.id, criterionId: Number(criterionId) }
    });

    // Phát sự kiện Real-time
    io.emit('score_updated', updatedResult);

    res.json(updatedResult);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

export default router;
