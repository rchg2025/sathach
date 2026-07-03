const fs = require('fs');
const path = require('path');

const managerApi = path.join(__dirname, 'api', 'routes', 'manager.ts');
let managerApiContent = fs.readFileSync(managerApi, 'utf-8');
managerApiContent = managerApiContent.replace(/\r\n/g, '\n');

// 1. Update students-v2 query to include retake students
const studentWhereOld = `        studentWhere = {
          OR: [
            { courseId: { in: courseIds } },
            { courseName: { in: courseNames } }
          ]
        };`;

const studentWhereNew = `        studentWhere = {
          OR: [
            { courseId: { in: courseIds } },
            { courseName: { in: courseNames } },
            { retakeSessions: { some: { targetCourseId: { in: courseIds } } } }
          ]
        };`;

managerApiContent = managerApiContent.replace(studentWhereOld, studentWhereNew);

// 2. Add API endpoints for RetakeSession
const retakeEndpoints = `
// --- RETAKE SESSION ENDPOINTS ---

router.get('/retakes', async (req, res) => {
  try {
    const sessions = await prisma.retakeSession.findMany({
      include: {
        student: true,
        targetCourse: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching retake sessions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/retakes', async (req, res) => {
  const { studentIds, targetCourseId } = req.body;
  try {
    if (!studentIds || !targetCourseId || !Array.isArray(studentIds)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    
    let createdCount = 0;
    for (const studentId of studentIds) {
      // Create if not exists
      const existing = await prisma.retakeSession.findUnique({
        where: {
          studentId_targetCourseId: {
            studentId: Number(studentId),
            targetCourseId: Number(targetCourseId)
          }
        }
      });
      if (!existing) {
        await prisma.retakeSession.create({
          data: {
            studentId: Number(studentId),
            targetCourseId: Number(targetCourseId)
          }
        });
        createdCount++;
      }
    }
    
    res.json({ success: true, message: \`Đã thêm \${createdCount} học viên vào danh sách thi lại\` });
  } catch (error) {
    console.error('Error creating retake session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/retakes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.retakeSession.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting retake session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/retake-eligibility', async (req, res) => {
  try {
    // Find students who have failed or absent (but no need to overcomplicate for now, we just list all students and let frontend filter, or we can filter here)
    const students = await prisma.student.findMany({
      include: {
        course: true,
        testResults: {
          include: { testType: true }
        }
      },
      orderBy: { id: 'desc' },
      take: 1000
    });
    
    // We filter students who have at least one test result with FAILED or ABSENT, OR students without full completion.
    // Actually, letting frontend filter is better for a comprehensive UI.
    res.json(students);
  } catch (error) {
    console.error('Error fetching students for retake:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

`;

// Insert before `export default router;`
managerApiContent = managerApiContent.replace('export default router;', retakeEndpoints + '\nexport default router;');

fs.writeFileSync(managerApi, managerApiContent, 'utf-8');
console.log('Patched manager.ts with retake endpoints');
